//checkInsController.js
const pool = require('../db');

// Get all check-ins
exports.getCheckIns = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM check_ins ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single check-in by ID
exports.getCheckInById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM check_ins WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Check-in not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a check-in
exports.createCheckIn = async (req, res) => {
  const { user_id, goal_id, completed_tasks, notes } = req.body;

  if (!user_id || !goal_id) {
    return res.status(400).json({ error: "user_id and goal_id are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO check_ins (user_id, goal_id, completed_tasks, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, goal_id, completed_tasks || 0, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a check-in
exports.updateCheckIn = async (req, res) => {
  const { id } = req.params;
  const { completed_tasks, notes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE check_ins SET completed_tasks = $1, notes = $2 WHERE id = $3 RETURNING *`,
      [completed_tasks, notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Check-in not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a check-in
exports.deleteCheckIn = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM check_ins WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Check-in not found" });
    res.json({ message: "Check-in deleted", check_in: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};