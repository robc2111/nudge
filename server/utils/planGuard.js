// server/utils/planGuard.js
/**
 * Centralized plan/limit logic for GoalCrumbs.
 * - Free plan: limited ACTIVE goals (status != 'done')
 * - Pro plan: unlimited
 */

const FREE_ACTIVE_GOAL_LIMIT = Number(process.env.FREE_ACTIVE_GOAL_LIMIT || 1);

function isPro(plan, planStatus) {
  const p = String(plan || '').toLowerCase();
  const s = String(planStatus || '').toLowerCase();
  // consider these statuses as "paid/ok"
  const ok = new Set([
    'active',
    'trialing',
    'past_due',
    'unpaid',
    'cancel_at_period_end',
  ]);
  return p === 'pro' && ok.has(s);
}

function getActiveGoalLimit(plan, planStatus) {
  return isPro(plan, planStatus) ? Infinity : FREE_ACTIVE_GOAL_LIMIT;
}

/** Count ACTIVE goals (not done) for a user. */
async function countActiveGoals(pool, userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM public.goals
      WHERE user_id = $1
        AND (status IS NULL OR status <> 'done')`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

/** Throw 403 if user can’t create another active goal. */
async function assertCanCreateActiveGoal(pool, user) {
  const limit = getActiveGoalLimit(user.plan, user.plan_status);
  if (limit === Infinity) return;

  const active = await countActiveGoals(pool, user.id);
  if (active >= limit) {
    const err = new Error('PLAN_LIMIT_REACHED');
    err.statusCode = 403;
    err.details = {
      code: 'PLAN_LIMIT_REACHED',
      message: `Free plan allows up to ${limit} active goal${limit === 1 ? '' : 's'}.`,
      limit,
      active,
      plan: user.plan,
      plan_status: user.plan_status,
    };
    throw err;
  }
}

/** Throw { code: 'PRO_REQUIRED' } if user is not Pro — for Pro-only features like tone. */
function assertProSync(plan, planStatus) {
  if (!isPro(plan, planStatus)) {
    const err = new Error('Pro required');
    err.code = 'PRO_REQUIRED';
    throw err;
  }
}

module.exports = {
  FREE_ACTIVE_GOAL_LIMIT,
  isPro,
  getActiveGoalLimit,
  countActiveGoals,
  assertCanCreateActiveGoal,
  assertProSync,
};
