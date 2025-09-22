// server/utils/goalHelpers.js
const pool = require('../db');

/**
 * Returns the first *task* per goal that has unfinished microtasks,
 * determined by the earliest unfinished microtask’s global_pos.
 */
async function fetchNextAcrossGoals(userId, { onlyInProgress = true } = {}) {
  // 1) Candidate goals (same as before)
  const { rows: goals } = await pool.query(
    `
    SELECT g.id, g.title
    FROM goals g
    WHERE g.user_id = $1
      ${onlyInProgress ? `AND g.status = 'in_progress'` : ''}
      AND EXISTS (
        SELECT 1 FROM v_microtasks_global v
        WHERE v.goal_id = g.id
          AND COALESCE(v.status, 'todo') <> 'done'
      )
    ORDER BY g.created_at, g.id
    `,
    [userId]
  );

  const result = [];

  for (const g of goals) {
    // 2) Find the task that owns the *earliest* unfinished microtask globally
    const { rows: first } = await pool.query(
      `
      SELECT v.task_id, t.title
      FROM v_microtasks_global v
      JOIN tasks t ON t.id = v.task_id
      WHERE v.goal_id = $1
        AND COALESCE(v.status, 'todo') <> 'done'
      ORDER BY v.global_pos ASC, v.id
      LIMIT 1
      `,
      [g.id]
    );
    if (!first[0]) continue;

    // 3) List that task’s microtasks in natural order
    const { rows: mts } = await pool.query(
      `
      SELECT id, title, status
      FROM microtasks
      WHERE task_id = $1
      ORDER BY position ASC NULLS LAST, id
      `,
      [first[0].task_id]
    );

    let nextIdx = mts.findIndex((m) => m.status !== 'done');
    if (nextIdx === -1) nextIdx = null;

    result.push({
      goal: g,
      task: { id: first[0].task_id, title: first[0].title },
      microtasks: mts,
      nextIdx,
    });
  }

  return result;
}

function renderChecklist(microtasks, nextIdx) {
  return microtasks
    .map(
      (m, i) =>
        `${m.status === 'done' ? '✅' : i === nextIdx ? '🔸' : '⭕'} ${m.title}`
    )
    .join('\n');
}

module.exports = { fetchNextAcrossGoals, renderChecklist };
