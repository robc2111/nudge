// server/middleware/auth.js
// Robust JWT auth middleware with an optional variant.
// - Verifies Bearer token (Authorization: Bearer <jwt>)
// - Optionally looks up the user to ensure the account still exists / not deleted
// - Attaches req.user = { id, email, name? } for downstream handlers

const jwt = require('jsonwebtoken');
const pool = require('../db');

/** Extracts a Bearer token from the Authorization header. */
function getBearer(req) {
  const hdr = req.headers?.authorization || '';
  if (!hdr) return null;
  const [scheme, token] = hdr.split(' ');
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

/** Core verifier: returns user payload or throws. */
async function verifyAndLoadUser(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('Server misconfigured: missing JWT_SECRET');
    err.status = 500;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }

  // Expect at least { id, email? } in the JWT
  const userId = decoded.id;
  if (!userId) {
    const err = new Error('Invalid token payload');
    err.status = 401;
    throw err;
  }

  // Load fresh user to ensure they still exist & not deleted/disabled
  const { rows } = await pool.query(
    `SELECT id, email, name, deleted_at
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [userId]
  );
  const user = rows[0];
  if (!user) {
    const err = new Error('Invalid token (user not found)');
    err.status = 401;
    throw err;
  }
  if (user.deleted_at) {
    const err = new Error('Account deleted');
    err.status = 403;
    throw err;
  }

  return {
    id: user.id,
    email: user.email || decoded.email || null,
    name: user.name || null,
    // optionally surface standard JWT fields if present
    iat: decoded.iat,
    exp: decoded.exp,
    jti: decoded.jti,
  };
}

/**
 * Strict auth: 401 on missing/invalid token.
 * Use on protected routes.
 */
async function requireAuth(req, res, next) {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const user = await verifyAndLoadUser(token);
    req.user = user;
    return next();
  } catch (e) {
    const code = e.status || 401;
    return res.status(code).json({ error: e.message || 'Unauthorized' });
  }
}

/**
 * Optional auth: attaches req.user when present & valid;
 * otherwise continues as anonymous without error.
 * Use on routes that work for both authed/anon users.
 */
async function optionalAuth(req, _res, next) {
  try {
    const token = getBearer(req);
    if (!token) return next();
    const user = await verifyAndLoadUser(token);
    req.user = user;
  } catch {
    // swallow errors for optional auth
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };
