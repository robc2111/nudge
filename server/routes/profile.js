//profile.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const pool = require('../db');

// GET /api/profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    res.json(user.rows[0]);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;