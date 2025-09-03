const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const pool = require('../db');
const { limitsFor } = require('../utils/plan');
const { enforceGoalLimitForPlan } = require('../controllers/paymentsController');

const { validate } = require('../validation/middleware');
const { ChooseActivePlanBody } = require('../validation/schemas');

// POST /api/plan/choose-active { goal_id }
router.post('/choose-active', requireAuth, validate(ChooseActivePlanBody, 'body'), async (req, res) => {
  const userId = req.user.id;
  const { goal_id } = req.body;

  const { rows } = await pool.query(
    `SELECT id FROM goals WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [goal_id, userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Goal not found' });

  await pool.query(
    `UPDATE users SET keep_active_goal_id = $1 WHERE id = $2`,
    [goal_id, userId]
  );

  const { rows: urows } = await pool.query(
    `SELECT plan FROM users WHERE id = $1`,
    [userId]
  );
  const plan = (urows[0]?.plan || 'free').toLowerCase();
  await enforceGoalLimitForPlan(userId, plan);

  res.json({ ok: true });
});

// GET /api/plan/limits -> { plan, limit, activeCount }
router.get('/limits', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { rows } = await pool.query(
    `SELECT plan FROM users WHERE id = $1`,
    [userId]
  );
  const plan = (rows[0]?.plan || 'free').toLowerCase();
  const { activeGoals } = limitsFor(plan);

  const { rows: ar } = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM goals WHERE user_id = $1 AND status = 'in_progress'`,
    [userId]
  );

  res.json({ plan, limit: activeGoals, activeCount: ar[0]?.c || 0 });
});

module.exports = router;