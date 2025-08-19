// controllers/microtasksController.js
const pool = require('../db');

// Get all microtasks
exports.getMicrotasks = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM microtasks ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get one microtask by ID
exports.getMicrotaskById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM microtasks WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Microtask not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a microtask
exports.createMicrotask = async (req, res) => {
  const { task_id, title, status = 'todo' } = req.body;

  if (!task_id || !title) {
    return res.status(400).json({ error: "task_id and title are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO microtasks (task_id, title, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [task_id, title, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a microtask
exports.updateMicrotask = async (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE microtasks SET title = $1, status = $2 WHERE id = $3 RETURNING *`,
      [title, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Microtask not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/microtasks/:id/status
exports.updateMicrotaskStatus = async (req, res) => {
  const microtaskId = req.params.id;
  const { status } = req.body;

  if (!['todo', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Update selected microtask
    const updateRes = await client.query(
      'UPDATE microtasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, microtaskId]
    );
    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Microtask not found' });
    }
    const updated = updateRes.rows[0];

    // 2) Normalize within this task: first non-done → in_progress, others → todo
    const allRes = await client.query(
      'SELECT id, status FROM microtasks WHERE task_id = $1 ORDER BY id ASC',
      [updated.task_id]
    );
    let inProgressSet = false;
    for (const mt of allRes.rows) {
      if (mt.status === 'done') continue;
      const newStatus = !inProgressSet ? 'in_progress' : 'todo';
      await client.query('UPDATE microtasks SET status = $1 WHERE id = $2', [newStatus, mt.id]);
      if (!inProgressSet) inProgressSet = true;
    }

    // 3) Cascade up → task
    const taskId = updated.task_id;
    const microStatuses = (await client.query(
      'SELECT status FROM microtasks WHERE task_id = $1',
      [taskId]
    )).rows.map(r => r.status);

    const taskStatus =
      microStatuses.every(s => s === 'done') ? 'done' :
      microStatuses.some(s => s === 'in_progress') ? 'in_progress' : 'todo';

    await client.query('UPDATE tasks SET status = $1 WHERE id = $2', [taskStatus, taskId]);

    // 4) Cascade up → subgoal
    const subgoalId = (await client.query(
      'SELECT sg.id FROM subgoals sg JOIN tasks t ON sg.id = t.subgoal_id WHERE t.id = $1',
      [taskId]
    )).rows[0].id;

    const subStatuses = (await client.query(
      'SELECT status FROM tasks WHERE subgoal_id = $1',
      [subgoalId]
    )).rows.map(r => r.status);

    const subStatus =
      subStatuses.every(s => s === 'done') ? 'done' :
      subStatuses.some(s => s === 'in_progress') ? 'in_progress' : 'not_started';

    await client.query('UPDATE subgoals SET status = $1 WHERE id = $2', [subStatus, subgoalId]);

    // 5) Cascade up → goal
    const goalId = (await client.query(
      'SELECT g.id FROM goals g JOIN subgoals sg ON g.id = sg.goal_id WHERE sg.id = $1',
      [subgoalId]
    )).rows[0].id;

    const goalStatuses = (await client.query(
      'SELECT status FROM subgoals WHERE goal_id = $1',
      [goalId]
    )).rows.map(r => r.status);

    const goalStatus =
      goalStatuses.every(s => s === 'done') ? 'done' :
      goalStatuses.some(s => s === 'in_progress') ? 'in_progress' : 'not_started';

    await client.query('UPDATE goals SET status = $1 WHERE id = $2', [goalStatus, goalId]);

    // microtasksController.js (tail of updateMicrotaskStatus)
// ✅ Commit changes
await client.query('COMMIT');

const finalRes = await client.query(
  'SELECT * FROM microtasks WHERE task_id = $1 ORDER BY id ASC',
  [taskId]
);

// (nice to have) which microtask is in_progress now?
const nextRes = await client.query(
  `SELECT id FROM microtasks
   WHERE task_id = $1 AND status = 'in_progress'
   ORDER BY id LIMIT 1`,
  [taskId]
);
const activeMicroId = nextRes.rows[0]?.id || null;

// 👇 single response, then return
return res.json({
  ok: true,
  message: 'Status updated and cascaded',
  microtasks: finalRes.rows,
  impact: {
    task:    { id: taskId,    status: taskStatus },
    subgoal: { id: subgoalId, status: subStatus },
    goal:    { id: goalId,    status: goalStatus },
    activeMicroId
  }
});


  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating microtask:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Delete a microtask
exports.deleteMicrotask = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM microtasks WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Microtask not found" });
    res.json({ message: "Microtask deleted", microtask: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};