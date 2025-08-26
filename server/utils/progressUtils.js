// utils/progressUtils.js
const pool = require('../db');

/**
 * Recalculate statuses within a single goal.
 * Rules:
 * - Among all NOT-done microtasks in the goal, the earliest (by subgoal.position, task.position, mt.position, id)
 *   becomes 'in_progress'. All other NOT-done microtasks become 'todo'.
 * - A task is:
 *     'done'        if it has no NOT-done microtasks
 *     'in_progress' if it has any 'in_progress' microtask
 *     'todo'        otherwise
 * - A subgoal mirrors its tasks; a goal mirrors its subgoals.
 */
async function normalizeProgressByGoal(goalId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Find the active (first) NOT-done microtask in this goal -------------------------------
    const { rows: activeRows } = await client.query(
      `
      WITH tgt_subgoals AS (
        SELECT sg.id, sg.position
        FROM subgoals sg
        WHERE sg.goal_id = $1
      ),
      tgt_tasks AS (
        SELECT t.id, t.subgoal_id, t.position
        FROM tasks t
        WHERE t.subgoal_id IN (SELECT id FROM tgt_subgoals)
      ),
      not_done_micro AS (
        SELECT mt.id, mt.task_id, mt.position,
               t.subgoal_id,
               (SELECT position FROM tgt_subgoals WHERE id = t.subgoal_id)   AS sg_pos,
               t.position                                                    AS t_pos
        FROM microtasks mt
        JOIN tgt_tasks t ON t.id = mt.task_id
        WHERE mt.status <> 'done'
      )
      SELECT id AS micro_id,
             task_id,
             subgoal_id
      FROM not_done_micro
      ORDER BY sg_pos NULLS LAST, t_pos NULLS LAST, position NULLS LAST, id
      LIMIT 1;
      `,
      [goalId]
    );

    const activeMicroId  = activeRows[0]?.micro_id ?? null;
    const activeTaskId   = activeRows[0]?.task_id  ?? null;

    // --- Microtasks: set ONLY the rows that must change ---------------------------------------
    // 1) Everything NOT-done in this goal EXCEPT active gets 'todo'
    await client.query(
      `
      WITH tgt_tasks AS (
        SELECT t.id
        FROM tasks t
        WHERE t.subgoal_id IN (SELECT id FROM subgoals WHERE goal_id = $1)
      )
      UPDATE microtasks mt
      SET status = 'todo'::status_enum
      WHERE mt.task_id IN (SELECT id FROM tgt_tasks)
        AND mt.status <> 'done'
        AND mt.id <> COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        AND mt.status <> 'todo';
      `,
      [goalId, activeMicroId]
    );

    // 2) Active microtask → 'in_progress'
    if (activeMicroId) {
      await client.query(
        `UPDATE microtasks SET status = 'in_progress'::status_enum WHERE id = $1 AND status <> 'in_progress';`,
        [activeMicroId]
      );
    }

    // --- Tasks: compute new status and only update when changed -------------------------------
    await client.query(
      `
      WITH tgt_tasks AS (
        SELECT t.id
        FROM tasks t
        WHERE t.subgoal_id IN (SELECT id FROM subgoals WHERE goal_id = $1)
      ),
      new_status AS (
        SELECT
          t.id,
          CASE
            WHEN NOT EXISTS (SELECT 1 FROM microtasks m WHERE m.task_id = t.id AND m.status <> 'done')
              THEN 'done'
            WHEN EXISTS      (SELECT 1 FROM microtasks m WHERE m.task_id = t.id AND m.status = 'in_progress')
              THEN 'in_progress'
            ELSE 'todo'
          END::status_enum AS status_new
        FROM tgt_tasks t
      )
      UPDATE tasks t
      SET status = n.status_new
      FROM new_status n
      WHERE t.id = n.id
        AND t.status <> n.status_new;
      `,
      [goalId]
    );

    // Ensure the task that owns the active micro (if any) is explicitly 'in_progress'
    if (activeTaskId) {
      await client.query(
        `UPDATE tasks SET status = 'in_progress'::status_enum WHERE id = $1 AND status <> 'in_progress';`,
        [activeTaskId]
      );
    }

    // --- Subgoals ---------------------------------------------------------------------------
    await client.query(
      `
      WITH tgt_subgoals AS (
        SELECT sg.id
        FROM subgoals sg
        WHERE sg.goal_id = $1
      ),
      new_status AS (
        SELECT
          sg.id,
          CASE
            WHEN NOT EXISTS (SELECT 1 FROM tasks t WHERE t.subgoal_id = sg.id AND t.status <> 'done')
              THEN 'done'
            WHEN EXISTS      (SELECT 1 FROM tasks t WHERE t.subgoal_id = sg.id AND t.status = 'in_progress')
              THEN 'in_progress'
            ELSE 'todo'
          END::status_enum AS status_new
        FROM tgt_subgoals sg
      )
      UPDATE subgoals sg
      SET status = n.status_new
      FROM new_status n
      WHERE sg.id = n.id
        AND sg.status <> n.status_new;
      `,
      [goalId]
    );

    // Make the subgoal containing the active task explicitly 'in_progress'
    if (activeRows[0]?.subgoal_id) {
      await client.query(
        `UPDATE subgoals SET status = 'in_progress'::status_enum WHERE id = $1 AND status <> 'in_progress';`,
        [activeRows[0].subgoal_id]
      );
    }

    // --- Goal ------------------------------------------------------------------------------
    await client.query(
      `
      WITH new_status AS (
        SELECT
          g.id,
          CASE
            WHEN EXISTS (SELECT 1 FROM subgoals sg WHERE sg.goal_id = g.id AND sg.status <> 'done')
              THEN 'in_progress'
            ELSE 'done'
          END::status_enum AS status_new
        FROM goals g
        WHERE g.id = $1
      )
      UPDATE goals g
      SET status = n.status_new
      FROM new_status n
      WHERE g.id = n.id
        AND g.status <> n.status_new;
      `,
      [goalId]
    );

    await client.query('COMMIT');
    return {
      goalId,
      activeSubgoalId: activeRows[0]?.subgoal_id ?? null,
      activeTaskId,
      activeMicroId,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Convenience: after changing a single microtask, bubble up to the goal.
 */
async function cascadeAfterMicrotaskDone(microtaskId) {
  const { rows } = await pool.query(
    `
    SELECT sg.goal_id
    FROM microtasks mt
    JOIN tasks t   ON t.id = mt.task_id
    JOIN subgoals sg ON sg.id = t.subgoal_id
    WHERE mt.id = $1
    LIMIT 1;
    `,
    [microtaskId]
  );
  const goalId = rows[0]?.goal_id || null;
  if (!goalId) return null;
  return normalizeProgressByGoal(goalId);
}

module.exports = { normalizeProgressByGoal, cascadeAfterMicrotaskDone };