// server/scripts/clean-pgmigrations.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // keep only the canonical baseline
  const keep = new Set(['00000000000000_baseline']);

  // fetch current rows
  const { rows } = await client.query(
    'SELECT name FROM public.pgmigrations ORDER BY run_on ASC'
  );

  const toDelete = rows
    .map(r => r.name)
    .filter(name =>
      // delete any probe or duplicate baselines or anything you removed
      name === '0001_probe' ||
      name.includes('baseline') && !keep.has(name) ||
      name === '1757051857404_add-reflections-table' // if it’s empty and you want a clean slate
    );

  if (toDelete.length === 0) {
    console.log('Nothing to delete. pgmigrations already clean.');
    await client.end();
    return;
  }

  console.log('Deleting from pgmigrations:', toDelete);
  await client.query(
    'DELETE FROM public.pgmigrations WHERE name = ANY($1)',
    [toDelete]
  );

  await client.end();
  console.log('Done.');
})();