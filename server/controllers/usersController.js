// server/controllers/usersController.js
const { DateTime } = require('luxon');
const pool = require('../db');
const { assignStatuses } = require('../utils/statusUtils');

// ------------------------- helpers -------------------------

/** Count only active, non-deleted goals for a user */
async function countActiveGoals(userId) {
  // Be resilient across environments: count all user goals.
  // Reintroduce a specific status filter once the schema/values are confirmed.
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM public.goals
      WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

/** Normalize some time zone aliases to valid IANA zones */
const TZ_ALIASES = {
  montenegro: 'Europe/Podgorica',
  podgorica: 'Europe/Podgorica',
  belgrade: 'Europe/Belgrade',
  cet: 'Europe/Belgrade',
};
function normalizeTz(input) {
  if (!input) return null;
  const raw = String(input).trim();
  if (DateTime.local().setZone(raw).isValid) return raw;
  const alias = TZ_ALIASES[raw.toLowerCase()];
  if (alias && DateTime.local().setZone(alias).isValid) return alias;
  return null;
}

// ------------------------- CRUD (public/admin) -------------------------

/** GET /api/users  (kept simple; filters out soft-deleted users) */
const getUsers = async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, telegram_id, timezone,
             plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
        FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC NULLS LAST, id
      `
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** POST /api/users  (basic helper; keeps your original semantics) */
const createUser = async (req, res) => {
  if (!req.body || !req.body.telegram_id) {
    return res
      .status(400)
      .json({ error: 'Missing telegram_id in request body' });
  }
  const { telegram_id, name } = req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO users (telegram_id, name, plan, telegram_enabled)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, telegram_id, timezone,
                plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
      `,
      [telegram_id, name, 'free', true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/users/:id  (self-only; blocks soft-deleted) */
const getUserById = async (req, res) => {
  const requestedId = req.params.id;
  const authenticatedUserId = req.user.id;
  if (requestedId !== authenticatedUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, telegram_id, timezone,
             plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
        FROM users
       WHERE id = $1
       LIMIT 1
      `,
      [requestedId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.deleted_at)
      return res.status(403).json({ error: 'Account deleted' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/users/me */
const getCurrentUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, email, name, telegram_id, timezone,
             plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
        FROM users
       WHERE id = $1
       LIMIT 1
      `,
      [req.user.id]
    );
    const me = rows[0];
    if (!me) return res.status(404).json({ error: 'User not found' });
    if (me.deleted_at)
      return res.status(403).json({ error: 'Account deleted' });

    const activeGoalCount = await countActiveGoals(req.user.id);

    res.json({
      ...me,
      activeGoalCount,
    });
  } catch (err) {
    console.error('Error loading user:', err); // full object, includes code & detail
    res.status(500).json({ error: err.message || 'Failed to load user' });
  }
};

// ------------------------- PATCH / PUT -------------------------

/** PATCH /api/users/me  (update partial profile fields) */
const patchMe = async (req, res) => {
  const userId = req.user.id;
  const {
    name,
    email,
    telegram_id,
    timezone,
    plan,
    plan_status,
    telegram_enabled,
  } = req.body || {};

  const sets = [];
  const vals = [];
  let i = 1;

  if (name !== undefined) {
    sets.push(`name = $${i++}`);
    vals.push(name);
  }
  if (email !== undefined) {
    sets.push(`email = $${i++}`);
    vals.push(String(email).toLowerCase());
  }
  if (telegram_id !== undefined) {
    sets.push(`telegram_id = $${i++}`);
    vals.push(telegram_id);
  }

  if (timezone !== undefined) {
    const tz = normalizeTz(timezone);
    if (!tz)
      return res.status(400).json({ error: 'Please choose a valid timezone.' });
    sets.push(`timezone = $${i++}`);
    vals.push(tz);
  }

  if (plan !== undefined) {
    sets.push(`plan = $${i++}`);
    vals.push(plan);
  }
  if (plan_status !== undefined) {
    sets.push(`plan_status = $${i++}`);
    vals.push(plan_status);
  }

  if (typeof telegram_enabled === 'boolean') {
    sets.push(`telegram_enabled = $${i++}`);
    vals.push(telegram_enabled);
  }

  if (!sets.length) return getCurrentUser(req, res);

  // Guard: do not patch deleted accounts
  sets.push(`updated_at = NOW()`);
  vals.push(userId);
  const sql = `
    UPDATE users
       SET ${sets.join(', ')}
     WHERE id = $${i}
       AND deleted_at IS NULL
  RETURNING id, email, name, telegram_id, timezone,
            plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
  `;

  try {
    const { rows } = await pool.query(sql, vals);
    const user = rows[0];
    if (!user)
      return res.status(404).json({ error: 'User not found or deleted' });

    const activeGoalCount = await countActiveGoals(userId);

    res.json({
      ...user,
      activeGoalCount,
    });
  } catch (err) {
    console.error('❌ Failed to patch user:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/** PUT /api/users/:id  (self-only, simple name update; kept for compatibility) */
const updateUser = async (req, res) => {
  const authenticatedUserId = req.user.id;
  const targetUserId = req.params.id;
  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { name } = req.body || {};
  try {
    const result = await pool.query(
      `
      UPDATE users
         SET name = $1, updated_at = NOW()
       WHERE id = $2
         AND deleted_at IS NULL
   RETURNING id, name, email, telegram_id, timezone,
             plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
      `,
      [name, targetUserId]
    );
    const user = result.rows[0];
    if (!user)
      return res.status(404).json({ error: 'User not found or deleted' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------------- DELETE -------------------------

/**
 * DELETE /api/users/:id (HARD delete, self-only)
 * Kept for backwards compatibility, but consider disabling in production
 * if you want soft delete everywhere. It will error if FKs lack cascade.
 */
const deleteUser = async (req, res) => {
  const authenticatedUserId = req.user.id;
  const targetUserId = req.params.id;
  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [targetUserId]
    );
    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ error: 'User not found or already deleted' });
    res.json({ message: 'User hard-deleted', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/users/me  (SOFT delete)
 * Requires: { confirm: "DELETE", acknowledge: true }
 */
const deleteMe = async (req, res) => {
  const userId = req.user.id;
  const { confirm, acknowledge } = req.body || {};

  if ((confirm || '').toUpperCase() !== 'DELETE' || acknowledge !== true) {
    return res
      .status(403)
      .json({ error: 'Please type DELETE and tick the box to confirm.' });
  }

  try {
    const { rowCount } = await pool.query(
      `
      UPDATE users
         SET deleted_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL
      `,
      [userId]
    );

    if (!rowCount)
      return res
        .status(404)
        .json({ error: 'User not found or already deleted' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ deleteMe error:', err.message);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
};

// ------------------------- Dashboard -------------------------

/** GET /api/users/:userId/dashboard  (self-only; ignores deleted user) */
const getUserDashboard = async (req, res) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.id;

  if (!requestedUserId || typeof requestedUserId !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Confirm user exists and is not soft-deleted
    const userResult = await pool.query(
      `SELECT id, name, deleted_at FROM users WHERE id = $1 LIMIT 1`,
      [authenticatedUserId]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.deleted_at)
      return res.status(403).json({ error: 'Account deleted' });

    // Load goals (ignore any future soft-deleted goals if you add that column)
    const goalResult = await pool.query(
      `
      SELECT *
        FROM goals
       WHERE user_id = $1
       ORDER BY created_at DESC NULLS LAST
      `,
      [authenticatedUserId]
    );
    const goals = goalResult.rows;

    const allGoals = [];

    for (const goal of goals) {
      const subgoalsResult = await pool.query(
        `SELECT * FROM subgoals WHERE goal_id = $1 ORDER BY position ASC, id ASC`,
        [goal.id]
      );
      const subgoals = [];

      for (const sg of subgoalsResult.rows) {
        const tasksResult = await pool.query(
          `SELECT * FROM tasks WHERE subgoal_id = $1 ORDER BY position ASC, id ASC`,
          [sg.id]
        );
        const tasks = [];

        for (const task of tasksResult.rows) {
          const microtasksResult = await pool.query(
            `SELECT * FROM microtasks WHERE task_id = $1 ORDER BY position ASC, id ASC`,
            [task.id]
          );
          const microtasks = microtasksResult.rows.map((mt) => ({
            id: mt.id,
            title: mt.title,
            status: mt.status,
            task_id: mt.task_id,
          }));
          tasks.push({ ...task, microtasks });
        }

        subgoals.push({ ...sg, tasks });
      }

      // Compute simple progress rollup
      let total = 0;
      let done = 0;
      let current = { subgoalId: null, taskId: null, microtaskId: null };

      for (const sg of subgoals) {
        for (const task of sg.tasks) {
          for (const mt of task.microtasks) {
            total += 1;
            if (mt.status === 'done') done += 1;
          }
          const next = task.microtasks.find((mt) => mt.status !== 'done');
          if (!current.microtaskId && next) {
            current = {
              subgoalId: sg.id,
              taskId: task.id,
              microtaskId: next.id,
            };
          }
        }
      }

      const percentage_complete =
        total === 0 ? 0 : parseFloat(((done / total) * 100).toFixed(1));

      allGoals.push({
        ...goal,
        subgoals,
        percentage_complete,
        current,
      });
    }

    const statusProcessedGoals = allGoals.map(assignStatuses);
    return res.json({
      user: { id: user.id, name: user.name },
      goals: statusProcessedGoals,
    });
  } catch (err) {
    console.error('❌ Error generating dashboard:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------- Optional: alias -------------------------

/** Legacy /me alias if referenced elsewhere */
exports.me = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, email, name, telegram_id,
             plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
        FROM users
       WHERE id = $1
       LIMIT 1
      `,
      [req.user.id]
    );
    const me = rows[0];
    if (!me) return res.status(404).json({ error: 'User not found' });
    if (me.deleted_at)
      return res.status(403).json({ error: 'Account deleted' });

    const activeGoalCount = await countActiveGoals(req.user.id);

    res.json({
      ...me,
      activeGoalCount,
    });
  } catch (err) {
    console.error('Failed to load user:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
};

// ------------------------- exports -------------------------

module.exports = {
  // list
  getUsers,
  // create
  createUser,
  // read
  getUserById,
  getCurrentUser,
  getUserDashboard,
  // update
  patchMe,
  updateUser,
  // delete
  deleteUser, // hard delete (consider restricting)
  deleteMe, // soft delete (recommended path)
};
