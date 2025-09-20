// server/routes/microtasks.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

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

router.get('/', requireAuth, getMicrotasks);
router.get('/:id', requireAuth, validate(IdParam, 'params'), getMicrotaskById);

router.post(
  '/',
  requireAuth,
  validate(MicrotaskCreateSchema, 'body'),
  createMicrotask
);

router.put(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  validate(MicrotaskUpdateSchema, 'body'),
  updateMicrotask
);

router.delete(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  deleteMicrotask
);

router.patch(
  '/:id/status',
  requireAuth,
  validate(IdParam, 'params'),
  validate(MicrotaskStatusBody, 'body'),
  updateMicrotaskStatus
);

module.exports = router;
