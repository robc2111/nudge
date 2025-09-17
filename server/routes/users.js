// server/routes/users.js
const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');

const {
  getUsers,
  createUser,
  getUserById,
  getCurrentUser,
  getMyDashboard,
  patchMe,
  updateUser,
  deleteUser,
  getUserDashboard,
  deleteMe,
} = require('../controllers/usersController');

const { validate } = require('../validation/middleware');
const {
  UserPatchSchema,
  UserIdParam,
  UserDashboardParams,
} = require('../validation/schemas');

/* --------------------------- routes ---------------------------- */

// Public
router.get('/', getUsers);
router.post('/', createUser);

// Authenticated
router.get('/me', verifyToken, getCurrentUser);
router.patch('/me', verifyToken, validate(UserPatchSchema, 'body'), patchMe);
router.get('/me/dashboard', verifyToken, getMyDashboard);

// Delete own account (soft delete + Stripe cancel + Telegram farewell + unlink)
router.delete('/me', verifyToken, deleteMe);

router.get(
  '/:userId/dashboard',
  verifyToken,
  validate(UserDashboardParams, 'params'),
  getUserDashboard
);

router.get('/:id', verifyToken, validate(UserIdParam, 'params'), getUserById);

router.put(
  '/:id',
  verifyToken,
  validate(UserIdParam, 'params'),
  validate(UserPatchSchema, 'body'),
  updateUser
);

router.delete('/:id', verifyToken, validate(UserIdParam, 'params'), deleteUser);

module.exports = router;
