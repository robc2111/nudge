// server/middleware/verifyToken.js
const jwt = require('jsonwebtoken');
const pool = require('../db');

module.exports = async function verifyToken(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

    const decoded = jwt.verify(token, secret);
    const { rows } = await pool.query(
      `SELECT id, email, name, deleted_at FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    if (user.deleted_at)
      return res.status(403).json({ error: 'Account deleted' });

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
