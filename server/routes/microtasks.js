// server/routes/microtasks.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const {
  getMicrotasks,
  getMicrotaskById,
  createMicrotask,
  updateMicrotask,
  deleteMicrotask,
  updateMicrotaskStatus,
} = require('../controllers/microtasksController');

const { validate } = require('../validation/middleware');
const {
  IdParam,
  MicrotaskCreateSchema,
  MicrotaskUpdateSchema,
  MicrotaskStatusBody,
} = require('../validation/schemas');

router.get('/', verifyToken, getMicrotasks);
router.get('/:id', verifyToken, validate(IdParam, 'params'), getMicrotaskById);

router.post('/', verifyToken, validate(MicrotaskCreateSchema, 'body'), createMicrotask);

router.put(
  '/:id',
  verifyToken,
  validate(IdParam, 'params'),
  validate(MicrotaskUpdateSchema, 'body'),
  updateMicrotask
);

router.delete('/:id', verifyToken, validate(IdParam, 'params'), deleteMicrotask);

router.patch(
  '/:id/status',
  verifyToken,
  validate(IdParam, 'params'),
  validate(MicrotaskStatusBody, 'body'),
  updateMicrotaskStatus
);

module.exports = router;