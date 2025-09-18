// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const { validate } = require('../validation/middleware');
const { auth: authSchemas } = require('../validation/schemas');

const DEFAULT_TELEGRAM_ID = 'not-linked';

function ensureJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return process.env.JWT_SECRET;
}

/* ------------------------------- REGISTER ------------------------------ */
// POST /api/auth/register
router.post(
  '/register',
  validate(authSchemas.register, 'body'), // <-- FIXED
  async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || '');
      // ensure we never pass NULL into a NOT NULL column
      const telegram_id = String(
        req.body?.telegram_id ?? DEFAULT_TELEGRAM_ID
      ).trim();

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = uuidv4();

      const insertSQL = `
        INSERT INTO users (id, name, email, password, telegram_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email
      `;
      const vals = [userId, name, email, hashedPassword, telegram_id];

      const newUser = await pool.query(insertSQL, vals);

      const token = jwt.sign({ id: userId }, ensureJwtSecret(), {
        expiresIn: '7d',
      });
      return res.json({ token, user: newUser.rows[0] });
    } catch (err) {
      if (err?.code === '23505') {
        // unique violation (likely on email)
        return res.status(400).json({ error: 'Email already registered' });
      }
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/* -------------------------------- LOGIN -------------------------------- */
// POST /api/auth/login
router.post(
  '/login',
  validate(authSchemas.login, 'body'), // <-- FIXED
  async (req, res) => {
    try {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || '');

      const userResult = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      if (!user.password) {
        return res
          .status(400)
          .json({ error: 'This account has no password set' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id }, ensureJwtSecret(), {
        expiresIn: '7d',
      });
      return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;
