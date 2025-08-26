// server/cron.js
const path = require('path');
const tryLoad = (p) => { try { require('dotenv').config({ path: p }); } catch {} };
tryLoad(path.resolve(__dirname, './.env'));   // server/.env
tryLoad(path.resolve(__dirname, '../.env'));  // root .env (optional)

const cron = require('node-cron');
const { DateTime } = require('luxon');
const pool = require('./db');
const systemPrompts = require('./prompts');
const { normalizeProgressByGoal } = require('./utils/progressUtils');
const { fetchNextAcrossGoals, renderChecklist } = require('./utils/goalHelpers');
const { sendTelegram } = require('./utils/telegram');

/* ──────────────────────────────
   Local-time windows
   ────────────────────────────── */
const DAILY_NUDGE_LOCAL_TIME = { hour: 8,  minute: 0 }; // 08:00 local
const WEEKLY_LOCAL_TIME      = { hour: 18, minute: 0 }; // 18:00 local
const WEEKLY_ISO_WEEKDAY     = 7; // 1=Mon..7=Sun

function validZone(tz) {
  try { return tz && DateTime.local().setZone(tz).isValid; } catch { return false; }
}
function isLocalTimeNow(tz, { hour, minute }) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.hour === hour && now.minute === minute;
}
function isLocalWeeklyNow(tz, { hour, minute }, isoWeekday) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.weekday === isoWeekday && now.hour === hour && now.minute === minute;
}

/* ──────────────────────────────
   Daily nudge (multi-goal)
   ────────────────────────────── */
async function sendDailyNudgeForUser(user) {
  // show next task for each *in-progress* goal
  const packs = await fetchNextAcrossGoals(user.id, { onlyInProgress: true });

  if (packs.length === 0) {
    console.log(`[daily] No pending work for user ${user.id} (${user.name}) — skipping daily message.`);
    return;
  }

  // Keep each goal tree tidy (single in_progress per level)
  for (const p of packs) {
    try { await normalizeProgressByGoal(p.goal.id); }
    catch (e) { console.warn(`[daily] normalizeProgressByGoal failed (goal ${p.goal.id}):`, e.message); }
  }

  const sections = packs
    .map((p, i) => `*Goal ${i + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${renderChecklist(p.microtasks, p.nextIdx)}`)
    .join('\n\n— — —\n\n');

  const message = `🌞 *Good morning! Here’s your focus across all goals:*\n\n${sections}\n\nReply with:\n• \`done [microtask words]\` to check one off\n• /reflect to log a quick reflection`;

  await sendTelegram({ chat_id: user.telegram_id, text: message });
  console.log(`[daily] Sent daily message to user ${user.id} with ${packs.length} section(s).`);
}

/* ──────────────────────────────
   Weekly reflections
   ────────────────────────────── */
async function fetchReflectionsSinceLastWeeklyPrompt(user) {
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
    const res = await require('axios').post(
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
  const { rows: tones } = await pool.query(
    `SELECT tone FROM goals
     WHERE user_id = $1 AND status = 'in_progress'
     LIMIT 1`,
    [user.id]
  );
  const tone = tones[0]?.tone || 'friendly';

  const reflections = await fetchReflectionsSinceLastWeeklyPrompt(user);
  const message = await generateWeeklyReflectionMessage(tone, reflections);

  const sent = await sendTelegram({
    chat_id: user.telegram_id,
    text: message,
    reply_markup: { force_reply: true },
  }).then(r => r.data?.result).catch(e => {
    console.error('Weekly Telegram send failed:', e.message);
    return null;
  });

  if (sent?.message_id) {
    await pool.query(
      `INSERT INTO weekly_prompts (user_id, telegram_message_id, sent_at)
       VALUES ($1, $2, NOW())`,
      [user.id, sent.message_id]
    );
  }
}

/* ──────────────────────────────
   Cron schedules (every minute)
   ────────────────────────────── */
cron.schedule('* * * * *', async () => {
  try {
    const { rows: users } = await pool.query(
      `SELECT id, name, telegram_id, timezone
       FROM users
       WHERE telegram_id IS NOT NULL`
    );
    for (const user of users) {
      if (isLocalTimeNow(user.timezone, DAILY_NUDGE_LOCAL_TIME)) {
        try { await sendDailyNudgeForUser(user); }
        catch (err) { console.error(`Daily nudge error (user ${user.id}):`, err.message); }
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
        try { await sendWeeklyReflectionForUser(user); }
        catch (err) { console.error(`Weekly reflection error (user ${user.id}):`, err.message); }
      }
    }
  } catch (err) {
    console.error('❌ Cron weekly loop error:', err.message);
  }
});

/* ──────────────────────────────
   Manual run
   ────────────────────────────── */
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