// routes/gptRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { breakdownMicrotask } = require('../utils/gptUtils');

router.post('/breakdown', async (req, res) => {
  const { microtaskId, title, taskId } = req.body;

  try {
    // Call GPT to break it down
    const microtasks = await breakdownMicrotask(title);

    // Delete the original microtask
    await pool.query('DELETE FROM microtasks WHERE id = $1', [microtaskId]);

    // Insert the new microtasks
    for (const newTitle of microtasks) {
      await pool.query(
        'INSERT INTO microtasks (title, task_id, status) VALUES ($1, $2, $3)',
        [ newTitle, taskId, 'not_started' ]
      );
    }

    res.json({ message: 'Breakdown complete', microtasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to break down microtask' });
  }
});

module.exports = router;