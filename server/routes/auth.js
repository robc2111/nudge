const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const { validate } = require('../validation/middleware');
const { auth: authSchemas } = require('../validation/schemas');
const { sendWelcomeOnRegister } = require('../utils/telegram');

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
  validate(authSchemas.register, 'body'),
  async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || '');

      // if provided, keep numeric-only; else store NULL
      let telegramId = null;
      if (
        req.body?.telegram_id != null &&
        String(req.body.telegram_id).trim() !== ''
      ) {
        telegramId = String(req.body.telegram_id).replace(/\D/g, '');
        if (!telegramId) telegramId = null;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = uuidv4();

      const insertSQL = `
        INSERT INTO users (id, name, email, password, telegram_id, telegram_enabled)
        VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 IS NULL THEN FALSE ELSE TRUE END)
        RETURNING id, name, email, telegram_id, telegram_enabled
      `;
      const vals = [userId, name, email, hashedPassword, telegramId];

      const {
        rows: [userRow],
      } = await pool.query(insertSQL, vals);

      // Fire-and-forget welcome DM (don’t block the response)
      (async () => {
        try {
          await sendWelcomeOnRegister(userRow);
        } catch (e) {
          console.warn('[auth.register] welcome DM failed:', e.message);
        }
      })();

      const token = jwt.sign({ id: userId }, ensureJwtSecret(), {
        expiresIn: '7d',
      });
      return res.json({
        token,
        user: { id: userRow.id, name: userRow.name, email: userRow.email },
      });
    } catch (err) {
      if (err?.code === '23505') {
        return res.status(400).json({ error: 'Email already registered' });
      }
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/* -------------------------------- LOGIN -------------------------------- */
// POST /api/auth/login
router.post('/login', validate(authSchemas.login, 'body'), async (req, res) => {
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
});

module.exports = router;
