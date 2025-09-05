// server/scripts/test-migrations.js
/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); // <-- add this
const { Client } = require('pg');
const { spawn } = require('child_process');

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env },
    });
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

(async () => {
  const DB_URL = process.env.DATABASE_URL;
  if (!DB_URL || DB_URL === '...') {
    console.error('❌ DATABASE_URL is not set (or is a placeholder) in server/.env');
    process.exit(1);
  }

  const stamp = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 1e6);
  const SCHEMA = `_migrate_sandbox_${stamp}_${rand}`;
  const MIGR_TBL = `_pgm_${stamp}_${rand}`;

  console.log(`🧪 Using sandbox schema: ${SCHEMA}`);

  const client = new Client({ connectionString: DB_URL, statement_timeout: 60000 });
  await client.connect();

  try {
    console.log(`🏗️  Creating schema ${SCHEMA}...`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`);

    console.log(`⬆️  UP in ${SCHEMA}...`);
    await run('npx', [
      'node-pg-migrate',
      'up',
      '-m',
      './migrations',
      '--create-schema',
      '--schema',
      SCHEMA,
      '--migrations-table',
      MIGR_TBL,
      '--verbose',
      '--envPath',
      './.env'
    ], { PGM_SCHEMA: SCHEMA, PGM_MIGRATIONS_TBL: MIGR_TBL });

    console.log(`📋 STATUS in ${SCHEMA}:`);
    await run('node', ['scripts/migrate-status.js'], {
      PGM_SCHEMA: SCHEMA,
      PGM_MIGRATIONS_TBL: MIGR_TBL,
    });

    console.log(`⬇️  DOWN in ${SCHEMA}...`);
    await run('npx', [
      'node-pg-migrate',
      'down',
      '-m',
      './migrations',
      '--schema',
      SCHEMA,
      '--migrations-table',
      MIGR_TBL,
      '--verbose',
      '--envPath',
      './.env'
    ], { PGM_SCHEMA: SCHEMA, PGM_MIGRATIONS_TBL: MIGR_TBL });

    console.log(`🧹 Dropping schema ${SCHEMA}...`);
    await client.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE;`);

    console.log('✅ Test complete (up → status → down → drop).');
  } catch (e) {
    console.error('❌ migrate:test failed:', e.message);
    try { await client.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE;`); } catch {}
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();