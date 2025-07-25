const pool = require('../db');

// Get all tasks
exports.getTasks = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
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
  const { subgoal_id, title, status = 'todo' } = req.body;

  if (!subgoal_id || !title) {
    return res.status(400).json({ error: "subgoal_id and title are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (subgoal_id, title, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subgoal_id, title, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, status = $2
       WHERE id = $3
       RETURNING *`,
      [title, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
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