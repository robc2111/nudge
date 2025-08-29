// server/cron.js
// CommonJS (require) version – works with the rest of your server.
const path = require('path');
const tryLoad = (p) => { try { require('dotenv').config({ path: p }); } catch {} };
tryLoad(path.resolve(__dirname, './.env'));   // server/.env
tryLoad(path.resolve(__dirname, '../.env'));  // root .env (optional)

const cron = require('node-cron');
const { DateTime } = require('luxon');
const axios = require('axios');

const pool = require('./db');
const systemPrompts = require('./prompts');
const { normalizeProgressByGoal } = require('./utils/progressUtils');
const { fetchNextAcrossGoals, renderChecklist } = require('./utils/goalHelpers');
const { sendTelegram } = require('./utils/telegram');
const { isTelegramEnabled } = require('./utils/telegramGuard');

/* ──────────────────────────────
   Local-time windows
   ────────────────────────────── */
const DAILY_NUDGE_LOCAL_TIME = { hour: 8,  minute: 0 }; // 08:00 local
const WEEKLY_LOCAL_TIME      = { hour: 18, minute: 0 }; // 18:00 local
const WEEKLY_ISO_WEEKDAY     = 7;                       // 1=Mon..7=Sun

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
  // respect user's toggle
  if (!(await isTelegramEnabled(user.id))) return;

  const packs = await fetchNextAcrossGoals(user.id, { onlyInProgress: true });
  if (packs.length === 0) {
    console.log(`[daily] No pending work for user ${user.id} (${user.name}) — skipping daily message.`);
    return;
  }

  for (const p of packs) {
    try { await normalizeProgressByGoal(p.goal.id); }
    catch (e) { console.warn(`[daily] normalizeProgressByGoal failed (goal ${p.goal.id}):`, e.message); }
  }

  const sections = packs
    .map((p, i) => `*Goal ${i + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${renderChecklist(p.microtasks, p.nextIdx)}`)
    .join('\n\n— — —\n\n');

  const text = `🌞 *Good morning! Here’s your focus across all goals:*\n\n${sections}\n\nReply with:\n• \`done [microtask words]\` to check one off\n• /reflect to log a quick reflection`;

  await sendTelegram({ chat_id: user.telegram_id, text, parse_mode: 'Markdown' });
  console.log(`[daily] Sent daily message to user ${user.id} with ${packs.length} section(s).`);
}

/* ──────────────────────────────
   Weekly reflections – per goal
   ────────────────────────────── */

// Reflections since the last weekly prompt for this specific goal (or last 7 local days if none yet)
async function fetchReflectionsSinceLastWeeklyPromptForGoal(userId, goalId) {
  const { rows: promptRows } = await pool.query(
    `SELECT sent_at
       FROM weekly_prompts
      WHERE user_id = $1 AND goal_id = $2
      ORDER BY sent_at DESC
      LIMIT 1`,
    [userId, goalId]
  );

  const endUtcISO = DateTime.utc().toISO();

  if (promptRows[0]?.sent_at) {
    const startUtcISO = DateTime.fromJSDate(promptRows[0].sent_at).toUTC().toISO();
    const { rows } = await pool.query(
      `SELECT r.content, r.created_at, g.title AS goal_title
         FROM reflections r
         JOIN goals g ON g.id = r.goal_id
        WHERE r.user_id = $1
          AND r.goal_id = $2
          AND r.created_at >= $3 AND r.created_at <= $4
        ORDER BY r.created_at ASC`,
      [userId, goalId, startUtcISO, endUtcISO]
    );
    return rows;
  }

  // First weekly prompt for this goal → last 7 local days
  const { rows: userRows } = await pool.query(
    `SELECT timezone FROM users WHERE id = $1`,
    [userId]
  );
  const zone = userRows[0]?.timezone && validZone(userRows[0].timezone) ? userRows[0].timezone : 'Etc/UTC';
  const endLocal   = DateTime.now().setZone(zone).endOf('day');
  const startLocal = endLocal.minus({ days: 6 }).startOf('day');
  const startUtc   = startLocal.toUTC().toISO();

  const { rows } = await pool.query(
    `SELECT r.content, r.created_at, g.title AS goal_title
       FROM reflections r
       JOIN goals g ON g.id = r.goal_id
      WHERE r.user_id = $1
        AND r.goal_id = $2
        AND r.created_at >= $3 AND r.created_at <= $4
      ORDER BY r.created_at ASC`,
    [userId, goalId, startUtc, endUtcISO]
  );
  return rows;
}

// Completed microtasks for a given goal in the last N days
async function getCompletedMicrotasksLastNDaysForGoal(userId, goalId, days = 7) {
  const { rows } = await pool.query(
    `SELECT mt.title AS micro_title,
            COALESCE(mt.completed_at, mt.created_at, NOW()) AS done_at,
            g.title AS goal_title,
            t.title AS task_title
       FROM microtasks mt
       JOIN tasks t     ON t.id = mt.task_id
       JOIN subgoals sg ON sg.id = t.subgoal_id
       JOIN goals g     ON g.id = sg.goal_id
      WHERE g.user_id = $1
        AND g.id = $2
        AND mt.status = 'done'
        AND COALESCE(mt.completed_at, mt.created_at, NOW()) >= NOW() - INTERVAL '${days} days'
      ORDER BY done_at DESC
      LIMIT 25`,
    [userId, goalId]
  );
  return rows;
}

// Ask OpenAI to craft the weekly message for one goal (with retry)
async function openaiChatWithRetry(payload, max = 3) {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback message if OpenAI is disabled
    return {
      data: {
        choices: [{
          message: {
            content:
`🪞 **Weekly Reflection**

1) Biggest win this week?
2) Biggest challenge or setback?
3) One lesson + your next step for next week.

Reply here with your answers.`,
          }
        }]
      }
    };
  }

  let lastErr;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await axios.post(
        'https://api.openai.com/v1/chat/completions',
        payload,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 15000 }
      );
    } catch (e) {
      lastErr = e;
      const msg = e?.code || e?.message || '';
      console.warn(`[weekly/openai] attempt ${attempt} failed:`, msg);
      if (attempt < max) await new Promise(r => setTimeout(r, 1000 * attempt)); // 1s,2s,3s
    }
  }
  throw lastErr;
}

async function generateWeeklyReflectionMessageForGoal({ tone, reflections, completed }) {
  try {
    const messages = systemPrompts.weeklyCheckins.buildMessages({ tone, reflections, completed });
    const res = await openaiChatWithRetry({
      model: systemPrompts.weeklyCheckins.model,
      messages,
      max_tokens: 260,
      temperature: systemPrompts.weeklyCheckins.temperature,
    });
    return res.data?.choices?.[0]?.message?.content?.trim();
  } catch (err) {
    console.error('[weekly] OpenAI failed:', err?.code || err?.message || err);
    return '🪞 **Weekly Reflection**\n\n1) Biggest win this week?\n2) Biggest challenge?\n3) One lesson + next step.\n\nPlease reply with your answers.';
  }
}

// Send one weekly message **per in-progress goal**
async function sendWeeklyReflectionsPerGoal(user) {
  // respect user's toggle
  if (!(await isTelegramEnabled(user.id))) return;

  const { rows: goals } = await pool.query(
    `SELECT id, title, tone
       FROM goals
      WHERE user_id = $1 AND status = 'in_progress'
      ORDER BY created_at DESC`,
    [user.id]
  );
  if (!goals.length) return;

  for (const goal of goals) {
    const tone         = goal.tone || 'friendly';
    const reflections  = await fetchReflectionsSinceLastWeeklyPromptForGoal(user.id, goal.id);
    const completed    = await getCompletedMicrotasksLastNDaysForGoal(user.id, goal.id, 7);
    const body         = await generateWeeklyReflectionMessageForGoal({ tone, reflections, completed });
    const text         = `🎯 *${goal.title}*\n\n${body}`;

    const sent = await sendTelegram({
      chat_id: user.telegram_id,
      text,
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true },
    }).then(r => r.data?.result).catch(e => {
      console.error('Weekly Telegram send failed:', e.message);
      return null;
    });

    if (sent?.message_id) {
      await pool.query(
        `INSERT INTO weekly_prompts (user_id, goal_id, telegram_message_id, sent_at)
         VALUES ($1, $2, $3, NOW())`,
        [user.id, goal.id, sent.message_id]
      );
    }
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
        WHERE telegram_id IS NOT NULL
        AND telegram_enabled = true`
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
        WHERE telegram_id IS NOT NULL
        AND telegram_enabled = true`
    );
    for (const user of users) {
      if (isLocalWeeklyNow(user.timezone, WEEKLY_LOCAL_TIME, WEEKLY_ISO_WEEKDAY)) {
        try { await sendWeeklyReflectionsPerGoal(user); }
        catch (err) { console.error(`Weekly reflection error (user ${user.id}):`, err.message); }
      }
    }
  } catch (err) {
    console.error('❌ Cron weekly loop error:', err.message);
  }
});

/* ──────────────────────────────
   Manual one-off test (node server/cron.js)
   ────────────────────────────── */
if (require.main === module) {
  (async () => {
    console.log('🚨 Manual test run…');
    try {
      const { rows: users } = await pool.query(
        `SELECT id, name, telegram_id, timezone
           FROM users
          WHERE telegram_id IS NOT NULL AND telegram_enabled = true
          LIMIT 1`
      );
      if (users[0]) {
        await sendDailyNudgeForUser(users[0]);
        await sendWeeklyReflectionsPerGoal(users[0]); // per-goal
        console.log('✅ Sent test daily + per-goal weekly messages for first Telegram user.');
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