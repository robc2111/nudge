// Central place for plan limits and Pro checks so controllers/routes stay clean.
const pool = require('../db');

const PLAN_LIMITS = {
  free: { activeGoals: 1 },
  pro: { activeGoals: 9999 }, // effectively unlimited
};

function limitsFor(plan) {
  const key = String(plan || 'free').toLowerCase();
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}

/**
 * Throws { code: 'PRO_REQUIRED' } if the user isn't on a Pro plan.
 * Use this in routes that gate Pro-only features (e.g., tone switching).
 */
async function assertPro(userId) {
  const { rows } = await pool.query(
    `SELECT plan FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const plan = (rows[0]?.plan || 'free').toLowerCase();
  if (plan !== 'pro') {
    const err = new Error('Pro required');
    err.code = 'PRO_REQUIRED';
    throw err;
  }
  return true;
}

module.exports = { PLAN_LIMITS, limitsFor, assertPro };
