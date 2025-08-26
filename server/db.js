// server/db.js
const { Pool } = require('pg');
const url = require('url');

const isLocal = process.env.NODE_ENV !== 'production' && !process.env.FORCE_SSL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// ---- Debug logging ----
try {
  const parsed = new url.URL(process.env.DATABASE_URL);
  const host = parsed.hostname;
  const dbName = parsed.pathname.replace('/', '');
  console.log(
    `📦 Connecting to Postgres @ ${host}/${dbName} | SSL: ${isLocal ? 'disabled' : 'enabled'}`
  );
} catch (err) {
  console.warn('⚠️ Could not parse DATABASE_URL for logging:', err.message);
}

module.exports = pool;