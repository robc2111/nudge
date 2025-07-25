//reflections.js
const express = require('express');
const router = express.Router();
const {
  getReflections,
  getReflectionById,
  createReflection,
  updateReflection,
  deleteReflection
} = require('../controllers/reflectionsController');

router.get('/', getReflections);
router.get('/:id', getReflectionById);
router.post('/', createReflection);
router.put('/:id', updateReflection);
router.delete('/:id', deleteReflection);

module.exports = router;