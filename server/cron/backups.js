// server/cron/backups.js
const { exec } = require('node:child_process');
const fs = require('node:fs/promises');

function at(hhmm = '02:00') {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h, minute: m };
}

/**
 * Schedules a daily pg_dump -> gzip -> upload to S3 using aws cli.
 *
 * Env required:
 * - DATABASE_URL
 * - BACKUP_S3_BUCKET (e.g., s3://goalcrumbs-backups-prod/db)
 * - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION
 * Optional:
 * - BACKUP_WINDOW_UTC (e.g., "02:00")
 */
function scheduleDbBackups(cron) {
  const when = process.env.BACKUP_WINDOW_UTC || '02:00';
  const { hour, minute } = at(when);

  cron.schedule(
    `0 ${minute} ${hour} * * *`,
    async () => {
      try {
        await runBackup();
        console.log('[backup] ✅ completed');
      } catch (e) {
        console.error('[backup] ❌ failed:', e);
      }
    },
    { timezone: 'UTC' }
  );

  console.log(`[backup] scheduled daily at ${when} UTC`);
}

async function runBackup() {
  const url = process.env.DATABASE_URL;
  const bucket = process.env.BACKUP_S3_BUCKET; // e.g., s3://goalcrumbs-backups-prod/db
  if (!url) throw new Error('DATABASE_URL missing');
  if (!bucket) throw new Error('BACKUP_S3_BUCKET missing');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const localFile = `/tmp/goalcrumbs-${stamp}.sql.gz`;
  const s3uri = bucket.startsWith('s3://')
    ? `${bucket}/goalcrumbs-${stamp}.sql.gz`
    : `s3://${bucket}/goalcrumbs-${stamp}.sql.gz`;

  const dumpCmd = [
    `PGSSLMODE=require pg_dump "${url}"`,
    `--no-owner --no-privileges`,
    `| gzip > "${localFile}"`,
  ].join(' ');

  await sh(dumpCmd, { timeoutMs: 1000 * 60 * 10 }); // 10m
  await sh(`aws s3 cp "${localFile}" "${s3uri}" --only-show-errors`, {
    timeoutMs: 1000 * 60 * 5,
  });
  await fs.rm(localFile).catch(() => {});
  console.log(`[backup] uploaded ${s3uri}`);
}

function sh(cmd, { timeoutMs = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const p = exec(
      cmd,
      { env: process.env, maxBuffer: 1024 * 1024 * 32, timeout: timeoutMs },
      (err, stdout, stderr) => {
        if (err) return reject(Object.assign(err, { stdout, stderr, cmd }));
        resolve({ stdout, stderr });
      }
    );
    p.stdout?.pipe(process.stdout);
    p.stderr?.pipe(process.stderr);
  });
}

module.exports = { scheduleDbBackups, runBackup };
