// controllers/microtasksController.js
const pool = require('../db');

// GET /api/microtasks
exports.getMicrotasks = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM microtasks ORDER BY position ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('getMicrotasks error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/microtasks/:id
exports.getMicrotaskById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM microtasks WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Microtask not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getMicrotaskById error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/microtasks
// body: { task_id, title, status? = 'todo' }
exports.createMicrotask = async (req, res) => {
  try {
    const { task_id, title, status = 'todo' } = req.body;
    if (!task_id || !title) {
      return res.status(400).json({ error: 'task_id and title are required' });
    }

    // append to end by position
    const { rows: [row] } = await pool.query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM microtasks WHERE task_id = $1',
      [task_id]
    );
    const nextPos = Number(row.max_pos) + 1;

    const { rows: [mt] } = await pool.query(
      `INSERT INTO microtasks (task_id, title, status, position)
       VALUES ($1, $2, $3::status_enum, $4)
       RETURNING *`,
      [task_id, title, status, nextPos]
    );

    res.status(201).json(mt);
  } catch (err) {
    console.error('createMicrotask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/microtasks/:id
// body: { title?, status?, position? }
exports.updateMicrotask = async (req, res) => {
  const { id } = req.params;
  const { title, status, position } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE microtasks
         SET title    = COALESCE($1, title),
             status   = COALESCE($2, status)::status_enum,
             position = COALESCE($3, position)
       WHERE id = $4
       RETURNING *`,
      [title ?? null, status ?? null, position ?? null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Microtask not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('updateMicrotask error:', err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/microtasks/:id/status
// body: { status: 'todo'|'in_progress'|'done' }
exports.updateMicrotaskStatus = async (req, res) => {
  const microtaskId = req.params.id;
  const { status } = req.body;

  if (!['todo', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Set the selected microtask's status
    const updateRes = await client.query(
      'UPDATE microtasks SET status = $1::status_enum WHERE id = $2 RETURNING *',
      [status, microtaskId]
    );
    if (!updateRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Microtask not found' });
    }
    const updated = updateRes.rows[0];

    // 2) Normalize within the task by position:
    //    first non-done -> in_progress, the rest -> todo
    const allRes = await client.query(
      'SELECT id, status FROM microtasks WHERE task_id = $1 ORDER BY position ASC, id ASC',
      [updated.task_id]
    );

    let inProgressSet = false;
    for (const mt of allRes.rows) {
      if (mt.status === 'done') continue;
      const newStatus = !inProgressSet ? 'in_progress' : 'todo';
      await client.query(
        'UPDATE microtasks SET status = $1::status_enum WHERE id = $2',
        [newStatus, mt.id]
      );
      if (!inProgressSet) inProgressSet = true;
    }

    // 3) Cascade to task
    const taskId = updated.task_id;
    const microStatuses = (await client.query(
      'SELECT status FROM microtasks WHERE task_id = $1',
      [taskId]
    )).rows.map(r => r.status);

    const taskStatus =
      microStatuses.every(s => s === 'done') ? 'done' :
      microStatuses.some(s => s === 'in_progress') ? 'in_progress' : 'todo';

    await client.query(
      'UPDATE tasks SET status = $1::status_enum WHERE id = $2',
      [taskStatus, taskId]
    );

    // 4) Cascade to subgoal
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

    await client.query(
      'UPDATE subgoals SET status = $1::status_enum WHERE id = $2',
      [subStatus, subgoalId]
    );

    // 5) Cascade to goal
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

    await client.query(
      'UPDATE goals SET status = $1::status_enum WHERE id = $2',
      [goalStatus, goalId]
    );

    await client.query('COMMIT');

    // Return ordered list + current active microtask
    const finalRes = await client.query(
      'SELECT * FROM microtasks WHERE task_id = $1 ORDER BY position ASC, id ASC',
      [taskId]
    );

    const nextRes = await client.query(
      `SELECT id FROM microtasks
       WHERE task_id = $1 AND status = 'in_progress'
       ORDER BY position ASC, id ASC
       LIMIT 1`,
      [taskId]
    );
    const activeMicroId = nextRes.rows[0]?.id || null;

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
    console.error('updateMicrotaskStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// DELETE /api/microtasks/:id
exports.deleteMicrotask = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM microtasks WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Microtask not found' });
    res.json({ message: 'Microtask deleted', microtask: result.rows[0] });
  } catch (err) {
    console.error('deleteMicrotask error:', err);
    res.status(500).json({ error: err.message });
  }
};