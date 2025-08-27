// server/utils/limits.js
const pool = require('../db');

const PLAN_LIMITS = {
  free: { activeGoals: 1 },
  pro:  { activeGoals: 9999 }, // effectively unlimited
};

async function getUserPlan(userId) {
  // adjust if you store plan elsewhere (e.g., subscriptions table)
  const { rows } = await pool.query(
    `SELECT plan FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return (rows[0]?.plan || 'free').toLowerCase();
}

async function countActiveGoals(userId) {
  // decide what counts as “active”. Usually in_progress (and maybe draft?)
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM goals
      WHERE user_id = $1
        AND status IN ('in_progress')`, // exclude archived/completed
    [userId]
  );
  return rows[0]?.c ?? 0;
}

async function assertCanCreateGoal(userId) {
  const plan = await getUserPlan(userId);
  const active = await countActiveGoals(userId);
  const limit = PLAN_LIMITS[plan]?.activeGoals ?? PLAN_LIMITS.free.activeGoals;

  if (active >= limit) {
    const err = new Error('Goal limit reached for your plan.');
    err.status = 403;
    err.code = 'GOAL_LIMIT_REACHED';
    err.limit = limit;
    err.plan = plan;
    throw err;
  }

  // ok
  return { plan, active, limit };
}

module.exports = {
  PLAN_LIMITS,
  getUserPlan,
  countActiveGoals,
  assertCanCreateGoal,
};