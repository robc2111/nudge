// server/utils/goalHelpers.js
const pool = require('../db');

/**
 * Return an array of { goal, task, microtasks, nextIdx }
 * For each goal that has unfinished microtasks, pick the first actionable task.
 * You can filter to in_progress goals by passing { onlyInProgress: true }.
 */
async function fetchNextAcrossGoals(userId, { onlyInProgress = true } = {}) {
  const { rows: goals } = await pool.query(
    `
    SELECT g.id, g.title
    FROM goals g
    WHERE g.user_id = $1
      ${onlyInProgress ? `AND g.status = 'in_progress'` : ''}
      AND EXISTS (
        SELECT 1
        FROM subgoals sg
        JOIN tasks t      ON t.subgoal_id = sg.id
        JOIN microtasks mt ON mt.task_id = t.id
        WHERE sg.goal_id = g.id
          AND mt.status <> 'done'
      )
    ORDER BY g.created_at, g.id
    `,
    [userId]
  );

  const result = [];

  for (const g of goals) {
    const { rows: ts } = await pool.query(
      `
      SELECT t.id, t.title
      FROM tasks t
      JOIN subgoals sg ON sg.id = t.subgoal_id
      WHERE sg.goal_id = $1
        AND EXISTS (SELECT 1 FROM microtasks mt WHERE mt.task_id = t.id AND mt.status <> 'done')
      ORDER BY t.position NULLS LAST, t.id
      LIMIT 1
      `,
      [g.id]
    );
    if (!ts[0]) continue;

    const { rows: mts } = await pool.query(
      `
      SELECT id, title, status
      FROM microtasks
      WHERE task_id = $1
      ORDER BY position NULLS LAST, id
      `,
      [ts[0].id]
    );

    let nextIdx = mts.findIndex(m => m.status !== 'done');
    if (nextIdx === -1) nextIdx = null;

    result.push({ goal: g, task: ts[0], microtasks: mts, nextIdx });
  }

  return result;
}

function renderChecklist(microtasks, nextIdx) {
  return microtasks
    .map((m, i) => `${m.status === 'done' ? '✅' : (i === nextIdx ? '🔸' : '⭕')} ${m.title}`)
    .join('\n');
}

module.exports = { fetchNextAcrossGoals, renderChecklist };