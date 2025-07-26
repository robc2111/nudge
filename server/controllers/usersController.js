//usersController.js
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

  const { telegram_id, name, tone_id } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO users (telegram_id, name, tone_id) VALUES ($1, $2, $3) RETURNING *',
      [telegram_id, name, tone_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET user by ID
// GET user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, tone_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, tone_id = $2 WHERE id = $3 RETURNING *',
      [name, tone_id, id]
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
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
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
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

  try {
    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = userResult.rows[0];

    const goalResult = await pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
    const goal = goalResult.rows[0];
    if (!goal) return res.status(200).json({ user, goal: null });

    const subgoalsResult = await pool.query('SELECT * FROM subgoals WHERE goal_id = $1 ORDER BY order_index', [goal.id]);
    const subgoals = [];

    let totalMicrotasks = 0;
    let completedMicrotasks = 0;
    let current = { subgoalId: null, taskId: null, microtaskId: null };

    for (const sg of subgoalsResult.rows) {
      const tasksResult = await pool.query('SELECT * FROM tasks WHERE subgoal_id = $1 ORDER BY id', [sg.id]);
      const tasks = [];

      for (const task of tasksResult.rows) {
        const microtasksResult = await pool.query('SELECT * FROM microtasks WHERE task_id = $1 ORDER BY id', [task.id]);
        const microtasks = microtasksResult.rows;

        totalMicrotasks += microtasks.length;
        completedMicrotasks += microtasks.filter(mt => mt.status === 'done').length;

        const next = microtasks.find(mt => mt.status !== 'done');
        if (!current.microtaskId && next) {
          current = {
            subgoalId: sg.id,
            taskId: task.id,
            microtaskId: next.id
          };
        }

        tasks.push({ ...task, microtasks });
      }

      subgoals.push({ ...sg, tasks });
    }

    const percentage_complete = totalMicrotasks === 0 ? 0 : ((completedMicrotasks / totalMicrotasks) * 100).toFixed(1);

    res.json({
      user,
      goal: {
        ...goal,
        percentage_complete: parseFloat(percentage_complete),
      },
      subgoals,
      current
    });

  } catch (err) {
    console.error("❌ Error generating dashboard:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserDashboard
};