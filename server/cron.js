const path = require('path');

// Load envs quietly
(function tryLoadEnvs() {
  try {
    require('dotenv').config({ path: path.resolve(__dirname, './.env') });
  } catch (err) {
    if (process.env.DEBUG_CRON === '1') {
      console.debug('[cron] ./.env not loaded:', err.message);
    }
  }
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  } catch (err) {
    if (process.env.DEBUG_CRON === '1') {
      console.debug('[cron] ../.env not loaded:', err.message);
    }
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
if (!CRON_ENABLED) console.log('[cron] disabled by CRON_ENABLED=false');

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */
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
   Idempotency: daily sends
   ────────────────────────────── */
async function ensureDailyTable() {
  await pool.query(`
    create table if not exists daily_nudges_sent (
      user_id uuid not null,
      sent_on date not null,
      primary key (user_id, sent_on)
    );
  `);
}
async function reserveDailySend(userId, tz) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const sentOn = DateTime.now().setZone(zone).toISODate();
  await ensureDailyTable();
  const { rowCount } = await pool.query(
    `insert into daily_nudges_sent (user_id, sent_on)
     values ($1, $2)
     on conflict do nothing`,
    [userId, sentOn]
  );
  return rowCount === 1;
}

/* ──────────────────────────────
   Daily nudge
   ────────────────────────────── */
const DAILY_NUDGE_LOCAL_TIME = { hour: 8, minute: 0 }; // 08:00 local
async function sendDailyNudgeForUser(user) {
  const shouldSend = await reserveDailySend(user.id, user.timezone);
  if (!shouldSend) return;
  if (!(await isTelegramEnabled(user.id))) return;

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

  const text = `🌞 *Good morning! Here’s your focus across all goals:*\n\n${sections}\n\nReply with:\n• \`done [microtask words]\`\n• /reflect`;
  await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown',
  });
  console.log(`[daily] sent to user ${user.id} (${packs.length} sections)`);
}

/* ──────────────────────────────
   Weekly check-in
   ────────────────────────────── */
const WEEKLY_LOCAL_TIME = { hour: 18, minute: 0 };
const WEEKLY_ISO_WEEKDAY = 7; // Sun
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

      try {
        const tgId = res?.data?.result?.message_id || null;
        await pool.query(
          `insert into weekly_prompts (user_id, goal_id, sent_at, telegram_message_id)
           values ($1, null, now(), $2)`,
          [u.id, tgId]
        );
      } catch {
        // best effort
      }
      sent++;
    } catch (e) {
      console.error('[weekly] failed for user', u.id, e.message);
    }
  }
  if (sent) console.log(`[weekly] sent ${sent} weekly prompts`);
}

/* ──────────────────────────────
   Deletion sweeper (hourly)
   ────────────────────────────── */
async function sweepDeletions() {
  const { rows } = await pool.query(
    `select user_id from privacy_deletes
      where status = 'pending' and now() >= eta`
  );

  for (const r of rows) {
    const uid = r.user_id;
    try {
      await pool.query('begin');

      // Delete child → parent to satisfy FKs
      await pool.query(`delete from reflections where user_id=$1`, [uid]);

      await pool.query(
        `delete from microtasks
         using tasks t, subgoals sg, goals g
         where microtasks.task_id=t.id
           and t.subgoal_id=sg.id
           and sg.goal_id=g.id
           and g.user_id=$1`,
        [uid]
      );

      await pool.query(
        `delete from tasks
         using subgoals sg, goals g
         where tasks.subgoal_id=sg.id
           and sg.goal_id=g.id
           and g.user_id=$1`,
        [uid]
      );

      await pool.query(
        `delete from subgoals
         using goals g
         where subgoals.goal_id=g.id
           and g.user_id=$1`,
        [uid]
      );

      await pool.query(`delete from goals where user_id=$1`, [uid]);
      await pool.query(`delete from privacy_exports where user_id=$1`, [uid]);
      await pool.query(`delete from privacy_deletes where user_id=$1`, [uid]);
      await pool.query(`delete from users where id=$1`, [uid]);

      await pool.query('commit');
      console.log('[delete] hard-deleted user', uid);
    } catch (e) {
      await pool.query('rollback');
      console.error('[delete] failed for', uid, e.message);
    }
  }
}

/* ──────────────────────────────
   Schedules
   ────────────────────────────── */
if (CRON_ENABLED) {
  console.log('[cron] scheduling jobs…');

  // Every minute: check if a user's local time is 08:00
  cron.schedule('* * * * *', async () => {
    try {
      const { rows: users } = await pool.query(
        `select id, name, telegram_id, timezone
           from users
          where telegram_id is not null
            and telegram_enabled = true`
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

  // Every minute: weekly check-in window
  cron.schedule('* * * * *', async () => {
    try {
      await sendWeeklyCheckins();
    } catch (err) {
      console.error('❌ Cron weekly loop error:', err.message);
    }
  });

  // Hourly: deletion sweeper
  cron.schedule('0 * * * *', () => {
    sweepDeletions().catch((e) => console.error('[cron delete]', e.message));
  });
}

/* ──────────────────────────────
   Manual test (node server/cron.js)
   ────────────────────────────── */
if (require.main === module) {
  (async () => {
    console.log('🚨 Manual test run…');
    try {
      const { rows: users } = await pool.query(
        `select id, name, telegram_id, timezone
           from users
          where telegram_id is not null
            and telegram_enabled = true
          limit 1`
      );
      if (users[0]) {
        await sendDailyNudgeForUser(users[0]);
        await sendWeeklyCheckins();
        console.log('✅ Sent test daily + weekly.');
      } else {
        console.log('ℹ️ No Telegram users found.');
      }
    } catch (e) {
      console.error('Manual test error:', e.message);
    } finally {
      process.exit(0);
    }
  })();
}

module.exports = { sendWeeklyCheckins, sendDailyNudgeForUser, sweepDeletions };
