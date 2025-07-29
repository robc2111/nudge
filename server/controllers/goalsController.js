//goasController.js
const pool = require('../db');

// Create a goal
exports.createGoal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, title, description, due_date, subgoals } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: "user_id and title are required" });
    }

    await client.query('BEGIN');

    const goalRes = await client.query(
      `INSERT INTO goals (user_id, title, description, due_date)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user_id, title, description || null, due_date || null]
    );
    const goalId = goalRes.rows[0].id;

    // If breakdown exists, insert it too
    if (subgoals && Array.isArray(subgoals)) {
      for (const sub of subgoals) {
        const subRes = await client.query(
          'INSERT INTO subgoals (goal_id, title) VALUES ($1, $2) RETURNING id',
          [goalId, sub.title]
        );
        const subgoalId = subRes.rows[0].id;

        for (const task of sub.tasks || []) {
          const taskRes = await client.query(
            'INSERT INTO tasks (subgoal_id, title) VALUES ($1, $2) RETURNING id',
            [subgoalId, task.title]
          );
          const taskId = taskRes.rows[0].id;

          for (const micro of task.microtasks || []) {
            await client.query(
              'INSERT INTO microtasks (task_id, title) VALUES ($1, $2)',
              [taskId, micro]
            );
          }
        }
      }
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