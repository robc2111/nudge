//user.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserDashboard,
  getCurrentUser
} = require('../controllers/usersController');

router.get('/', getUsers);
router.post('/', createUser);
router.get('/me', verifyToken, getCurrentUser);
router.put('/:id', verifyToken,updateUser);
router.delete('/:id', verifyToken, deleteUser);
router.get('/:userId/dashboard', verifyToken, getUserDashboard);


module.exports = router;