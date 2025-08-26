// controllers/reflectionsController.js
const pool = require('../db');

// Get all reflections (plus completed goals as "achievement" entries)
exports.getReflections = async (req, res) => {
  const { user_id, goal_id, start_date, end_date, sort = 'desc' } = req.query;
  if (!user_id) return res.status(400).json({ error: "Missing required parameter: user_id" });

  try {
    // ── Build dynamic bits for both sides of the UNION ──────────────────────────
    const orderDir = String(sort).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const params = [user_id];
    let idx = 2;

    // WHERE for reflections table
    let reflWhere = `r.user_id = $1`;
    if (goal_id) { reflWhere += ` AND r.goal_id = $${idx++}`; params.push(goal_id); }
    if (start_date?.trim()) { reflWhere += ` AND r.created_at >= $${idx++}`; params.push(start_date); }
    if (end_date?.trim()) { reflWhere += ` AND r.created_at <= $${idx++}`; params.push(end_date); }

    // WHERE for goals table (completed goals only)
    let goalsWhere = `g.user_id = $1 AND g.status = 'done'`;
    if (goal_id) { goalsWhere += ` AND g.id = $${idx++}`; params.push(goal_id); }
    if (start_date?.trim()) { goalsWhere += ` AND g.created_at >= $${idx++}`; params.push(start_date); }
    if (end_date?.trim()) { goalsWhere += ` AND g.created_at <= $${idx++}`; params.push(end_date); }

    // ── Final SQL: union normal reflections with completed goal "achievements" ─
    const sql = `
  SELECT * FROM (
    -- A) Normal user reflections
    SELECT
      r.id::text AS id,   -- cast to text so it matches the UNION
      r.user_id,
      r.goal_id,
      r.content,
      r.created_at,
      COALESCE(g.title, 'N/A') AS goal_name,
      'reflection' AS type
    FROM reflections r
    LEFT JOIN goals g ON r.goal_id = g.id
    WHERE ${reflWhere}

    UNION ALL

    -- B) Completed goals
    SELECT
      ('goal_' || g.id)::text AS id,
      g.user_id,
      g.id AS goal_id,
      ('🎉 Completed goal: ' || g.title) AS content,
      g.created_at AS created_at,
      g.title AS goal_name,
      'completed_goal' AS type
    FROM goals g
    WHERE ${goalsWhere}
  ) t
  ORDER BY t.created_at ${orderDir}, t.id ASC
`;

    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching reflections:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Get a single reflection
exports.getReflectionById = async (req, res) => {
  const { id } = req.params;

  try {
    // If id is prefixed with 'goal_', it's a completed goal pseudo-entry
    if (String(id).startsWith('goal_')) {
      const realGoalId = id.replace(/^goal_/, '');
      const { rows } = await pool.query(
        `SELECT
           ('goal_' || g.id)::text AS id,
           g.user_id,
           g.id AS goal_id,
           ('🎉 Completed goal: ' || g.title) AS content,
           g.created_at AS created_at,
           g.title AS goal_name,
           'completed_goal' AS type
         FROM goals g
         WHERE g.id = $1
         LIMIT 1`,
        [realGoalId]
      );
      if (!rows[0]) return res.status(404).json({ error: "Reflection not found" });
      return res.json(rows[0]);
    }

    // Otherwise it’s a real reflection row
    const result = await pool.query(
      `SELECT r.*, COALESCE(g.title, 'N/A') AS goal_name, 'reflection' AS type
       FROM reflections r
       LEFT JOIN goals g ON r.goal_id = g.id
       WHERE r.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Reflection not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Create a reflection
exports.createReflection = async (req, res) => {
  const { user_id, goal_id, content } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id is required" });
  if (!content || !content.trim()) return res.status(400).json({ error: "content is required" });
  if (content.length > 1000) return res.status(400).json({ error: "Reflection is too long (max 1000 characters)" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO reflections (user_id, goal_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, goal_id || null, content.trim()]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating reflection:", err.message);
    return res.status(500).json({ error: err.message });
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
    const { rows } = await pool.query(
      `UPDATE reflections
       SET content = COALESCE($1, content),
           goal_id = $2
       WHERE id = $3
       RETURNING *`,
      [content !== undefined ? content : null, goal_id || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Reflection not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error updating reflection:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Delete a reflection
exports.deleteReflection = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM reflections WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Reflection not found" });
    return res.json({ message: "Reflection deleted", reflection: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};