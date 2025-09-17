// server/controllers/goalsController.js
const pool = require('../db');
const { limitsFor } = require('../utils/plan');
const { normalizeProgressByGoal } = require('../utils/progressUtils');
const { materializeGoal } = require('../utils/materializeGoal');

async function getUserPlan(userId) {
  const { rows } = await pool.query(
    `SELECT plan FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return (rows[0]?.plan || 'free').toLowerCase();
}

async function countActiveGoals(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM goals
      WHERE user_id = $1
        AND status <> 'done'`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

// Create goal + materialize hierarchy (AI breakdown or user-provided subgoals)
exports.createGoal = async (req, res) => {
  const client = await pool.connect();
  console.log('🛬 POST /api/goals hit');

  try {
    const authUserId = req.user?.id || req.user?.sub || req.body.user_id;
    const {
      title,
      description = null,
      due_date = null,
      tone = null,

      // Either can be provided by the client:
      breakdown = [], // [{ title, tasks:[{ title, microtasks:[string] }] }]
      subgoals = [], // same shape as above (legacy)
    } = req.body || {};

    if (!authUserId || !title?.trim()) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    // Enforce plan limits
    const plan = await getUserPlan(authUserId);
    const activeCount = await countActiveGoals(authUserId);
    const { activeGoals: limit } = limitsFor(plan);
    if (activeCount >= limit) {
      return res.status(403).json({
        error: 'Free plan allows 1 active goal. Please upgrade to add more.',
        code: 'GOAL_LIMIT_REACHED',
        plan,
        limit,
      });
    }

    await client.query('BEGIN');

    // Create the goal row
    const {
      rows: [goal],
    } = await client.query(
      `INSERT INTO goals (user_id, title, description, due_date, tone, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'in_progress', NOW())
       RETURNING id`,
      [authUserId, title.trim(), description, due_date, tone]
    );
    const goalId = goal.id;

    // Insert children (either from breakdown, subgoals, or scaffold)
    await materializeGoal(client, {
      userId: authUserId,
      goalId,
      breakdown,
      subgoals,
    });

    await client.query('COMMIT');

    // Put first-by-position items into in_progress etc.
    await normalizeProgressByGoal(goalId);

    return res
      .status(201)
      .json({ message: 'Goal saved successfully', goal_id: goalId });
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
    const result = await pool.query('SELECT * FROM goals WHERE id = $1', [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching goal:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Public/dev
exports.getGoalsByUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching user goals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Authenticated: mine
exports.getMyGoals = async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching my goals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a goal (metadata only)
exports.updateGoal = async (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title && !description && !due_date) {
    return res.status(400).json({ error: 'No update fields provided' });
  }
  try {
    const result = await pool.query(
      `UPDATE goals
         SET title = $1,
             description = $2,
             due_date = $3
       WHERE id = $4
     RETURNING *`,
      [title, description, due_date, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating goal:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a goal
exports.deleteGoal = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Goal deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('❌ Error deleting goal:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update goal status only
exports.updateGoalStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    const validStatuses = ['not_started', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const result = await pool.query(
      'UPDATE goals SET status = $1::status_enum WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating goal status:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// All goals (public/dev)
exports.getAllGoals = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goals ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching all goals:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
