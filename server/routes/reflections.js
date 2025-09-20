const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const {
  getReflections,
  getReflectionById,
  createReflection,
  updateReflection,
  deleteReflection,
} = require('../controllers/reflectionsController');

const { validate } = require('../validation/middleware');
const {
  IdParam,
  ReflectionCreateSchema,
  ReflectionUpdateSchema,
} = require('../validation/schemas');

router.get('/', requireAuth, getReflections);
router.get('/:id', requireAuth, validate(IdParam, 'params'), getReflectionById);
router.post(
  '/',
  requireAuth,
  validate(ReflectionCreateSchema, 'body'),
  createReflection
);
router.put(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  validate(ReflectionUpdateSchema, 'body'),
  updateReflection
);
router.delete(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  deleteReflection
);

module.exports = router;
