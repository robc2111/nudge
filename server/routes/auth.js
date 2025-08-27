//auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // ✅ added
const pool = require('../db');

router.post('/register', async (req, res) => {
  // // 🚧 Block all registrations for now
  // return res.status(403).json({
  //   error: 'Registrations are temporarily closed. Please check back soon!'
  // });

  // The rest of the code below is now unreachable
  const { name, email, password, telegram_id } = req.body;
console.log('[auth/login] body keys:', Object.keys(req.body || {}));
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUser = await pool.query(
      `INSERT INTO users (id, name, email, password, telegram_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name, email, hashedPassword, telegram_id]
    );

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: newUser.rows[0] });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
console.log('[auth/login] body keys:', Object.keys(req.body || {}));
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;