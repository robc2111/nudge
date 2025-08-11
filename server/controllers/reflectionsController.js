// reflectionsController.js
const pool = require('../db');

// Get all reflections
exports.getReflections = async (req, res) => {
  const { user_id, goal_id, start_date, end_date, sort = 'desc' } = req.query;
  if (!user_id) return res.status(400).json({ error: "Missing required parameter: user_id" });

  try {
    let query = `
      SELECT r.*,
             COALESCE(g.title, 'N/A') AS goal_name
      FROM reflections r
      LEFT JOIN goals g ON r.goal_id = g.id
      WHERE r.user_id = $1
    `;
    const params = [user_id];
    let i = 2;

    if (goal_id) { // if provided, filter; otherwise include NULLs too
      query += ` AND r.goal_id = $${i++}`;
      params.push(goal_id);
    }
    if (start_date?.trim()) {
      query += ` AND r.created_at >= $${i++}`;
      params.push(start_date);
    }
    if (end_date?.trim()) {
      query += ` AND r.created_at <= $${i++}`;
      params.push(end_date);
    }

    query += ` ORDER BY r.created_at ${String(sort).toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching reflections:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get a single reflection
exports.getReflectionById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, COALESCE(g.title, 'N/A') AS goal_name
       FROM reflections r
       LEFT JOIN goals g ON r.goal_id = g.id
       WHERE r.id = $1`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Reflection not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a reflection
exports.createReflection = async (req, res) => {
  const { user_id, goal_id, content } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id is required" });
  if (!content || !content.trim()) return res.status(400).json({ error: "content is required" });

  if (content.length > 1000) {
    return res.status(400).json({ error: "Reflection is too long (max 1000 characters)" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reflections (user_id, goal_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, goal_id || null, content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating reflection:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Update a reflection
exports.updateReflection = async (req, res) => {
  const { id } = req.params;
  const { content, goal_id } = req.body;

  if (content && content.length > 1000) {
    return res.status(400).json({ error: "Reflection is too long (max 1000 characters)" });
  }

  try {
    const result = await pool.query(
      `UPDATE reflections
       SET content = COALESCE($1, content),
           goal_id = $2
       WHERE id = $3
       RETURNING *`,
      [content !== undefined ? content : null, goal_id || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Reflection not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating reflection:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Delete a reflection
exports.deleteReflection = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM reflections WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Reflection not found" });
    res.json({ message: "Reflection deleted", reflection: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};