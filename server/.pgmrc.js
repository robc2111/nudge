// server/.pgmrc.js
/**
 * node-pg-migrate config.
 * Docs: https://salsita.github.io/node-pg-migrate/
 *
 * We purposely keep this minimal and rely on env:
 *   - DATABASE_URL       (required)
 *   - PGM_SCHEMA         (optional; used by test script)
 *   - PGM_MIGRATIONS_TBL (optional)
 */
const path = require('path');

const migrationsTable =
  process.env.PGM_MIGRATIONS_TBL || '_pgmigrations';

const schema =
  process.env.PGM_SCHEMA || 'public';

module.exports = {
  // Directory with migration files:
  dir: path.join(__dirname, 'migrations'),

  // Table used to track applied migrations:
  migrationsTable,

  // Target schema (can be overridden by env in test)
  schema,

  // Database URL (same one your app uses)
  databaseUrl: process.env.DATABASE_URL,

  // Run in a single connection/transaction per migration step
  // (matches your npm scripts’ "-j 1")
  count: 1,

  // Use JS migrations
  // (You can also add SQL migrations if you prefer)
  extension: 'js',
};