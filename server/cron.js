// cron.js
const path = require('path');
const tryLoad = (p) => { try { require('dotenv').config({ path: p }); } catch {} };
tryLoad(path.resolve(__dirname, './.env'));     // server/.env
tryLoad(path.resolve(__dirname, '../.env'));    // root .env (optional fallback)

const cron = require('node-cron');
const axios = require('axios');
const { DateTime } = require('luxon');

const pool = require('./db');
const systemPrompts = require('./prompts');
const { normalizeProgressByGoal } = require('./utils/progressUtils');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

/* ──────────────────────────────────────────────────────────────────────────
   Scheduling windows (local time per user)
   ────────────────────────────────────────────────────────────────────────── */
const DAILY_NUDGE_LOCAL_TIME = { hour: 8, minute: 0 };  // 08:00 local
const WEEKLY_LOCAL_TIME      = { hour: 18, minute: 0 }; // 18:00 local
const WEEKLY_ISO_WEEKDAY     = 7;                       // 1=Mon ... 7=Sun

function validZone(tz) {
  try { return tz && DateTime.local().setZone(tz).isValid; } catch { return false; }
}
function isLocalTimeNow(tz, { hour, minute }) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.hour === hour && now.minute === minute;
}
function isLocalWeeklyNow(tz, { hour, minute }, isoWeekday /* 1..7 */) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.weekday === isoWeekday && now.hour === hour && now.minute === minute;
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers for building daily messages across ALL in-progress goals
   ────────────────────────────────────────────────────────────────────────── */

/**
 * For a user, return an array of:
 *   { goal: {id,title}, task: {id,title}, microtasks: [{...}], nextIdx }
 * — one pack per in-progress goal, focusing on the first actionable task.
 */
async function fetchNextAcrossGoals(userId) {
  // Pick every goal that still has any unfinished microtasks
  const { rows: goals } = await pool.query(`
    SELECT g.id, g.title
    FROM goals g
    WHERE g.user_id = $1
      AND EXISTS (
        SELECT 1
        FROM subgoals sg
        JOIN tasks t      ON t.subgoal_id = sg.id
        JOIN microtasks mt ON mt.task_id = t.id
        WHERE sg.goal_id = g.id
          AND mt.status <> 'done'
      )
    ORDER BY g.created_at, g.id
  `, [userId]);

  const result = [];

  for (const g of goals) {
    // first subgoal under this goal that has any unfinished microtasks
    const { rows: sgs } = await pool.query(`
      SELECT sg.id
      FROM subgoals sg
      WHERE sg.goal_id = $1
        AND EXISTS (
          SELECT 1
          FROM tasks t
          JOIN microtasks mt ON mt.task_id = t.id
          WHERE t.subgoal_id = sg.id
            AND mt.status <> 'done'
        )
      ORDER BY sg.position NULLS LAST, sg.id
      LIMIT 1
    `, [g.id]);
    if (!sgs[0]) continue;

    // first task in that subgoal with unfinished microtasks
    const { rows: ts } = await pool.query(`
      SELECT t.id, t.title
      FROM tasks t
      WHERE t.subgoal_id = $1
        AND EXISTS (
          SELECT 1
          FROM microtasks mt
          WHERE mt.task_id = t.id
            AND mt.status <> 'done'
        )
      ORDER BY t.position NULLS LAST, t.id
      LIMIT 1
    `, [sgs[0].id]);
    if (!ts[0]) continue;

    // all microtasks for that task, ordered
    const { rows: mts } = await pool.query(`
      SELECT id, title, status
      FROM microtasks
      WHERE task_id = $1
      ORDER BY position NULLS LAST, id
    `, [ts[0].id]);

    let nextIdx = mts.findIndex(m => m.status !== 'done');
    if (nextIdx === -1) nextIdx = null;

    result.push({
      goal: g,
      task: ts[0],
      microtasks: mts,
      nextIdx
    });
  }

  return result;
}

function renderChecklist(microtasks, nextIdx) {
  return microtasks.map((m, i) => {
    const icon = m.status === 'done' ? '✅' : (i === nextIdx ? '🔸' : '⭕');
    return `${icon} ${m.title}`;
  }).join('\n');
}

/* ──────────────────────────────────────────────────────────────────────────
   Daily nudge (multi-goal)
   ────────────────────────────────────────────────────────────────────────── */

async function sendDailyNudgeForUser(user) {
  const packs = await fetchNextAcrossGoals(user.id);

  if (packs.length === 0) {
    console.log(`[daily] No pending work for user ${user.id} (${user.name}) — skipping daily message.`);
    return;
  }

  // (optional) normalize each goal so only one “active” node is in_progress
  for (const p of packs) {
    try { await normalizeProgressByGoal(p.goal.id); } catch (e) {
      console.warn(`[daily] normalizeProgressByGoal failed for goal ${p.goal.id}:`, e.message);
    }
  }

  const sections = packs.map((p, idx) => {
    const checklist = renderChecklist(p.microtasks, p.nextIdx);
    return `*Goal ${idx + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${checklist}`;
  }).join('\n\n— — —\n\n');

  const message =
`🌞 *Good morning! Here’s your focus across all goals:*

${sections}

Reply with:
• \`done [microtask words]\` to check one off
• /reflect to log a quick reflection`;

  await axios.post(TELEGRAM_API, {
    chat_id: user.telegram_id,
    text: message,
    parse_mode: 'Markdown',
  });

  console.log(`[daily] Sent daily message to user ${user.id} with ${packs.length} goal section(s).`);
}

/* ──────────────────────────────────────────────────────────────────────────
   Weekly reflections
   ────────────────────────────────────────────────────────────────────────── */

async function fetchReflectionsSinceLastWeeklyPrompt(user) {
  // last prompt time (UTC) for this user
  const { rows: promptRows } = await pool.query(
    `SELECT sent_at
     FROM weekly_prompts
     WHERE user_id = $1
     ORDER BY sent_at DESC
     LIMIT 1`,
    [user.id]
  );

  const endUtcISO = DateTime.utc().toISO();

  if (promptRows[0]?.sent_at) {
    const startUtcISO = DateTime.fromJSDate(promptRows[0].sent_at).toUTC().toISO();
    const { rows } = await pool.query(
      `SELECT r.content, r.created_at, g.title AS goal_title
       FROM reflections r
       LEFT JOIN goals g ON g.id = r.goal_id
       WHERE r.user_id = $1
         AND r.created_at >= $2
         AND r.created_at <= $3
       ORDER BY r.created_at ASC`,
      [user.id, startUtcISO, endUtcISO]
    );
    return rows;
  }

  // no prior prompt → use last 7 local days
  const zone = validZone(user.timezone) ? user.timezone : 'Etc/UTC';
  const endLocal   = DateTime.now().setZone(zone).endOf('day');
  const startLocal = endLocal.minus({ days: 6 }).startOf('day');
  const startUtc   = startLocal.toUTC().toISO();

  const { rows } = await pool.query(
    `SELECT r.content, r.created_at, g.title AS goal_title
     FROM reflections r
     LEFT JOIN goals g ON g.id = r.goal_id
     WHERE r.user_id = $1
       AND r.created_at >= $2
       AND r.created_at <= $3
     ORDER BY r.created_at ASC`,
    [user.id, startUtc, endUtcISO]
  );
  return rows;
}

async function generateWeeklyReflectionMessage(tone = 'friendly', reflections = []) {
  try {
    const chatMessages = systemPrompts.weeklyCheckins.buildChat({ tone, reflections });
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: systemPrompts.weeklyCheckins.model,
        messages: chatMessages,
        max_tokens: 260,
        temperature: systemPrompts.weeklyCheckins.temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return (
      res.data?.choices?.[0]?.message?.content?.trim() ||
      '🪞 **Weekly Reflection**\n\n1) Biggest win this week?\n2) Biggest challenge?\n3) One lesson + next step.\n\nReply here with your answers.'
    );
  } catch (err) {
    console.error('GPT weekly check-in error:', err.message);
    return '🪞 **Weekly Reflection**\n\n1) Biggest win this week?\n2) Biggest challenge?\n3) One lesson + next step.\n\nPlease reply to this message with your answers to 1–3 in one message.';
  }
}

async function sendWeeklyReflectionForUser(user) {
  // pick a tone from any in-progress goal
  const { rows: toneRows } = await pool.query(
    `SELECT tone
     FROM goals
     WHERE user_id = $1 AND status = 'in_progress'
     LIMIT 1`,
    [user.id]
  );
  const tone = toneRows[0]?.tone || 'friendly';

  const reflections = await fetchReflectionsSinceLastWeeklyPrompt(user);
  const message = await generateWeeklyReflectionMessage(tone, reflections);

  const tgRes = await axios.post(TELEGRAM_API, {
    chat_id: user.telegram_id,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: { force_reply: true }, // nudge replies to *this* message
  });

  const sent = tgRes.data?.result;
  if (sent?.message_id) {
    await pool.query(
      `INSERT INTO weekly_prompts (user_id, telegram_message_id, sent_at)
       VALUES ($1, $2, NOW())`,
      [user.id, sent.message_id]
    );
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   CRON SCHEDULES (every minute gates)
   ────────────────────────────────────────────────────────────────────────── */

cron.schedule('* * * * *', async () => {
  try {
    const { rows: users } = await pool.query(
      `SELECT id, name, telegram_id, timezone
       FROM users
       WHERE telegram_id IS NOT NULL`
    );
    for (const user of users) {
      if (isLocalTimeNow(user.timezone, DAILY_NUDGE_LOCAL_TIME)) {
        try {
          await sendDailyNudgeForUser(user);
        } catch (err) {
          console.error(`Daily nudge error (user ${user.id}):`, err.response?.data || err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Cron daily loop error:', err.message);
  }
});

cron.schedule('* * * * *', async () => {
  try {
    const { rows: users } = await pool.query(
      `SELECT id, name, telegram_id, timezone
       FROM users
       WHERE telegram_id IS NOT NULL`
    );
    for (const user of users) {
      if (isLocalWeeklyNow(user.timezone, WEEKLY_LOCAL_TIME, WEEKLY_ISO_WEEKDAY)) {
        try {
          await sendWeeklyReflectionForUser(user);
        } catch (err) {
          console.error(`Weekly reflection error (user ${user.id}):`, err.response?.data || err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Cron weekly loop error:', err.message);
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   Manual run (node cron.js)
   ────────────────────────────────────────────────────────────────────────── */
if (require.main === module) {
  (async () => {
    console.log('🚨 Manual test run…');
    try {
      const { rows: users } = await pool.query(
        `SELECT id, name, telegram_id, timezone
         FROM users
         WHERE telegram_id IS NOT NULL
         LIMIT 1`
      );
      if (users[0]) {
        await sendDailyNudgeForUser(users[0]);
        await sendWeeklyReflectionForUser(users[0]);
        console.log('✅ Sent test daily + weekly messages for first user with Telegram.');
      } else {
        console.log('ℹ️ No users with telegram_id found.');
      }
    } catch (e) {
      console.error('Manual test error:', e.message);
    } finally {
      process.exit(0);
    }
  })();
}