// server/routes/passwordReset.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { sendResetEmail } = require('../utils/email');
const { issueResetTokenForUser, consumeResetToken } = require('../utils/resetToken');

const router = express.Router();

const forgotLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  // Always return generic to avoid account enumeration
  try {
    if (email) {
      const { rows } = await pool.query(
        `SELECT id, email FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      );
      const user = rows[0];
      if (user) {
        const token = await issueResetTokenForUser(user.id, {
          ip: req.ip,
          ua: req.headers['user-agent'] || '',
        });
        const resetUrl = `${process.env.APP_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
        await sendResetEmail({ to: user.email, resetUrl });
      }
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('forgot-password error:', e.message);
    return res.json({ ok: true });
  }
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');

  if (!token || !password) return res.status(400).json({ error: 'Missing token or password' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const userId = await consumeResetToken(token);
    if (!userId) return res.status(400).json({ error: 'Invalid or expired link' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hash, userId]);

    return res.json({ ok: true });
  } catch (e) {
    console.error('reset-password error:', e.message);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;