const express = require('express');
const router = express.Router();

const goalsController = require('../controllers/goalsController');
const verifyToken = require('../middleware/verifyToken');
const { assertPro } = require('../utils/plan');

const { validate } = require('../validation/middleware');
const {
  GoalCreateSchema,
  GoalUpdateSchema,
  IdParam,
  UserDashboardParams,
} = require('../validation/schemas');

/**
 * Pro gate used only when the request attempts to set/change `tone`.
 * (Tone is per-goal and Pro-only.)
 */
async function proGateIfTone(req, res, next) {
  try {
    if (typeof req.body?.tone !== 'undefined') {
      await assertPro(req.user.id);
    }
    next();
  } catch (e) {
    if (e.code === 'PRO_REQUIRED') {
      return res
        .status(403)
        .json({
          error: 'Changing coach tone is a Pro feature.',
          feature: 'tone',
        });
    }
    next(e);
  }
}

// Authenticated writes
router.post(
  '/',
  verifyToken,
  validate(GoalCreateSchema, 'body'),
  proGateIfTone, // <-- Pro-gate tone on create
  goalsController.createGoal
);

router.put(
  '/:id',
  verifyToken,
  validate(IdParam, 'params'),
  validate(GoalUpdateSchema, 'body'),
  proGateIfTone, // <-- Pro-gate tone on update
  goalsController.updateGoal
);

router.delete(
  '/:id',
  verifyToken,
  validate(IdParam, 'params'),
  goalsController.deleteGoal
);

router.put(
  '/:id/status',
  verifyToken,
  validate(IdParam, 'params'),
  validate(GoalUpdateSchema.pick({ status: true }), 'body'),
  goalsController.updateGoalStatus
);

// Authenticated: mine
router.get('/mine', verifyToken, goalsController.getMyGoals);

// Public/dev
router.get('/', goalsController.getAllGoals);
router.get(
  '/user/:userId',
  validate(UserDashboardParams, 'params'),
  goalsController.getGoalsByUser
);
router.get('/:id', validate(IdParam, 'params'), goalsController.getGoalById);

module.exports = router;
