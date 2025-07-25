const express = require('express');
const router = express.Router();
const {
  getMicrotasks,
  getMicrotaskById,
  createMicrotask,
  updateMicrotask,
  deleteMicrotask
} = require('../controllers/microtasksController');

router.get('/', getMicrotasks);
router.get('/:id', getMicrotaskById);
router.post('/', createMicrotask);
router.put('/:id', updateMicrotask);
router.delete('/:id', deleteMicrotask);

module.exports = router;