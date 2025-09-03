// server/routes/subgoals.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const {
  getSubgoals,
  getSubgoalById,
  createSubgoal,
  updateSubgoal,
  deleteSubgoal,
} = require('../controllers/subgoalsController');

const { validate } = require('../validation/middleware');
const { IdParam, SubgoalCreateSchema, SubgoalUpdateSchema } = require('../validation/schemas');

router.get('/', verifyToken, getSubgoals);
router.get('/:id', verifyToken, validate(IdParam, 'params'), getSubgoalById);

router.post('/', verifyToken, validate(SubgoalCreateSchema, 'body'), createSubgoal);

router.put(
  '/:id',
  verifyToken,
  validate(IdParam, 'params'),
  validate(SubgoalUpdateSchema, 'body'),
  updateSubgoal
);

router.delete('/:id', verifyToken, validate(IdParam, 'params'), deleteSubgoal);

module.exports = router;