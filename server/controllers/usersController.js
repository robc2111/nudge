const { DateTime } = require('luxon');
const pool = require('../db');
const {
  sendFarewellIfPossible,
  forgetTelegramForUser,
} = require('../utils/telegramAccount');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const { assignStatuses } = require('../utils/statusUtils');

const DASHBOARD_STMT_TIMEOUT_MS = Number(
  process.env.DASHBOARD_STMT_TIMEOUT_MS || 8000
);

// ------------------------- helpers -------------------------

async function countActiveGoals(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM public.goals
      WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

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
    console.error('❌ getUsers error:', err.message);
    res.status(500).json({ error: 'USERS_LIST_FAILED' });
  }
};

const createUser = async (req, res) => {
  if (!req.body || !req.body.telegram_id) {
    return res.status(400).json({ error: 'TELEGRAM_ID_REQUIRED' });
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
    console.error('❌ createUser error:', err.message);
    res.status(500).json({ error: 'USER_CREATE_FAILED' });
  }
};

const getUserById = async (req, res) => {
  const requestedId = req.params.id;
  const authenticatedUserId = req.user.id;
  if (requestedId !== authenticatedUserId) {
    return res.status(403).json({ error: 'ACCESS_DENIED' });
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
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (user.deleted_at)
      return res.status(403).json({ error: 'ACCOUNT_DELETED' });

    res.json(user);
  } catch (err) {
    console.error('❌ getUserById error:', err.message);
    res.status(500).json({ error: 'PROFILE_LOAD_FAILED' });
  }
};

// in usersController.js
const getCurrentUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, telegram_id, timezone,
              plan, plan_status, stripe_customer_id, telegram_enabled, deleted_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );
    const me = rows[0];
    if (!me) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (me.deleted_at)
      return res.status(403).json({ error: 'ACCOUNT_DELETED' });

    res.json(me);
  } catch (err) {
    console.error('❌ Profile load error:', err.message);
    return res.status(500).json({ error: 'PROFILE_LOAD_FAILED' });
  }
};

// ------------------------- PATCH / PUT -------------------------

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
    if (!tz) return res.status(400).json({ error: 'INVALID_TIMEZONE' });
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
      return res.status(404).json({ error: 'USER_NOT_FOUND_OR_DELETED' });

    const activeGoalCount = await countActiveGoals(userId);
    res.json({ ...user, activeGoalCount });
  } catch (err) {
    console.error('❌ Failed to patch user:', err.message);
    res.status(500).json({ error: 'PROFILE_UPDATE_FAILED' });
  }
};

const updateUser = async (req, res) => {
  const authenticatedUserId = req.user.id;
  const targetUserId = req.params.id;
  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ error: 'ACCESS_DENIED' });
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
      return res.status(404).json({ error: 'USER_NOT_FOUND_OR_DELETED' });
    res.json(user);
  } catch (err) {
    console.error('❌ updateUser error:', err.message);
    res.status(500).json({ error: 'PROFILE_UPDATE_FAILED' });
  }
};

// ------------------------- DELETE -------------------------

const deleteUser = async (req, res) => {
  const authenticatedUserId = req.user.id;
  const targetUserId = req.params.id;
  if (authenticatedUserId !== targetUserId) {
    return res.status(403).json({ error: 'ACCESS_DENIED' });
  }
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [targetUserId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND_OR_DELETED' });
    }
    res.json({ message: 'User hard-deleted', user: result.rows[0] });
  } catch (err) {
    console.error('❌ deleteUser error:', err.message);
    res.status(500).json({ error: 'USER_DELETE_FAILED' });
  }
};

// ------------------------- Dashboard (batched) -------------------------

const getUserDashboard = async (req, res) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.id;

  if (!requestedUserId || typeof requestedUserId !== 'string') {
    return res.status(400).json({ error: 'INVALID_USER_ID' });
  }
  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({ error: 'ACCESS_DENIED' });
  }

  try {
    // Short statement timeout per request
    await pool.query(
      `SET LOCAL statement_timeout TO ${DASHBOARD_STMT_TIMEOUT_MS}`
    );

    const { rows: userRows } = await pool.query(
      `SELECT id, name, deleted_at FROM users WHERE id = $1 LIMIT 1`,
      [authenticatedUserId]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (user.deleted_at)
      return res.status(403).json({ error: 'ACCOUNT_DELETED' });

    const { rows: goals } = await pool.query(
      `SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC NULLS LAST`,
      [authenticatedUserId]
    );
    if (goals.length === 0) {
      return res.json({ user: { id: user.id, name: user.name }, goals: [] });
    }

    const goalIds = goals.map((g) => g.id);

    const { rows: subgoals } = await pool.query(
      `SELECT * FROM subgoals WHERE goal_id = ANY($1::uuid[]) ORDER BY position ASC, id ASC`,
      [goalIds]
    );
    const subgoalIds = subgoals.map((sg) => sg.id);

    const { rows: tasks } = subgoalIds.length
      ? await pool.query(
          `SELECT * FROM tasks WHERE subgoal_id = ANY($1::uuid[]) ORDER BY position ASC, id ASC`,
          [subgoalIds]
        )
      : [];

    const taskIds = tasks.map((t) => t.id);

    const { rows: microtasks } = taskIds.length
      ? await pool.query(
          `SELECT id, title, status, task_id
             FROM microtasks
            WHERE task_id = ANY($1::uuid[])
            ORDER BY position ASC, id ASC`,
          [taskIds]
        )
      : [];

    const microByTask = new Map();
    for (const mt of microtasks) {
      if (!microByTask.has(mt.task_id)) microByTask.set(mt.task_id, []);
      microByTask.get(mt.task_id).push(mt);
    }

    const tasksBySub = new Map();
    for (const t of tasks) {
      if (!tasksBySub.has(t.subgoal_id)) tasksBySub.set(t.subgoal_id, []);
      tasksBySub
        .get(t.subgoal_id)
        .push({ ...t, microtasks: microByTask.get(t.id) || [] });
    }

    const subByGoal = new Map();
    for (const sg of subgoals) {
      if (!subByGoal.has(sg.goal_id)) subByGoal.set(sg.goal_id, []);
      subByGoal
        .get(sg.goal_id)
        .push({ ...sg, tasks: tasksBySub.get(sg.id) || [] });
    }

    const assembled = goals.map((g) => {
      const sgList = subByGoal.get(g.id) || [];

      let total = 0,
        done = 0;
      let current = { subgoalId: null, taskId: null, microtaskId: null };

      for (const sg of sgList) {
        for (const t of sg.tasks) {
          for (const mt of t.microtasks) {
            total++;
            if (mt.status === 'done') done++;
          }
          const next = t.microtasks.find((mt) => mt.status !== 'done');
          if (!current.microtaskId && next) {
            current = { subgoalId: sg.id, taskId: t.id, microtaskId: next.id };
          }
        }
      }

      const percentage_complete = total
        ? Number(((done / total) * 100).toFixed(1))
        : 0;

      return assignStatuses({
        ...g,
        subgoals: sgList,
        percentage_complete,
        current,
      });
    });

    return res.json({
      user: { id: user.id, name: user.name },
      goals: assembled,
    });
  } catch (err) {
    console.error('❌ Error generating dashboard:', err.message);
    if (/statement timeout|timeout|ETIMEDOUT/i.test(err.message)) {
      return res.status(504).json({ error: 'DASHBOARD_TIMEOUT' });
    }
    return res.status(500).json({ error: 'DASHBOARD_LOAD_FAILED' });
  }
};

const getMyDashboard = async (req, res) => {
  req.params = { userId: req.user.id };
  return getUserDashboard(req, res);
};

// Delete me with Telegram farewell + unlink
const deleteMe = async (req, res) => {
  const userId = req.user.id;
  const { confirm, acknowledge } = req.body || {};

  if ((confirm || '').toUpperCase() !== 'DELETE' || acknowledge !== true) {
    return res.status(403).json({ error: 'DELETE_CONFIRM_REQUIRED' });
  }

  const { rows } = await pool.query(
    `SELECT id, name, telegram_id, stripe_customer_id, deleted_at
       FROM public.users
      WHERE id = $1
      LIMIT 1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  if (user.deleted_at) {
    try {
      await forgetTelegramForUser(userId);
    } catch (e) {
      console.warn('[deleteMe] ignore unlink error:', e.message);
    }
    return res.json({ ok: true, message: 'Account already deleted' });
  }

  try {
    if (stripe && user.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active',
        limit: 100,
      });
      for (const s of subs.data) {
        await stripe.subscriptions.update(s.id, { cancel_at_period_end: true });
      }
    }
  } catch (e) {
    console.error('[deleteMe] Stripe cancel failed:', e.message);
  }

  await sendFarewellIfPossible(user);

  try {
    await pool.query('BEGIN');

    await pool.query(
      `UPDATE public.users
          SET deleted_at = NOW(),
              plan = 'free',
              plan_status = 'canceled'
        WHERE id = $1`,
      [userId]
    );

    await pool.query(
      `UPDATE public.goals
          SET status = CASE WHEN status='done' THEN status ELSE 'done' END
        WHERE user_id = $1`,
      [userId]
    );

    await forgetTelegramForUser(userId);

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ deleteMe error:', err.message);
    return res.status(500).json({ error: 'ACCOUNT_DELETE_FAILED' });
  }

  return res.json({
    ok: true,
    message:
      'Account deleted. Your subscription (if any) will end at period end, and Telegram has been unlinked.',
  });
};

// ------------------------- exports -------------------------

module.exports = {
  getUsers,
  createUser,
  getUserById,
  getCurrentUser,
  getUserDashboard,
  getMyDashboard,
  patchMe,
  updateUser,
  deleteUser,
  deleteMe,
};
