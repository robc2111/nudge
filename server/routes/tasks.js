// server/routes/tasks.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');

const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/tasksController');

const { validate } = require('../validation/middleware');
const {
  IdParam,
  TaskCreateSchema,
  TaskUpdateSchema,
} = require('../validation/schemas');

router.get('/', requireAuth, getTasks);
router.get('/:id', requireAuth, validate(IdParam, 'params'), getTaskById);

router.post(
  '/',
  requireAuth,
  (req, _res, next) => {
    console.log('✅ POST /api/tasks route hit');
    next();
  },
  validate(TaskCreateSchema, 'body'),
  createTask
);

router.put(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  validate(TaskUpdateSchema, 'body'),
  updateTask
);

router.delete('/:id', requireAuth, validate(IdParam, 'params'), deleteTask);

module.exports = router;
