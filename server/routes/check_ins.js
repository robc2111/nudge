//check_ins.js
const express = require('express');
const router = express.Router();
const {
  getCheckIns,
  getCheckInById,
  createCheckIn,
  updateCheckIn,
  deleteCheckIn
} = require('../controllers/checkInsController');

router.get('/', getCheckIns);            // Get all check-ins
router.get('/:id', getCheckInById);      // Get check-in by ID
router.post('/', createCheckIn);         // Create a check-in
router.put('/:id', updateCheckIn);       // Update a check-in
router.delete('/:id', deleteCheckIn);    // Delete a check-in

module.exports = router;