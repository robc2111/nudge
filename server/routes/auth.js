//auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, telegram_id } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, telegram_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, telegram_id]
    );

    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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