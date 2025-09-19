const pool = require('../db');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const EXPORT_BUCKET =
  process.env.S3_EXPORT_BUCKET || process.env.S3_BACKUP_BUCKET; // reuse if you want
const EXPORT_PREFIX = process.env.S3_EXPORT_PREFIX || 'exports';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

async function buildUserExport(userId) {
  // keep it simple: export the main tables keyed by user
  const [users, goals, subgoals, tasks, micro, reflections] = await Promise.all(
    [
      pool.query(
        `select id, name, email, created_at from users where id = $1`,
        [userId]
      ),
      pool.query(`select * from goals where user_id = $1`, [userId]),
      pool.query(
        `select t.* from subgoals t join goals g on t.goal_id=g.id where g.user_id = $1`,
        [userId]
      ),
      pool.query(
        `select t.* from tasks t join subgoals sg on t.subgoal_id=sg.id join goals g on sg.goal_id=g.id where g.user_id = $1`,
        [userId]
      ),
      pool.query(
        `select mt.* from microtasks mt
                join tasks t on mt.task_id=t.id
                join subgoals sg on t.subgoal_id=sg.id
                join goals g on sg.goal_id=g.id
                where g.user_id = $1`,
        [userId]
      ),
      pool.query(`select * from reflections where user_id = $1`, [userId]),
    ]
  );

  return {
    user: users.rows[0] || null,
    goals: goals.rows,
    subgoals: subgoals.rows,
    tasks: tasks.rows,
    microtasks: micro.rows,
    reflections: reflections.rows,
    generated_at: new Date().toISOString(),
    version: 1,
  };
}

async function kickOffExport({ userId, exportId }) {
  try {
    const payload = await buildUserExport(userId);
    const body = Buffer.from(JSON.stringify(payload, null, 2));
    const key = `${EXPORT_PREFIX}/${userId}/${exportId}.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: EXPORT_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      })
    );

    await pool.query(
      `update privacy_exports set status='ready', eta = now(), object_key = $2 where id = $1`,
      [exportId, key]
    );
  } catch (e) {
    await pool.query(
      `update privacy_exports set status='failed', eta = now() where id = $1`,
      [exportId]
    );
    throw e;
  }
}

module.exports = { kickOffExport };
