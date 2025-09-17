// server/db.js
const { Pool } = require('pg');
const url = require('url');

const { DATABASE_URL, NODE_ENV, FORCE_SSL } = process.env;

const isProd = NODE_ENV === 'production';
const isLocal = !isProd && !FORCE_SSL;

// Build pool with sensible defaults that avoid "hang forever"
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },

  // Connection behavior
  keepAlive: true,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 8_000),
});

// Basic visibility into background pool errors
pool.on('error', (err) => {
  console.error('[pg] pool error:', err.message);
});

// ---- Debug logging ----
try {
  const parsed = new url.URL(DATABASE_URL);
  const host = parsed.hostname;
  const dbName = parsed.pathname.replace('/', '');
  console.log(
    `📦 Connecting to Postgres @ ${host}/${dbName} | SSL: ${isLocal ? 'disabled' : 'enabled'}`
  );
} catch (err) {
  console.warn('⚠️ Could not parse DATABASE_URL for logging:', err.message);
}

/**
 * Run a function with a dedicated client.
 * Applies a per-session statement timeout so slow queries fail fast
 * instead of hanging the request forever.
 */
async function withClient(fn, { statementTimeoutMs = 15_000 } = {}) {
  const client = await pool.connect();
  try {
    // Fail slow statements instead of hanging routes.
    await client.query(
      `SET statement_timeout TO ${Number(statementTimeoutMs)}`
    );
    // Optional: protect long transactions as well
    await client.query(`SET idle_in_transaction_session_timeout TO 15000`);
    return await fn(client);
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.withClient = withClient;
