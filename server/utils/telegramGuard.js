// server/utils/telegramGuard.js
const pool = require('../db');

async function isTelegramEnabled(userId) {
  const { rows } = await pool.query(
    'SELECT telegram_enabled FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  return rows[0]?.telegram_enabled !== false; // default true
}

module.exports = { isTelegramEnabled };