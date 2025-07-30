//usersController.js
// usersController.js
const { assignStatuses } = require('../utils/statusUtils');
const pool = require('../db');

// GET all users
const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create a new user
const createUser = async (req, res) => {
  if (!req.body || !req.body.telegram_id) {
    return res.status(400).json({ error: 'Missing telegram_id in request body' });
  }

  const { telegram_id, name } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO users (telegram_id, name) VALUES ($1, $2) RETURNING *',
      [telegram_id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET user by ID
const getUserById = async (req, res) => {
  const requestedId = req.params.id;
  const authenticatedUserId = req.user.id;

  if (requestedId !== authenticatedUserId) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [requestedId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCurrentUser = async (req, res) => {
  const authenticatedUserId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT id, name, email, telegram_id FROM users WHERE id = $1',
      [authenticatedUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error loading user:', err.message);
    res.status(500).json({ error: 'Failed to load user' });
  }
};

// PUT update user
const updateUser = async (req, res) => {
  const authenticatedUserId = req.user.id;
  const targetUserId = req.params.id;

  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
      [name, targetUserId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE user
const deleteUser = async (req, res) => {
  const authenticatedUserId = req.user.id;
  const targetUserId = req.params.id;

  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [targetUserId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:userId/dashboard
const getUserDashboard = async (req, res) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.id;

  if (!requestedUserId || typeof requestedUserId !== 'string') {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [authenticatedUserId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = userResult.rows[0];
    const goalResult = await pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC', [authenticatedUserId]);
    const goals = goalResult.rows;

    const allGoals = [];

    for (const goal of goals) {
      const subgoalsResult = await pool.query('SELECT * FROM subgoals WHERE goal_id = $1 ORDER BY order_index', [goal.id]);
      const subgoals = [];

      for (const sg of subgoalsResult.rows) {
        const tasksResult = await pool.query('SELECT * FROM tasks WHERE subgoal_id = $1 ORDER BY id', [sg.id]);
        const tasks = [];

        for (const task of tasksResult.rows) {
          const microtasksResult = await pool.query('SELECT * FROM microtasks WHERE task_id = $1 ORDER BY id', [task.id]);
          tasks.push({ ...task, microtasks: microtasksResult.rows });
        }

        subgoals.push({ ...sg, tasks });
      }

      let total = 0;
      let done = 0;
      let current = { subgoalId: null, taskId: null, microtaskId: null };

      for (const sg of subgoals) {
        for (const task of sg.tasks) {
          for (const mt of task.microtasks) {
            total += 1;
            if (mt.status === 'done') done += 1;
          }

          const next = task.microtasks.find(mt => mt.status !== 'done');
          if (!current.microtaskId && next) {
            current = {
              subgoalId: sg.id,
              taskId: task.id,
              microtaskId: next.id
            };
          }
        }
      }

      const percentage_complete = total === 0 ? 0 : ((done / total) * 100).toFixed(1);

      allGoals.push({
        ...goal,
        subgoals,
        percentage_complete: parseFloat(percentage_complete),
        current
      });
    }

    const statusProcessedGoals = allGoals.map(assignStatuses);
    return res.json({ user, goals: statusProcessedGoals });

  } catch (err) {
    console.error("❌ Error generating dashboard:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserDashboard,
  getCurrentUser
};