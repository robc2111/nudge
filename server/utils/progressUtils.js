// utils/progressUtils.js
const pool = require('../db');

async function normalizeProgressByGoal(goalId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // utils/progressUtils.js
const { rows: sub } = await client.query(`
  with ordered as (
    select sg.id
    from subgoals sg
    where sg.goal_id = $1
    order by sg.position, sg.id
  )
  select o.id
  from ordered o
  where exists (
    select 1
    from tasks t
    join microtasks mt on mt.task_id = t.id
    where t.subgoal_id = o.id and mt.status <> 'done'
  )
  limit 1
`, [goalId]);
    const activeSubgoalId = sub[0]?.id || null;

    let activeTaskId = null;
    if (activeSubgoalId) {
      const { rows: t } = await client.query(`
        select t.id
        from tasks t
        where t.subgoal_id = $1
          and exists (
            select 1 from microtasks mt
            where mt.task_id = t.id and mt.status <> 'done'
          )
        order by t.position asc, t.id asc
        limit 1
      `, [activeSubgoalId]);
      activeTaskId = t[0]?.id || null;
    }

    let activeMicroId = null;
    if (activeTaskId) {
      const { rows: mt } = await client.query(`
        select mt.id
        from microtasks mt
        where mt.task_id = $1 and mt.status <> 'done'
        order by mt.position asc, mt.id asc
        limit 1
      `, [activeTaskId]);
      activeMicroId = mt[0]?.id || null;
    }

    await client.query(`
      update microtasks mt
      set status = 'todo'::status_enum
      where mt.status <> 'done'
        and mt.task_id in (
          select t.id from tasks t
          join subgoals sg on sg.id = t.subgoal_id
          where sg.goal_id = $1
        )
    `, [goalId]);
    if (activeMicroId) {
      await client.query(`update microtasks set status = 'in_progress'::status_enum where id = $1`, [activeMicroId]);
    }

    await client.query(`
      update tasks t
      set status = case
        when not exists (select 1 from microtasks mt where mt.task_id = t.id and mt.status <> 'done')
     then 'done'::status_enum
   else 'todo'::status_enum
      end
      where t.subgoal_id in (select id from subgoals where goal_id = $1)
    `, [goalId]);
    if (activeTaskId) {
      await client.query(`update tasks set status = 'in_progress'::status_enum where id = $1`, [activeTaskId]);
    }

    await client.query(`
      update subgoals sg
      set status = case
        when not exists (select 1 from tasks t where t.subgoal_id = sg.id and t.status <> 'done')
     then 'done'::status_enum
   else 'todo'::status_enum
      end
      where sg.goal_id = $1
    `, [goalId]);
    if (activeSubgoalId) {
      await client.query(`update subgoals set status = 'in_progress'::status_enum where id = $1`, [activeSubgoalId]);
    }

    await client.query(`
      update goals g
      set status = case
        when exists (select 1 from subgoals sg where sg.goal_id = g.id and sg.status <> 'done')
     then 'in_progress'::status_enum
   else 'done'::status_enum
      end
      where g.id = $1
    `, [goalId]);

    await client.query('COMMIT');
    return { goalId, activeSubgoalId, activeTaskId, activeMicroId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function cascadeAfterMicrotaskDone(microtaskId) {
  const { rows } = await pool.query(`
    select sg.goal_id
    from microtasks mt
    join tasks t on t.id = mt.task_id
    join subgoals sg on sg.id = t.subgoal_id
    where mt.id = $1
    limit 1
  `, [microtaskId]);
  const goalId = rows[0]?.goal_id;
  if (!goalId) return null;
  return normalizeProgressByGoal(goalId);
}

module.exports = { normalizeProgressByGoal, cascadeAfterMicrotaskDone };