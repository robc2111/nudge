// runs hourly: permanently delete any due accounts
const pool = require('../db');

async function runDeletionSweeper() {
  const { rows } = await pool.query(
    `SELECT user_id FROM privacy_deletes
     WHERE status='pending' AND eta <= NOW()`
  );
  for (const r of rows) {
    const uid = r.user_id;
    // hard delete user data (respect FKs ON DELETE CASCADE where possible)
    await pool.query('BEGIN');
    try {
      await pool.query(`DELETE FROM reflections WHERE user_id=$1`, [uid]);
      await pool.query(`DELETE FROM check_ins WHERE user_id=$1`, [uid]);
      await pool.query(
        `
        DELETE FROM microtasks WHERE task_id IN (
          SELECT t.id FROM tasks t
          JOIN subgoals sg ON t.subgoal_id=sg.id
          JOIN goals g ON sg.goal_id=g.id
          WHERE g.user_id=$1
        )`,
        [uid]
      );
      await pool.query(
        `
        DELETE FROM tasks WHERE subgoal_id IN (
          SELECT sg.id FROM subgoals sg
          JOIN goals g ON sg.goal_id=g.id
          WHERE g.user_id=$1
        )`,
        [uid]
      );
      await pool.query(
        `
        DELETE FROM subgoals WHERE goal_id IN (
          SELECT id FROM goals WHERE user_id=$1
        )`,
        [uid]
      );
      await pool.query(`DELETE FROM goals WHERE user_id=$1`, [uid]);
      await pool.query(`DELETE FROM users WHERE id=$1`, [uid]);
      await pool.query(
        `UPDATE privacy_deletes SET status='done' WHERE user_id=$1`,
        [uid]
      );
      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('[delete-sweeper] failed uid=', uid, e);
    }
  }
}

module.exports = { runDeletionSweeper };
