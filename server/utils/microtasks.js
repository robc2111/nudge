// server/utils/microtasks.js
const pool = require('../db');

/** Completed microtasks in the last N days for a user */
async function getCompletedMicrotasksLastNDays(userId, days = 7) {
  const { rows } = await pool.query(
    `
    SELECT
      mt.title AS micro_title,
      t.title  AS task_title,
      g.title  AS goal_title,
      mt.completed_at AS done_at
    FROM microtasks mt
    JOIN tasks t     ON mt.task_id   = t.id
    JOIN subgoals sg ON t.subgoal_id = sg.id
    JOIN goals g     ON sg.goal_id   = g.id
    WHERE g.user_id = $1
      AND mt.status = 'done'
      AND mt.completed_at IS NOT NULL
      AND mt.completed_at >= NOW() - ($2 || ' days')::interval
    ORDER BY mt.completed_at DESC
    LIMIT 50
    `,
    [userId, days]
  );
  return rows;
}

module.exports = { getCompletedMicrotasksLastNDays };