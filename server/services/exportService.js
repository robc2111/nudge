// server/services/exportService.js
// Minimal user-data export → S3 (JSON.gz) + presigned download link

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const zlib = require('zlib');
const nodeCrypto = require('node:crypto');
const nodemailer = require('nodemailer');
const pool = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || 'eu-west-2';
const BUCKET = process.env.S3_EXPORT_BUCKET || process.env.S3_BACKUP_BUCKET; // fallback to backup bucket
if (!BUCKET) {
  console.warn(
    '[export] S3_EXPORT_BUCKET/S3_BACKUP_BUCKET not set — uploads will fail.'
  );
}

const s3 = new S3Client({ region: AWS_REGION });

// ─────────────────────────────────────────────────────────────────────────────
// Build a simple JSON export for a user. Extend/trim the selects as you like.
// ─────────────────────────────────────────────────────────────────────────────
async function buildUserExport(userId) {
  const userQ = pool.query(
    `select id, email, name, timezone, plan, plan_status, created_at
       from users where id = $1`,
    [userId]
  );
  const goalsQ = pool.query(`select * from goals where user_id = $1`, [userId]);
  const subgoalsQ = pool.query(
    `select sg.* from subgoals sg
      join goals g on g.id = sg.goal_id
     where g.user_id = $1`,
    [userId]
  );
  const tasksQ = pool.query(
    `select t.* from tasks t
      join subgoals sg on sg.id = t.subgoal_id
      join goals g on g.id = sg.goal_id
     where g.user_id = $1`,
    [userId]
  );
  const microtasksQ = pool.query(
    `select m.* from microtasks m
      join tasks t on t.id = m.task_id
      join subgoals sg on sg.id = t.subgoal_id
      join goals g on g.id = sg.goal_id
     where g.user_id = $1`,
    [userId]
  );
  const reflectionsQ = pool.query(
    `select * from reflections where user_id = $1`,
    [userId]
  );

  const [user, goals, subgoals, tasks, microtasks, reflections] =
    await Promise.all([
      userQ,
      goalsQ,
      subgoalsQ,
      tasksQ,
      microtasksQ,
      reflectionsQ,
    ]);

  return {
    meta: {
      generated_at: new Date().toISOString(),
      version: 1,
    },
    user: user.rows[0] || null,
    goals: goals.rows,
    subgoals: subgoals.rows,
    tasks: tasks.rows,
    microtasks: microtasks.rows,
    reflections: reflections.rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload gzipped JSON to S3
// ─────────────────────────────────────────────────────────────────────────────
async function uploadGzipJson({
  bucket,
  key,
  json,
  downloadName = 'export.json.gz',
}) {
  // gzip synchronously to a Buffer (simple & reliable for small/medium payloads)
  const body = zlib.gzipSync(Buffer.from(json, 'utf8'));

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      ContentDisposition: `attachment; filename="${downloadName}"`,
    })
  );

  console.log(`[export] uploaded ${key} (${body.length} bytes gz)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a presigned GET URL for a previously uploaded export
// ─────────────────────────────────────────────────────────────────────────────
async function createAndSignUserExport({ s3Key, expiresIn = 3600 }) {
  if (!BUCKET) throw new Error('No S3 bucket configured for exports');
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // avoid noisy throws if verify fails — we already log a verify on boot
  await transporter.verify().catch(() => {});

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'GoalCrumbs <support@goalcrumbs.com>',
    to,
    subject,
    text,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Background job: build, gzip, upload, mark done, email presigned link
// Called by routes/privacy.js → kickOffExport({ userId, exportId })
// ─────────────────────────────────────────────────────────────────────────────
async function kickOffExport({ userId, exportId }) {
  if (!BUCKET) throw new Error('No S3 bucket configured for exports');

  const data = await buildUserExport(userId);
  const json = JSON.stringify(data);

  const keyId = `${exportId}-${nodeCrypto.randomUUID()}.json.gz`;
  const key = `exports/${userId}/${keyId}`;

  await uploadGzipJson({
    bucket: BUCKET,
    key,
    json,
    downloadName: `goalcrumbs-export-${userId}.json.gz`,
  });

  // move the row to 'done' state and set key/completed_at
  await pool.query(
    `update privacy_exports
        set status = 'done',
            s3_key = $2,
            completed_at = now()
      where id = $1`,
    [exportId, key]
  );

  // 24h signed URL + email
  const url = await createAndSignUserExport({
    s3Key: key,
    expiresIn: 24 * 3600,
  });

  const {
    rows: [u],
  } = await pool.query(`select email, name from users where id = $1`, [userId]);

  await sendMail({
    to: u.email,
    subject: 'Your GoalCrumbs data export is ready',
    text: `Download your export (expires in 24h): ${url}`,
    html: `
      <p>Your GoalCrumbs data export is ready.</p>
      <p><a href="${url}">Download your export</a> (link expires in 24 hours).</p>
    `,
  });

  return { key };
}

module.exports = {
  kickOffExport,
  createAndSignUserExport,
};
