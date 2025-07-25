//subgoalsController.js
const pool = require('../db');

// Get all subgoals
exports.getSubgoals = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subgoals ORDER BY order_index ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single subgoal
exports.getSubgoalById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM subgoals WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Subgoal not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new subgoal
exports.createSubgoal = async (req, res) => {
  const { goal_id, title, order_index } = req.body;

  if (!goal_id || !title) {
    return res.status(400).json({ error: "goal_id and title are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO subgoals (goal_id, title, order_index)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [goal_id, title, order_index || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a subgoal
exports.updateSubgoal = async (req, res) => {
  const { id } = req.params;
  const { title, order_index } = req.body;

  try {
    const result = await pool.query(
      `UPDATE subgoals
       SET title = $1, order_index = $2
       WHERE id = $3
       RETURNING *`,
      [title, order_index, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Subgoal not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a subgoal
exports.deleteSubgoal = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM subgoals WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Subgoal not found" });
    res.json({ message: "Subgoal deleted", subgoal: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};