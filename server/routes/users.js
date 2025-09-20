// server/routes/users.js
const express = require('express');
const router = express.Router();

const _auth = require('../middleware/auth');
const requireAuth =
  typeof _auth === 'function'
    ? _auth
    : typeof _auth?.requireAuth === 'function'
      ? _auth.requireAuth
      : (() => {
          throw new Error(
            'middleware/auth must export a function or { requireAuth }'
          );
        })();

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
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, validate(UserPatchSchema, 'body'), patchMe);
router.get('/me/dashboard', requireAuth, getMyDashboard);

// Delete own account (soft delete + Stripe cancel + Telegram farewell + unlink)
router.delete('/me', requireAuth, deleteMe);

router.get(
  '/:userId/dashboard',
  requireAuth,
  validate(UserDashboardParams, 'params'),
  getUserDashboard
);

router.get('/:id', requireAuth, validate(UserIdParam, 'params'), getUserById);

router.put(
  '/:id',
  requireAuth,
  validate(UserIdParam, 'params'),
  validate(UserPatchSchema, 'body'),
  updateUser
);

router.delete('/:id', requireAuth, validate(UserIdParam, 'params'), deleteUser);

module.exports = router;
