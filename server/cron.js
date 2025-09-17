// server/cron.js

const path = require('path');

// Load envs quietly if present (no empty catch blocks)
(function tryLoadEnvs() {
  try {
    require('dotenv').config({ path: path.resolve(__dirname, './.env') });
  } catch (err) {
    if (process.env.DEBUG_CRON === '1')
      console.debug('[cron] ./.env not loaded:', err.message);
  }
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  } catch (err) {
    if (process.env.DEBUG_CRON === '1')
      console.debug('[cron] ../.env not loaded:', err.message);
  }
})();

const cron = require('node-cron');
const { DateTime } = require('luxon');

const pool = require('./db');
const { normalizeProgressByGoal } = require('./utils/progressUtils');
const {
  fetchNextAcrossGoals,
  renderChecklist,
} = require('./utils/goalHelpers');
const { sendTelegram } = require('./utils/telegram');
const { isTelegramEnabled } = require('./utils/telegramGuard');
const { buildWeeklyCheckin } = require('./utils/coach');

const CRON_ENABLED = process.env.CRON_ENABLED !== 'false';
if (!CRON_ENABLED) {
  console.log('[cron] disabled by CRON_ENABLED=false');
}

/* ──────────────────────────────
   Local-time windows
   ────────────────────────────── */
const DAILY_NUDGE_LOCAL_TIME = { hour: 8, minute: 0 }; // 08:00 local
const WEEKLY_LOCAL_TIME = { hour: 18, minute: 0 }; // 18:00 local
const WEEKLY_ISO_WEEKDAY = 7; // 1=Mon..7=Sun

function validZone(tz) {
  try {
    return Boolean(tz) && DateTime.local().setZone(tz).isValid;
  } catch {
    return false;
  }
}
function isLocalTimeNow(tz, { hour, minute }) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.hour === hour && now.minute === minute;
}
function isLocalWeeklyNow(tz, { hour, minute }, isoWeekday) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return (
    now.weekday === isoWeekday && now.hour === hour && now.minute === minute
  );
}

/* ──────────────────────────────
   Daily nudge (multi-goal)
   ────────────────────────────── */
async function sendDailyNudgeForUser(user) {
  if (!(await isTelegramEnabled(user.id))) return;

  const packs = await fetchNextAcrossGoals(user.id, { onlyInProgress: true });
  if (packs.length === 0) {
    console.log(
      `[daily] No pending work for user ${user.id} (${user.name}) — skipping.`
    );
    return;
  }

  for (const p of packs) {
    try {
      await normalizeProgressByGoal(p.goal.id);
    } catch (e) {
      console.warn(
        `[daily] normalizeProgressByGoal failed (goal ${p.goal.id}):`,
        e.message
      );
    }
  }

  const sections = packs
    .map(
      (p, i) => `*Goal ${i + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${renderChecklist(p.microtasks, p.nextIdx)}`
    )
    .join('\n\n— — —\n\n');

  const text = `🌞 *Good morning! Here’s your focus across all goals:*\n\n${sections}\n\nReply with:\n• \`done [microtask words]\` to check one off\n• /reflect to log a quick reflection`;

  await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown',
  });
  console.log(
    `[daily] Sent daily message to user ${user.id} with ${packs.length} section(s).`
  );
}

/* ──────────────────────────────
   Weekly check-in
   ────────────────────────────── */
async function sendWeeklyCheckins() {
  const { rows: users } = await pool.query(
    `select id, name, email, telegram_id, timezone, plan, plan_status
       from users
      where telegram_id is not null
        and telegram_enabled = true`
  );

  let sent = 0;
  for (const u of users) {
    try {
      if (!isLocalWeeklyNow(u.timezone, WEEKLY_LOCAL_TIME, WEEKLY_ISO_WEEKDAY))
        continue;
      if (!(await isTelegramEnabled(u.id))) continue;

      const msg = await buildWeeklyCheckin({
        user: u,
        tz: u.timezone || 'Etc/UTC',
      });

      const res = await sendTelegram({
        chat_id: u.telegram_id,
        text: msg.text,
        parse_mode: 'Markdown',
      });

      // Non-blocking: record prompt id
      try {
        const tgId = res?.data?.result?.message_id || null;
        await pool.query(
          `insert into weekly_prompts (user_id, goal_id, sent_at, telegram_message_id)
           values ($1, null, now(), $2)`,
          [u.id, tgId]
        );
      } catch (e) {
        if (process.env.DEBUG_CRON === '1')
          console.debug('[weekly] prompt record skipped:', e.message);
      }

      sent++;
    } catch (e) {
      console.error('[weekly] failed for user', u.id, e.message);
    }
  }
  if (sent) console.log(`[weekly] Sent ${sent} weekly check-ins.`);
}

/* ──────────────────────────────
   Cron schedules (every minute)
   ────────────────────────────── */
if (CRON_ENABLED) {
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
          try {
            await sendDailyNudgeForUser(user);
          } catch (err) {
            console.error(`Daily nudge error (user ${user.id}):`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('❌ Cron daily loop error:', err.message);
    }
  });

  cron.schedule('* * * * *', async () => {
    try {
      await sendWeeklyCheckins();
    } catch (err) {
      console.error('❌ Cron weekly loop error:', err.message);
    }
  });
}

/* ──────────────────────────────
   Manual one-off test (node server/cron.js)
   ────────────────────────────── */
if (require.main === module) {
  (async () => {
    console.log('🚨 Manual test run…');
    try {
      const { rows: users } = await pool.query(
        `SELECT id, name, telegram_id, timezone, plan, plan_status
           FROM users
          WHERE telegram_id IS NOT NULL AND telegram_enabled = true
          LIMIT 1`
      );
      if (users[0]) {
        await sendDailyNudgeForUser(users[0]);
        await sendWeeklyCheckins();
        console.log(
          '✅ Sent test daily + weekly messages for first Telegram user.'
        );
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

module.exports = { sendWeeklyCheckins, sendDailyNudgeForUser };
