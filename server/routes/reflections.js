const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const {
  getReflections,
  getReflectionById,
  createReflection,
  updateReflection,
  deleteReflection
} = require('../controllers/reflectionsController');

const { validate } = require('../validation/middleware');
const { IdParam, ReflectionCreateSchema, ReflectionUpdateSchema } = require('../validation/schemas');

router.get('/', verifyToken, getReflections);
router.get('/:id', verifyToken, validate(IdParam, 'params'), getReflectionById);
router.post('/', verifyToken, validate(ReflectionCreateSchema, 'body'), createReflection);
router.put('/:id', verifyToken, validate(IdParam, 'params'), validate(ReflectionUpdateSchema, 'body'), updateReflection);
router.delete('/:id', verifyToken, validate(IdParam, 'params'), deleteReflection);

module.exports = router;