// server/utils/coach.js
const pool = require('../db');

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

function short(s, n = 180) {
  if (!s) return '';
  const t = String(s).trim().replace(/\s+/g, ' ');
  return t.length <= n ? t : t.slice(0, n - 1) + '…';
}

/**
 * Pull weekly progress snapshot for a user across *all* goals.
 * tz is used to bucket "active days".
 */
async function getWeeklySnapshot(userId, tz = 'Etc/UTC') {
  const { rows: prog } = await pool.query(
    `
    with mt_done as (
      select m.id, m.completed_at
      from microtasks m
      join tasks t on t.id = m.task_id
      join subgoals sg on sg.id = t.subgoal_id
      join goals g on g.id = sg.goal_id
      where g.user_id = $1
        and m.status = 'done'
        and m.completed_at >= (now() at time zone 'utc') - interval '7 days'
    )
    select
      (select count(*) from mt_done)                                   as done_last_7,
      (select count(distinct (m.completed_at at time zone $2)::date)
         from mt_done m)                                               as active_days,
      (select count(*)
         from microtasks m
         join tasks t on t.id = m.task_id
         join subgoals sg on sg.id = t.subgoal_id
         join goals g on g.id = sg.goal_id
        where g.user_id = $1
          and coalesce(m.status,'todo') <> 'done')                     as open_micro
  `,
    [userId, tz]
  );

  const stats = prog[0] || { done_last_7: 0, active_days: 0, open_micro: 0 };

  const { rows: refl } = await pool.query(
    `
      select content
      from reflections
      where user_id = $1
      order by created_at desc
      limit 1
    `,
    [userId]
  );

  return {
    done: Number(stats.done_last_7 || 0),
    activeDays: Number(stats.active_days || 0),
    openMicro: Number(stats.open_micro || 0),
    lastReflection: refl[0]?.content || '',
  };
}

function tonePack(tone = 'friendly') {
  switch (tone) {
    case 'strict':
      return {
        yay: [
          'Good. That’s the standard—keep it.',
          'Solid execution. Next week, same focus.',
          'You showed discipline. Don’t let it slip.',
        ],
        meh: [
          'Some movement, but not enough. Schedule 2 concrete crumbs for the next 48h.',
          'Momentum beats intention. Pick one 10-minute task and do it today.',
          'Cut the noise. One crumb, then another.',
        ],
        stuck: [
          'No progress logged. Choose one tiny crumb and do it in the next hour.',
          'Stop waiting for perfect. 10 minutes now—go.',
          'Reset. Open the app and check off one microtask.',
        ],
      };
    case 'motivational':
      return {
        yay: [
          '🔥 You crushed it this week! Momentum looks great.',
          '👏 Consistency unlocked—keep stacking those crumbs.',
          '🌟 Love the pace. You’re building something real.',
        ],
        meh: [
          '⚡ You moved the needle—now let’s nudge it further.',
          '💪 Tiny steps compound. Queue two small crumbs for tomorrow.',
          '✨ You’re closer than you think. Pick one 10-minute action today.',
        ],
        stuck: [
          '💡 No worries—fresh week, fresh start. One tiny crumb now.',
          '🌱 Growth starts small. Try a 5-minute microtask to reboot.',
          '🤝 I’m with you—let’s pick one doable crumb today.',
        ],
      };
    default: // friendly
      return {
        yay: [
          'Nice work this week! Your consistency shows.',
          'Great progress—keep that rhythm going.',
          'Love the steady steps. You’re on track!',
        ],
        meh: [
          'You made some progress—let’s add a tiny push.',
          'Small steps add up. Try queuing two quick crumbs.',
          'You’re moving—let’s keep it gentle and steady.',
        ],
        stuck: [
          'Quiet week—totally okay. Let’s restart with one tiny crumb.',
          'No progress yet; how about 5 minutes on the easiest next step?',
          'We all have slow weeks. Pick one small action to warm up.',
        ],
      };
  }
}

/**
 * Build a weekly check-in text.
 * Pro users get coaching; Free users get a generic nudge.
 */
async function buildWeeklyCheckin({ user, tz = 'Etc/UTC' }) {
  const isPro = ACTIVE_STATUSES.has((user.plan_status || '').toLowerCase());

  if (!isPro) {
    return {
      pro: false,
      text:
        '🗓️ Weekly check-in\n\nHow did your week go?\n\nReply with a quick reflection. ' +
        'Want tone-aware coaching and personalized stats? Upgrade to Pro in Profile → Upgrade.',
    };
  }

  const { done, activeDays, openMicro, lastReflection } =
    await getWeeklySnapshot(user.id, tz || 'Etc/UTC');

  let band = 'stuck';
  if (done >= 8 || activeDays >= 5) band = 'yay';
  else if (done >= 2 || activeDays >= 2) band = 'meh';

  const pack = tonePack(user.tone || 'friendly');
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const header = '🗓️ Weekly check-in';
  const line = pick(pack[band]);

  const reflBit = lastReflection
    ? `\n\n🪞 Last note you left:\n“${short(lastReflection)}”`
    : '';

  const numbers = `\n\n📈 Last 7 days\n• ✅ Done: ${done}\n• 📅 Active days: ${activeDays}\n• ⏳ Open crumbs: ${openMicro}`;

  const nextSteps =
    band === 'yay'
      ? '\n\nNext: queue two crumbs for early in the week to keep momentum.'
      : band === 'meh'
        ? '\n\nNext: schedule two 10-minute crumbs for the next 48h.'
        : '\n\nNext: pick the easiest 5-minute crumb and do it today.';

  const ask =
    '\n\nReply with your reflection for this week—what worked, what didn’t, what you’ll try next?';

  return {
    pro: true,
    text: `${header}\n\n${line}${reflBit}${numbers}${nextSteps}${ask}`,
  };
}

module.exports = { buildWeeklyCheckin };
