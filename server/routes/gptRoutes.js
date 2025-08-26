const express = require('express');
const router = express.Router();
const pool = require('../db');
const { breakdownMicrotask } = require('../utils/gptUtils');

router.post('/breakdown', async (req, res) => {
  const { microtaskId, title, taskId } = req.body || {};
  if (!microtaskId || !title || !taskId) {
    return res.status(400).json({ error: 'microtaskId, title and taskId are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch original microtask + context
    const { rows } = await client.query(
      `SELECT mt.id, mt.task_id, mt.status, mt.position, t.user_id
       FROM microtasks mt
       JOIN tasks t ON t.id = mt.task_id
       WHERE mt.id = $1 LIMIT 1`,
      [microtaskId]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Microtask not found' });
    }

    const ctx = rows[0];
    const wasInProgress = ctx.status === 'in_progress';
    const parentPos = Number(ctx.position);

    // 2. Breakdown via GPT
    const steps = await breakdownMicrotask(title);
    const microTitles = (Array.isArray(steps) ? steps : []).map(s => String(s).trim()).filter(Boolean);
    if (!microTitles.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No breakdown steps returned' });
    }

    // 3. Delete the original
    await client.query('DELETE FROM microtasks WHERE id = $1', [microtaskId]);

    // 4. Insert breakdown children using fractional positions
    // Example: parentPos = 4 → children get 4.1, 4.2, 4.3 ...
    const inserted = [];
    for (let i = 0; i < microTitles.length; i++) {
      const status = wasInProgress && i === 0 ? 'in_progress' : 'todo';
      const newPos = parentPos + (i + 1) / 10; // fractional placement
      const { rows: ins } = await client.query(
        `INSERT INTO microtasks (user_id, task_id, title, status, position)
         VALUES ($1, $2, $3, $4::status_enum, $5)
         RETURNING id, task_id, title, status, position`,
        [ctx.user_id, taskId, microTitles[i], status, newPos]
      );
      inserted.push(ins[0]);
    }

    await client.query('COMMIT');
    return res.json({ message: 'Breakdown complete', microtasks: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Breakdown error:', err);
    res.status(500).json({ error: 'Failed to break down microtask' });
  } finally {
    client.release();
  }
});

module.exports = router;