const pool = require('../db');
const { limitsFor } = require('../utils/plan');
const { normalizeProgressByGoal } = require('../utils/progressUtils');
const { materializeGoal } = require('../utils/materializeGoal');
const { track } = require('../utils/analytics');
const { sendGoalCreated, sendGoalCompleted } = require('../utils/telegram');

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

const ALLOWED_TONES = new Set(['friendly', 'strict', 'motivational']);

function normalizeTone(t) {
  if (typeof t !== 'string') return null;
  const v = t.trim().toLowerCase();
  return ALLOWED_TONES.has(v) ? v : null;
}

function normalizeDate(input) {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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

/* ────────────────────────────────────────────────────────────
   Create goal + materialize hierarchy
   ──────────────────────────────────────────────────────────── */

exports.createGoal = async (req, res) => {
  const client = await pool.connect();
  try {
    const authUserId = req.user?.id || req.user?.sub || req.body.user_id;
    const {
      title,
      description = null,
      due_date = null,
      tone = null,
      breakdown = [],
      subgoals = [],
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

    const normalizedTone = normalizeTone(tone) ?? 'friendly';
    const normalizedDue = normalizeDate(due_date);

    await client.query('BEGIN');

    const {
      rows: [goal],
    } = await client.query(
      `INSERT INTO goals (user_id, title, description, due_date, tone, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'in_progress', NOW())
       RETURNING id, title`,
      [authUserId, title.trim(), description, normalizedDue, normalizedTone]
    );
    const goalId = goal.id;

    await materializeGoal(client, {
      userId: authUserId,
      goalId,
      breakdown,
      subgoals,
    });

    await client.query('COMMIT');

    // Normalize pointers and analytics (non-blocking)
    await normalizeProgressByGoal(goalId).catch(() => {});
    await track({
      req,
      userId: authUserId,
      event: 'goal_created',
      props: {
        goal_id: goalId,
        has_breakdown: Boolean(
          (breakdown && breakdown.length) || (subgoals && subgoals.length)
        ),
      },
    }).catch(() => {});

    // Fire a Telegram "goal created" DM (non-blocking)
    (async () => {
      try {
        const [
          {
            rows: [user],
          },
          { rows: nextMicros },
        ] = await Promise.all([
          pool.query(
            `SELECT id, name, telegram_id, telegram_enabled FROM users WHERE id = $1`,
            [authUserId]
          ),
          pool.query(
            `SELECT mt.title
               FROM microtasks mt
               JOIN tasks t ON t.id = mt.task_id
               JOIN subgoals sg ON sg.id = t.subgoal_id
              WHERE sg.goal_id = $1
                AND COALESCE(mt.status, 'todo') <> 'done'
              ORDER BY sg.position, t.position, mt.position
              LIMIT 3`,
            [goalId]
          ),
        ]);
        if (user) {
          await sendGoalCreated(user, goal, nextMicros || []);
        }
      } catch (e) {
        console.warn('[goals.create] goal-created DM failed:', e.message);
      }
    })();

    return res
      .status(201)
      .json({ message: 'Goal saved successfully', goal_id: goalId });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('❌ Error creating goal:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/* ────────────────────────────────────────────────────────────
   Reads
   ──────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────
   Update (metadata)
   ──────────────────────────────────────────────────────────── */

exports.updateGoal = async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  const goalId = req.params.id;

  const { title, description, due_date, tone } = req.body || {};

  const sets = [];
  const vals = [];
  let i = 1;

  if (typeof title !== 'undefined') {
    sets.push(`title = $${i++}`);
    vals.push(title);
  }
  if (typeof description !== 'undefined') {
    sets.push(`description = $${i++}`);
    vals.push(description);
  }
  if (typeof due_date !== 'undefined') {
    sets.push(`due_date = $${i++}`);
    vals.push(normalizeDate(due_date));
  }

  if (typeof tone !== 'undefined') {
    const normalized = normalizeTone(tone);
    if (!normalized) {
      return res.status(400).json({ error: 'Invalid tone value' });
    }
    sets.push(`tone = $${i++}`);
    vals.push(normalized);
  }

  if (!sets.length) {
    return res.status(400).json({ error: 'No update fields provided' });
  }

  vals.push(userId);
  vals.push(goalId);

  try {
    const { rows } = await pool.query(
      `
      UPDATE goals
         SET ${sets.join(', ')}
       WHERE user_id = $${i++}
         AND id = $${i++}
      RETURNING *
      `,
      vals
    );

    const updated = rows[0];
    if (!updated) {
      return res
        .status(404)
        .json({ error: 'Goal not found or not owned by user' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('❌ Error updating goal:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ────────────────────────────────────────────────────────────
   Update status only
   ──────────────────────────────────────────────────────────── */

exports.updateGoalStatus = async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  const { status } = req.body;
  const { id: goalId } = req.params;

  try {
    const validStatuses = ['not_started', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { rows } = await pool.query(
      `UPDATE goals
          SET status = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *`,
      [status, goalId, userId]
    );

    const goal = rows[0];
    if (!goal) {
      return res
        .status(404)
        .json({ error: 'Goal not found or not owned by user' });
    }

    // If the goal is completed, send a congrats DM (best-effort)
    if (status === 'done') {
      (async () => {
        try {
          const {
            rows: [user],
          } = await pool.query(
            `SELECT id, name, telegram_id, telegram_enabled FROM users WHERE id = $1`,
            [userId]
          );
          if (user) await sendGoalCompleted(user, goal);
        } catch (e) {
          console.warn('[goals.status] goal-completed DM failed:', e.message);
        }
      })();
    }

    return res.json(goal);
  } catch (err) {
    console.error('❌ Error updating goal status:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ────────────────────────────────────────────────────────────
   Delete
   ──────────────────────────────────────────────────────────── */

exports.deleteGoal = async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  const goalId = req.params.id;

  try {
    const { rowCount, rows } = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [goalId, userId]
    );
    if (!rowCount) {
      return res
        .status(404)
        .json({ error: 'Goal not found or not owned by user' });
    }
    return res.json({ message: 'Goal deleted', deleted: rows[0] });
  } catch (err) {
    console.error('❌ Error deleting goal:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ────────────────────────────────────────────────────────────
   All goals (public/dev)
   ──────────────────────────────────────────────────────────── */

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
