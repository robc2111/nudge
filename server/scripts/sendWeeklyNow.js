// server/scripts/sendWeeklyNow.js
require('dotenv').config({ path: 'server/.env' }); // keep if your env is here
require('dotenv').config(); // also load root .env if present

const pool = require('../db');
const { sendTelegram } = require('../utils/telegram');
const { getClient } = require('../utils/openai');
const weeklyCheckins = require('../prompts/weeklyCheckins');

(async function run() {
  const client = getClient();

  // ---- Pick the user to send to ----
  // Prefer argv user id, else fallback to your own UUID
  const userId = process.argv[2] || 'a2cab585-a9d4-4042-9615-ec56f838eb6d';

  // Verify Telegram is linked
  const { rows: userRows } = await pool.query(
    `select id, name, telegram_id, telegram_enabled from users where id = $1 limit 1`,
    [userId]
  );
  const user = userRows[0];
  if (!user) throw new Error('User not found');
  if (!user.telegram_id) throw new Error('User has no telegram_id linked');
  if (user.telegram_enabled === false) {
    console.warn('Warning: telegram_enabled is false — sending anyway.');
  }

  // Tone from the most recently created active goal (if any)
  const { rows: goalRows } = await pool.query(
    `select id, title,
            coalesce(nullif(trim(tone::text), ''), 'friendly') as tone
       from goals
      where user_id = $1 and status = 'in_progress'
      order by created_at desc nulls last
      limit 1`,
    [userId]
  );
  const activeGoal = goalRows[0] || null;
  const tone = activeGoal?.tone || 'friendly';

  // Reflections in last 7 days
  const { rows: reflections } = await pool.query(
    `select r.created_at, g.title as goal_title, r.content
       from reflections r
       left join goals g on g.id = r.goal_id
      where r.user_id = $1
        and r.created_at > now() - interval '7 days'
      order by r.created_at desc
      limit 50`,
    [userId]
  );

  // Completed microtasks in last 7 days
  const { rows: completed } = await pool.query(
    `select
        mt.completed_at as done_at,
        g.title as goal_title,
        t.title as task_title,
        mt.title as micro_title
       from microtasks mt
       join tasks t     on t.id  = mt.task_id
       join subgoals sg on sg.id = t.subgoal_id
       join goals g     on g.id  = sg.goal_id
      where g.user_id = $1
        and mt.status = 'done'
        and mt.completed_at > now() - interval '7 days'
      order by mt.completed_at desc
      limit 50`,
    [userId]
  );

  // Build the model prompt
  const messages = weeklyCheckins.buildMessages({
    tone,
    reflections,
    completed,
  });

  // Call OpenAI for the weekly text
  const completion = await client.chat.completions.create({
    model: weeklyCheckins.model,
    messages,
    temperature: weeklyCheckins.temperature,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty AI weekly message');

  // Send to Telegram
  const tgRes = await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown', // prompt already asks for Markdown (not v2)
  });

  const messageId = tgRes?.data?.result?.message_id ?? null;

  // Log in weekly_prompts (optional but nice)
  try {
    await pool.query(
      `insert into weekly_prompts (user_id, goal_id, sent_at, telegram_message_id)
       values ($1, $2, now(), $3)`,
      [userId, activeGoal?.id || null, messageId]
    );
  } catch (e) {
    console.warn('Could not insert weekly_prompts row:', e.message);
  }

  console.log(
    '✅ Sent weekly check-in to',
    user.name || userId,
    'message_id=',
    messageId
  );
  process.exit(0);
})().catch((err) => {
  console.error('❌ sendWeeklyNow failed:', err.response?.data || err.message);
  process.exit(1);
});
