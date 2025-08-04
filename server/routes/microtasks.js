//microtasks.js
const express = require('express');
const router = express.Router();
const {
  getMicrotasks,
  getMicrotaskById,
  createMicrotask,
  updateMicrotask,
  deleteMicrotask,
  updateMicrotaskStatus
} = require('../controllers/microtasksController');

router.get('/', getMicrotasks);
router.get('/:id', getMicrotaskById);
router.post('/', createMicrotask);
router.put('/:id', updateMicrotask);
router.delete('/:id', deleteMicrotask);
router.patch('/:id/status', updateMicrotaskStatus);

module.exports = router;