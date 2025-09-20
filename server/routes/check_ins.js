const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');

const {
  getCheckIns,
  getCheckInById,
  createCheckIn,
  updateCheckIn,
  deleteCheckIn,
} = require('../controllers/checkInsController');

const { validate } = require('../validation/middleware');
const {
  IdParam,
  CheckInCreateSchema,
  CheckInUpdateSchema,
} = require('../validation/schemas');

router.get('/', requireAuth, getCheckIns);
router.get('/:id', requireAuth, validate(IdParam, 'params'), getCheckInById);
router.post(
  '/',
  requireAuth,
  validate(CheckInCreateSchema, 'body'),
  createCheckIn
);
router.put(
  '/:id',
  requireAuth,
  validate(IdParam, 'params'),
  validate(CheckInUpdateSchema, 'body'),
  updateCheckIn
);
router.delete('/:id', requireAuth, validate(IdParam, 'params'), deleteCheckIn);

module.exports = router;
