// server/routes/tasks.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/tasksController');

const { validate } = require('../validation/middleware');
const { IdParam, TaskCreateSchema, TaskUpdateSchema } = require('../validation/schemas');

router.get('/', verifyToken, getTasks);
router.get('/:id', verifyToken, validate(IdParam, 'params'), getTaskById);

router.post(
  '/',
  verifyToken,
  (req, _res, next) => { console.log('✅ POST /api/tasks route hit'); next(); },
  validate(TaskCreateSchema, 'body'),
  createTask
);

router.put(
  '/:id',
  verifyToken,
  validate(IdParam, 'params'),
  validate(TaskUpdateSchema, 'body'),
  updateTask
);

router.delete('/:id', verifyToken, validate(IdParam, 'params'), deleteTask);

module.exports = router;