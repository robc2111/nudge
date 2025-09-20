// server/routes/goals.js
const express = require('express');
const router = express.Router();

const pool = require('../db');
const goalsController = require('../controllers/goalsController');
const requireAuth = require('../middleware/auth');

const { validate } = require('../validation/middleware');
const {
  GoalCreateSchema,
  GoalUpdateSchema,
  IdParam,
  UserDashboardParams,
} = require('../validation/schemas');

const {
  assertProSync,
  assertCanCreateActiveGoal,
} = require('../utils/planGuard');

/** If request sets `tone`, require Pro. */
function proGateIfTone(req, res, next) {
  try {
    if (typeof req.body?.tone !== 'undefined') {
      // req.user should have plan info if your auth populates it.
      // If not, you can fetch it, but most apps attach plan + status during auth.
      assertProSync(req.user?.plan, req.user?.plan_status);
    }
    next();
  } catch (e) {
    if (e.code === 'PRO_REQUIRED') {
      return res.status(403).json({
        error: 'Changing coach tone is a Pro feature.',
        feature: 'tone',
      });
    }
    next(e);
  }
}

/** Ensure user is allowed to create another active goal (Free limit). */
async function limitGateOnCreate(req, res, next) {
  try {
    // Ensure we have latest plan/status for this user.
    let user = req.user;
    if (!user?.plan || !user?.plan_status) {
      const { rows } = await pool.query(
        `SELECT id, plan, plan_status FROM users WHERE id = $1 LIMIT 1`,
        [req.user.id]
      );
      user = rows[0] || {
        id: req.user.id,
        plan: 'free',
        plan_status: 'inactive',
      };
    }
    await assertCanCreateActiveGoal(pool, user);
    next();
  } catch (e) {
    if (e.statusCode === 403 && e.details?.code === 'PLAN_LIMIT_REACHED') {
      return res.status(403).json(e.details);
    }
    next(e);
  }
}

// ---------- Authenticated writes ----------
router.post(
  '/',
  requireAuth,
  validate(GoalCreateSchema, 'body'),
  proGateIfTone, // Pro-gate tone on create
  limitGateOnCreate, // Enforce Free plan active-goal limit
  goalsController.createGoal
);

router.put(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  validate(GoalUpdateSchema, 'body'),
  proGateIfTone, // Pro-gate tone on update
  goalsController.updateGoal
);

router.delete(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  goalsController.deleteGoal
);

router.put(
  '/:id/status',
  requireAuth,
  validate(IdParam, 'params'),
  validate(GoalUpdateSchema.pick({ status: true }), 'body'),
  goalsController.updateGoalStatus
);

// ---------- Authenticated: mine ----------
router.get('/mine', requireAuth, goalsController.getMyGoals);

// ---------- Public/dev ----------
router.get('/', goalsController.getAllGoals);
router.get(
  '/user/:userId',
  validate(UserDashboardParams, 'params'),
  goalsController.getGoalsByUser
);
router.get('/:id', validate(IdParam, 'params'), goalsController.getGoalById);

module.exports = router;
