// server/routes/goals.js
const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const verifyToken = require('../middleware/verifyToken');

// 🔒 Authenticated write routes
router.post('/', verifyToken, goalsController.createGoal);
router.put('/:id', verifyToken, goalsController.updateGoal);
router.delete('/:id', verifyToken, goalsController.deleteGoal);
router.put('/:id/status', verifyToken, goalsController.updateGoalStatus);

// 🔒 Authenticated “mine”
router.get('/mine', verifyToken, goalsController.getMyGoals);

// Public / dev (keep if you need them)
router.get('/', goalsController.getAllGoals);
router.get('/user/:userId', goalsController.getGoalsByUser);
router.get('/:id', goalsController.getGoalById);

module.exports = router;