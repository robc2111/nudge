// auth.js
// Minimal JWT auth middleware
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // attach decoded user; adjust keys to your token payload
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};