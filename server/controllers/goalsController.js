// controllers/goalsController.js
const pool = require('../db');
const { limitsFor } = require('../utils/plan');
const { normalizeProgressByGoal } = require('../utils/progressUtils');

// Create a goal
exports.createGoal = async (req, res) => {
  const client = await pool.connect();
  console.log("🛬 POST /api/goals hit");

  try {
    const authUserId = req.user?.sub || req.body.user_id;
    const { title, description, due_date, subgoals = [], tone = null } = req.body || {};

    if (!authUserId || !title) {
      return res.status(400).json({ error: "user_id and title are required" });
    }

    await client.query('BEGIN');

    const { rows: [goal] } = await client.query(
      `INSERT INTO goals (user_id, title, description, due_date, tone)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [authUserId, title, description || null, due_date || null, tone]
    );
    const goalId = goal.id;

    // Subgoals
    for (const [sgIdx, sub] of subgoals.entries()) {
      const { rows: [sg] } = await client.query(
        `INSERT INTO subgoals (user_id, goal_id, title, position)
         VALUES ($1,$2,$3,$4)
         RETURNING id`,
        [authUserId, goalId, sub.title, sgIdx + 1] // 1-based
      );
      const subgoalId = sg.id;

      // Tasks
      for (const [tIdx, task] of (sub.tasks || []).entries()) {
        const { rows: [t] } = await client.query(
          `INSERT INTO tasks (user_id, subgoal_id, title, position)
           VALUES ($1,$2,$3,$4)
           RETURNING id`,
          [authUserId, subgoalId, task.title, tIdx + 1]
        );
        const taskId = t.id;

        // Microtasks
        for (const [mIdx, micro] of (task.microtasks || []).entries()) {
          await client.query(
            `INSERT INTO microtasks (user_id, task_id, title, position)
             VALUES ($1,$2,$3,$4)`,
            [authUserId, taskId, micro, mIdx + 1]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Normalize statuses so first-by-position are in_progress
    await normalizeProgressByGoal(goalId);

    return res.status(201).json({ message: 'Goal saved successfully', goal_id: goalId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating goal:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
  const userId = req.params.userId; // keep as string; DB has uuid
  try {
    const { rows } = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching user goals:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// If you use JWT, much nicer:
exports.getMyGoals = async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching my goals:", err);
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
      'UPDATE goals SET status = $1::status_enum WHERE id = $2 RETURNING *',
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
exports.getAllGoals = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching all goals:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};