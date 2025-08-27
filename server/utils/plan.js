// server/utils/plan.js
// Central place for plan limits so controllers/routes stay clean.

const PLAN_LIMITS = {
  free: { activeGoals: 1 },
  pro:  { activeGoals: 9999 }, // effectively unlimited
};

function limitsFor(plan) {
  const key = String(plan || 'free').toLowerCase();
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}

module.exports = { PLAN_LIMITS, limitsFor };