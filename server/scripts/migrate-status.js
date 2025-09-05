// scripts/migrate-status.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
  const TRACKING_TABLE = 'public.pgmigrations';

  // 1) read migration files and strip ".js"
  const allFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();
  const all = allFiles.map(f => path.basename(f, '.js'));

  // 2) read applied names from pgmigrations
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query(`SELECT name FROM ${TRACKING_TABLE} ORDER BY run_on`);
  await client.end();

  const applied = rows.map(r => r.name).sort();

  // 3) compute sets
  const appliedSet = new Set(applied);
  const appliedFiles = all.filter(n => appliedSet.has(n));
  const pendingFiles = all.filter(n => !appliedSet.has(n));

  // 4) pretty print
  console.log(`📦 Migrations dir: ${MIGRATIONS_DIR}`);
  console.log(`🗃️  Tracking table: ${TRACKING_TABLE}\n`);

  console.log('✅ Applied:');
  if (appliedFiles.length === 0) {
    console.log('  (none)\n');
  } else {
    for (const n of appliedFiles) console.log(`  - ${n}.js`);
    console.log();
  }

  console.log('🕗 Pending:');
  if (pendingFiles.length === 0) {
    console.log('  (none)');
  } else {
    for (const n of pendingFiles) console.log(`  - ${n}.js`);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});