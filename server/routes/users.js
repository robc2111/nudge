// routes/users.js
const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');

const {
  getUsers,
  createUser,
  getUserById,
  getCurrentUser,
  patchMe,
  updateUser,
  deleteUser,
  getUserDashboard,
} = require('../controllers/usersController');

// Public (keep as-is or protect later)
router.get('/', getUsers);
router.post('/', createUser);

// Authenticated
router.get('/me', verifyToken, getCurrentUser);
router.patch('/me', verifyToken, patchMe);

router.get('/:userId/dashboard', verifyToken, getUserDashboard);

router.get('/:id', verifyToken, getUserById);
router.put('/:id', verifyToken, updateUser);
router.delete('/:id', verifyToken, deleteUser);

module.exports = router;
