//goalsController.js
const pool = require('../db');
const { limitsFor } = require('../utils/plan');

// Create a goal
exports.createGoal = async (req, res) => {
  const client = await pool.connect();

  // Log when the route is hit
  console.log("🛬 POST /api/goals hit");

  try {
    const { user_id, title, description, due_date, subgoals, tone } = req.body;

    // Log the incoming payload
    console.log('📦 Received goal payload:', req.body);

    if (!user_id || !title) {
      console.warn("⚠️ Missing user_id or title", { user_id, title });
      return res.status(400).json({ error: "user_id and title are required" });
    }

    const validTones = ['friendly', 'strict', 'motivational'];
    if (tone && !validTones.includes(tone)) {
      console.warn("⚠️ Invalid tone:", tone);
      return res.status(400).json({ error: 'Invalid tone value' });
    }

    await client.query('BEGIN');

    const goalRes = await client.query(
      `INSERT INTO goals (user_id, title, description, due_date, tone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user_id, title, description || null, due_date || null, tone || null]
    );

    const goalId = goalRes.rows[0].id;
    console.log('✅ Goal inserted with ID:', goalId);

    if (subgoals && Array.isArray(subgoals)) {
      for (const sub of subgoals) {
        console.log(`➡️ Inserting subgoal:`, sub.title);

        const subRes = await client.query(
          'INSERT INTO subgoals (goal_id, title) VALUES ($1, $2) RETURNING id',
          [goalId, sub.title]
        );

        const subgoalId = subRes.rows[0].id;

        for (const task of sub.tasks || []) {
          console.log(`  ↪ Inserting task:`, task.title);

          const taskRes = await client.query(
            'INSERT INTO tasks (subgoal_id, title) VALUES ($1, $2) RETURNING id',
            [subgoalId, task.title]
          );

          const taskId = taskRes.rows[0].id;

          for (const micro of task.microtasks || []) {
            console.log(`    • Inserting microtask:`, micro);

            await client.query(
              'INSERT INTO microtasks (task_id, title) VALUES ($1, $2)',
              [taskId, micro]
            );
          }
        }
      }

      console.log("📥 Final subgoal breakdown saved.");
    } else {
      console.log("ℹ️ No subgoals provided in payload.");
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Goal saved successfully', goal_id: goalId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating goal:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

// Update goal status only
exports.updateGoalStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    const validStatuses = ['not_started', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const result = await pool.query(
      'UPDATE goals SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating goal status:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all goals (for testing or admin)
exports.getAllGoals = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching all goals:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};