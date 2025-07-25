//microtasksController.js
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