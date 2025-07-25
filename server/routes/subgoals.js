const express = require('express');
const router = express.Router();
const {
  getSubgoals,
  getSubgoalById,
  createSubgoal,
  updateSubgoal,
  deleteSubgoal
} = require('../controllers/subgoalsController');

router.get('/', getSubgoals);
router.get('/:id', getSubgoalById);
router.post('/', createSubgoal);
router.put('/:id', updateSubgoal);
router.delete('/:id', deleteSubgoal);

module.exports = router;