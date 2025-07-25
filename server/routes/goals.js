const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');

// Create a new goal
router.post('/', goalsController.createGoal);

// Get all goals for a user
router.get('/user/:userId', goalsController.getGoalsByUser);

// Get a single goal by ID
router.get('/:id', goalsController.getGoalById);

// Update a goal by ID
router.put('/:id', goalsController.updateGoal);

// Delete a goal by ID
router.delete('/:id', goalsController.deleteGoal);

module.exports = router;