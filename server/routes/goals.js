// server/routes/goals.js
const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const verifyToken = require('../middleware/verifyToken');

const { validate } = require('../validation/middleware');
const {
  GoalCreateSchema,
  GoalUpdateSchema,
  IdParam,
  UserDashboardParams,
} = require('../validation/schemas');

// 🔒 Authenticated write routes
router.post('/', verifyToken, validate(GoalCreateSchema, 'body'), goalsController.createGoal);

router.put(
  '/:id',
  verifyToken,
  validate(IdParam, 'params'),
  validate(GoalUpdateSchema, 'body'),
  goalsController.updateGoal
);

router.delete('/:id', verifyToken, validate(IdParam, 'params'), goalsController.deleteGoal);

router.put(
  '/:id/status',
  verifyToken,
  validate(IdParam, 'params'),
  // status is in body: { status }
  validate(GoalUpdateSchema.pick({ status: true }), 'body'),
  goalsController.updateGoalStatus
);

// 🔒 Authenticated “mine”
router.get('/mine', verifyToken, goalsController.getMyGoals);

// Public / dev (keep if you need them)
router.get('/', goalsController.getAllGoals);
router.get('/user/:userId', validate(UserDashboardParams, 'params'), goalsController.getGoalsByUser);
router.get('/:id', validate(IdParam, 'params'), goalsController.getGoalById);

module.exports = router;