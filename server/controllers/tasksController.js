// controllers/tasksController.js
const pool = require('../db');

// Get all tasks
exports.getTasks = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY position ASC, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a task
exports.createTask = async (req, res) => {
  try {
    const { subgoal_id, title, status = 'todo' } = req.body;
    if (!subgoal_id || !title) {
      return res.status(400).json({ error: 'subgoal_id and title are required' });
    }

    const { rows: [row] } = await pool.query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM tasks WHERE subgoal_id = $1',
      [subgoal_id]
    );
    const nextPos = Number(row.max_pos) + 1;

    const { rows: [task] } = await pool.query(
      `INSERT INTO tasks (subgoal_id, title, status, position)
       VALUES ($1,$2,$3::status_enum,$4)
       RETURNING *`,
      [subgoal_id, title, status, nextPos]
    );

    res.status(201).json(task);
  } catch (err) {
    console.error('createTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, status, position } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title   = COALESCE($1, title),
           status  = COALESCE($2, status)::status_enum,
           position= COALESCE($3, position)
       WHERE id = $4
       RETURNING *`,
      [title ?? null, status ?? null, position ?? null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateTask error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted", task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};