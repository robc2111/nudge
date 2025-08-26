const crypto = require('crypto');
const { DateTime } = require('luxon');
const pool = require('../db');

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Creates a single-use reset token (not stored in plain!)
 * Returns the raw token for the email; stores only its hash.
 */
async function issueResetTokenForUser(userId, meta = {}) {
  const raw = base64url(crypto.randomBytes(32));
  const tokenHash = sha256(raw);
  const expiresAt = DateTime.utc().plus({ minutes: 60 }).toISO();

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, request_ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, meta.ip ?? null, meta.ua ?? null]
  );

  return raw;
}

/** Validates+consumes a reset token. Returns the user_id or null. */
async function consumeResetToken(rawToken) {
  const tokenHash = sha256(rawToken);

  const { rows } = await pool.query(
    `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
      WHERE token_hash = $1
      LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [row.id]
  );

  return row.user_id;
}

module.exports = { issueResetTokenForUser, consumeResetToken };