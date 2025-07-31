//reflectionsController.js
const pool = require('../db');

// Get all reflections
exports.getReflections = async (req, res) => {
  const { user_id, goal_id, start_date, end_date, sort = 'desc' } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: "Missing required parameter: user_id" });
  }

  try {
    let query = `
  SELECT r.*, g.title AS goal_name
  FROM reflections r
  LEFT JOIN goals g ON r.goal_id = g.id
  WHERE r.user_id = $1
`;
    const params = [user_id];
    let paramIndex = 2;
console.log("🔍 Final query:", query);
console.log("📦 Params:", params);
    if (goal_id) {
      query += ` AND r.goal_id = $${paramIndex}`;
      params.push(goal_id);
      paramIndex++;
    }

    if (start_date && start_date.trim() !== '') {
  query += ` AND r.created_at >= $${paramIndex}`;
  params.push(start_date);
  paramIndex++;
}

if (end_date && end_date.trim() !== '') {
  query += ` AND r.created_at <= $${paramIndex}`;
  params.push(end_date);
  paramIndex++;
}

    query += ` ORDER BY r.created_at ${sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`;

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
    const result = await pool.query('SELECT * FROM reflections WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Reflection not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a reflection
exports.createReflection = async (req, res) => {
  const { user_id, goal_id, highlights, blockers, week_number } = req.body;

  if (!user_id || !goal_id || !week_number) {
    return res.status(400).json({ error: "user_id, goal_id, and week_number are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reflections (user_id, goal_id, highlights, blockers, week_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, goal_id, highlights || null, blockers || null, week_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a reflection
exports.updateReflection = async (req, res) => {
  const { id } = req.params;
  const { highlights, blockers, week_number } = req.body;

  try {
    const result = await pool.query(
      `UPDATE reflections
       SET highlights = $1, blockers = $2, week_number = $3
       WHERE id = $4
       RETURNING *`,
      [highlights, blockers, week_number, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Reflection not found" });
    res.json(result.rows[0]);
  } catch (err) {
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