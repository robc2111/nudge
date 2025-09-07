// server/scripts/apply-users-softdelete.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();

  // 1) Add users.deleted_at (soft delete column)
  // 2) Make email unique only for non-deleted users (partial unique index)
  // 3) Mark the migration as applied in pgmigrations
  await c.query(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

    DO $$ BEGIN
      ALTER TABLE public.users DROP CONSTRAINT users_email_key;
    EXCEPTION WHEN undefined_object THEN
      -- constraint didn't exist; ignore
      NULL;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_active
      ON public.users (email)
      WHERE email IS NOT NULL AND deleted_at IS NULL;
  `);

  await c.query(
    `INSERT INTO public.pgmigrations(name, run_on)
     VALUES ($1, NOW())
     ON CONFLICT DO NOTHING`,
    ['1757065000000_add-users-deleted-at']
  );

  console.log('✅ Applied schema + marked migration as run');
  await c.end();
})().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
