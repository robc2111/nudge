const pool = require('../db');

// Create a goal
exports.createGoal = async (req, res) => {
  const { user_id, title, description, due_date } = req.body;

  if (!user_id || !title) {
    return res.status(400).json({ error: "user_id and title are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO goals (user_id, title, description, due_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, title, description || null, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating goal:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single goal
exports.getGoalById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching goal:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all goals for a user
exports.getGoalsByUser = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

  try {
    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching user goals:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a goal
exports.updateGoal = async (req, res) => {
  const { title, description, due_date } = req.body;

  if (!title && !description && !due_date) {
    return res.status(400).json({ error: "No update fields provided" });
  }

  try {
    const result = await pool.query(
      `UPDATE goals
       SET title = $1, description = $2, due_date = $3
       WHERE id = $4 RETURNING *`,
      [title, description, due_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating goal:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a goal
exports.deleteGoal = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json({ message: "Goal deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting goal:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};