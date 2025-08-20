// plan.js
// utils/plan.js
const FREE_GOAL_LIMIT = Number(process.env.FREE_GOAL_LIMIT ?? 1);
const PRO_GOAL_LIMIT  = process.env.PRO_GOAL_LIMIT ? Number(process.env.PRO_GOAL_LIMIT) : Infinity;

function limitsFor(plan = 'free') {
  return plan === 'pro' ? PRO_GOAL_LIMIT : FREE_GOAL_LIMIT;
}
module.exports = { limitsFor, FREE_GOAL_LIMIT, PRO_GOAL_LIMIT };