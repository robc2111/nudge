// server/routes/subgoals.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const {
  getSubgoals,
  getSubgoalById,
  createSubgoal,
  updateSubgoal,
  deleteSubgoal,
} = require('../controllers/subgoalsController');

const { validate } = require('../validation/middleware');
const {
  IdParam,
  SubgoalCreateSchema,
  SubgoalUpdateSchema,
} = require('../validation/schemas');

router.get('/', requireAuth, getSubgoals);
router.get('/:id', requireAuth, validate(IdParam, 'params'), getSubgoalById);

router.post(
  '/',
  requireAuth,
  validate(SubgoalCreateSchema, 'body'),
  createSubgoal
);

router.put(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  validate(SubgoalUpdateSchema, 'body'),
  updateSubgoal
);

router.delete('/:id', requireAuth, validate(IdParam, 'params'), deleteSubgoal);

module.exports = router;
