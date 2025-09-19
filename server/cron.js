// server/cron.js
const path = require('path');
(function tryLoadEnvs() {
  try {
    require('dotenv').config({ path: path.resolve(__dirname, './.env') });
  } catch {
    // ignore if not found
  }
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  } catch {
    // ignore if not found
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
const { can, isPro } = require('./utils/plan');

const CRON_ENABLED = process.env.CRON_ENABLED !== 'false';
if (!CRON_ENABLED) console.log('[cron] disabled by CRON_ENABLED=false');

/* helpers */
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

/* idempotency: daily */
async function ensureDailyTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_nudges_sent (
      user_id uuid NOT NULL,
      sent_on date NOT NULL,
      PRIMARY KEY (user_id, sent_on)
    );
  `);
}
async function reserveDailySend(userId, tz) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const sentOn = DateTime.now().setZone(zone).toISODate();
  await ensureDailyTable();
  const { rowCount } = await pool.query(
    `INSERT INTO daily_nudges_sent (user_id, sent_on)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, sentOn]
  );
  return rowCount === 1;
}

/* daily nudge */
const DAILY_NUDGE_LOCAL_TIME = { hour: 8, minute: 0 };

async function sendDailyNudgeForUser(user) {
  if (!(await isTelegramEnabled(user.id))) return;
  const shouldSend = await reserveDailySend(user.id, user.timezone);
  if (!shouldSend) return;
  if (!can(user, 'dailyReminders')) return;

  const packs = await fetchNextAcrossGoals(user.id, { onlyInProgress: true });
  if (packs.length === 0) return;

  for (const p of packs) {
    try {
      await normalizeProgressByGoal(p.goal.id);
    } catch (e) {
      console.warn('[daily] normalize failed', e.message);
    }
  }

  const sections = packs
    .map(
      (p, i) => `*Goal ${i + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${renderChecklist(p.microtasks, p.nextIdx)}`
    )
    .join('\n\n— — —\n\n');

  const header = isPro(user)
    ? '🌞 *Good morning! Your tailored focus for today:*'
    : '🌞 *Good morning! Here’s your focus across your goals:*';

  const footer = isPro(user)
    ? 'Reply with:\n• `done [microtask words]`\n• /reflect for a personalized reflection'
    : 'Reply with:\n• `done [microtask words]`\n• /reflect to log a quick reflection';

  const proLine = isPro(user)
    ? '\n✨ _Personalized coaching active (Pro)_.'
    : '';
  const text = `${header}\n\n${sections}\n\n${footer}${proLine}`;

  await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown',
  });
  console.log(`[daily] sent to user ${user.id} (${packs.length} section(s))`);
}

/* weekly check-in */
const WEEKLY_LOCAL_TIME = { hour: 18, minute: 0 };
const WEEKLY_ISO_WEEKDAY = 7; // Sunday

async function sendWeeklyCheckins() {
  const { rows: users } = await pool.query(
    `SELECT id, name, email, telegram_id, timezone, plan, plan_status
       FROM users
      WHERE telegram_id IS NOT NULL
        AND telegram_enabled = TRUE`
  );
  let sent = 0;
  for (const u of users) {
    try {
      if (!isLocalWeeklyNow(u.timezone, WEEKLY_LOCAL_TIME, WEEKLY_ISO_WEEKDAY))
        continue;
      if (!can(u, 'weeklyCheckin')) continue;
      if (!(await isTelegramEnabled(u.id))) continue;

      const base = await buildWeeklyCheckin({
        user: u,
        tz: u.timezone || 'Etc/UTC',
      });
      const text = isPro(u)
        ? `${base.text}\n\n✨ _Personalized coaching active (Pro)_.`
        : base.text;

      const res = await sendTelegram({
        chat_id: u.telegram_id,
        text,
        parse_mode: 'Markdown',
      });

      try {
        const tgId = res?.data?.result?.message_id || null;
        await pool.query(
          `INSERT INTO weekly_prompts (user_id, goal_id, sent_at, telegram_message_id)
           VALUES ($1, NULL, NOW(), $2)`,
          [u.id, tgId]
        );
      } catch {
        // ignore if not found
      }
      sent++;
    } catch (e) {
      console.error('[weekly] failed for user', u.id, e.message);
    }
  }
  if (sent) console.log(`[weekly] Sent ${sent} weekly check-ins.`);
}

/* schedules */
if (CRON_ENABLED) {
  console.log('[cron] scheduling jobs…');

  cron.schedule('* * * * *', async () => {
    try {
      const { rows: users } = await pool.query(
        `SELECT id, name, telegram_id, timezone, plan, plan_status
           FROM users
          WHERE telegram_id IS NOT NULL
            AND telegram_enabled = TRUE`
      );
      for (const user of users) {
        if (isLocalTimeNow(user.timezone, DAILY_NUDGE_LOCAL_TIME)) {
          await sendDailyNudgeForUser(user).catch((e) =>
            console.error('Daily nudge error', e.message)
          );
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

module.exports = { sendWeeklyCheckins, sendDailyNudgeForUser };
