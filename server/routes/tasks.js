//tasks.js
const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/tasksController');

router.get('/', getTasks); // Get all tasks
router.get('/:id', getTaskById); // Get task by ID
router.post('/', (req, res, next) => {
  console.log('✅ POST /api/tasks route hit');
  next();
}, createTask); // Create a task
router.put('/:id', updateTask); // Update task
router.delete('/:id', deleteTask); // Delete task


module.exports = router;

