const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const {
  getCheckIns,
  getCheckInById,
  createCheckIn,
  updateCheckIn,
  deleteCheckIn
} = require('../controllers/checkInsController');

const { validate } = require('../validation/middleware');
const { IdParam, CheckInCreateSchema, CheckInUpdateSchema } = require('../validation/schemas');

router.get('/', verifyToken, getCheckIns);
router.get('/:id', verifyToken, validate(IdParam, 'params'), getCheckInById);
router.post('/', verifyToken, validate(CheckInCreateSchema, 'body'), createCheckIn);
router.put('/:id', verifyToken, validate(IdParam, 'params'), validate(CheckInUpdateSchema, 'body'), updateCheckIn);
router.delete('/:id', verifyToken, validate(IdParam, 'params'), deleteCheckIn);

module.exports = router;