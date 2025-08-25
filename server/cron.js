//cron.js
// cron.js
require('dotenv').config();
const systemPrompts = require('./prompts');
const cron = require('node-cron');
const axios = require('axios');
const pool = require('./db');
const { DateTime } = require('luxon');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

// Local-time windows
const DAILY_NUDGE_LOCAL_TIME = { hour: 8,  minute: 0 };  // 08:00 local
const WEEKLY_LOCAL_TIME      = { hour: 18, minute: 0 };  // 18:00 local
const WEEKLY_ISO_WEEKDAY     = 7; // Luxon: 1=Mon ... 7=Sun

function validZone(tz) {
  try { return tz && DateTime.local().setZone(tz).isValid; } catch { return false; }
}
function isLocalTimeNow(tz, { hour, minute }) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.hour === hour && now.minute === minute;
}
function isLocalWeeklyNow(tz, { hour, minute }, isoWeekday /*1..7*/) {
  const zone = validZone(tz) ? tz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return now.weekday === isoWeekday && now.hour === hour && now.minute === minute;
}

const gptSystemPrompts = {
  friendly: 'You are a kind and supportive productivity coach. Your tone is friendly, gentle, and empathetic.',
  strict: 'You are a no-nonsense productivity coach. Your tone is direct, disciplined, and results-oriented.',
  motivational: 'You are an upbeat, enthusiastic productivity coach. Your tone is energetic, motivating, and optimistic.',
};

async function generateToneBasedMessage(tone, taskTitle) {
  const system = systemPrompts.telegramMessages.promptMap[tone] || systemPrompts.telegramMessages.promptMap.friendly;
  const prompt = `The user is working on: "${taskTitle}". Write a short, 1-sentence check-in message to send via Telegram.`;
  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: systemPrompts.telegramMessages.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 50,
      temperature: systemPrompts.telegramMessages.temperature,
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('GPT message error:', err.message);
    return 'How’s it going with your task today? Let me know if you need support!';
  }
}

// === data helpers ===
async function fetchCurrentTaskForUser(userId) {
  const taskRes = await pool.query(`
    SELECT t.id AS task_id, t.title AS task_title, g.title AS goal_title, g.tone
    FROM tasks t
    JOIN subgoals sg ON t.subgoal_id = sg.id
    JOIN goals g ON sg.goal_id = g.id
    WHERE g.user_id = $1
      AND EXISTS (SELECT 1 FROM microtasks mt WHERE mt.task_id = t.id AND mt.status != 'done')
    ORDER BY sg.id, t.id
    LIMIT 1
  `, [userId]);

  if (!taskRes.rows.length) return null;

  const task = taskRes.rows[0];
  const mtRes = await pool.query(`
    SELECT id, title, status
    FROM microtasks
    WHERE task_id = $1
    ORDER BY id
  `, [task.task_id]);

  let nextIdx = mtRes.rows.findIndex(m => m.status !== 'done');
  if (nextIdx === -1) nextIdx = null;

  return {
    taskId: task.task_id,
    taskTitle: task.task_title,
    goalTitle: task.goal_title,
    tone: task.tone || 'friendly',
    microtasks: mtRes.rows,
    nextIdx,
  };
}// cron.js (near your other helpers)
async function fetchReflectionsSinceLastWeeklyPrompt(user) {
  // Find the most recent weekly prompt we sent this user
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
    // Use the last prompt's sent_at as the window start (UTC)
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

  // Fallback: no prior weekly prompt recorded — use a 7-day window in user’s local tz
  const zone = validZone(user.timezone) ? user.timezone : 'Etc/UTC';
  const endLocal = DateTime.now().setZone(zone).endOf('day');
  const startLocal = endLocal.minus({ days: 6 }).startOf('day');
  const startUtc = startLocal.toUTC().toISO();

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

async function fetchWeeklyReflectionsForUser(user) {
  // compute the last 7 days in the user's timezone, then convert to UTC for querying
  const zone = validZone(user.timezone) ? user.timezone : 'Etc/UTC';
  const endLocal = DateTime.now().setZone(zone).endOf('day');
  const startLocal = endLocal.minus({ days: 6 }).startOf('day'); // inclusive 7-day window
  const startUtc = startLocal.toUTC().toISO();
  const endUtc = endLocal.toUTC().toISO();
  const tgRes = await axios.post(TELEGRAM_API, {
  chat_id: user.telegram_id,
  text: message,
  parse_mode: 'Markdown',
  reply_markup: { force_reply: true } // nudges user to reply to THIS message
});

const sent = tgRes.data?.result;
if (sent?.message_id) {
  await pool.query(
    `INSERT INTO weekly_prompts (user_id, telegram_message_id, sent_at)
     VALUES ($1, $2, NOW())`,
    [user.id, sent.message_id]
  );
}

  // Assumes a reflections table with (user_id, content, created_at, goal_id)
  // and optional join to goals for goal title (adjust columns if different)
  const { rows } = await pool.query(`
    SELECT r.content, r.created_at, g.title AS goal_title
    FROM reflections r
    LEFT JOIN goals g ON g.id = r.goal_id
    WHERE r.user_id = $1
      AND r.created_at >= $2
      AND r.created_at <= $3
    ORDER BY r.created_at ASC
  `, [user.id, startUtc, endUtc]);

  return rows;
}

function renderChecklist(microtasks, nextIdx) {
  return microtasks.map((m, i) => {
    const icon = m.status === 'done' ? '✅' : (i === nextIdx ? '🔸' : '⭕');
    return `${icon} ${m.title}`;
  }).join('\n');
}

// === per-user senders ===
async function sendDailyNudgeForUser(user) {
  const data = await fetchCurrentTaskForUser(user.id);
  if (!data) return;

  const toneHeaders = {
    friendly: '🌞 Good morning!',
    strict: '📋 Daily focus:',
    motivational: '🚀 Let’s make progress!',
  };
  const toneHeader = toneHeaders[data.tone] || toneHeaders.friendly;

  let toneMessage = '';
  try { toneMessage = await generateToneBasedMessage(data.tone, data.taskTitle); } catch {}

  const checklist = renderChecklist(data.microtasks, data.nextIdx);
  const message =
`${toneHeader}${toneMessage ? `\n\n${toneMessage}` : ''}

*Goal:* ${data.goalTitle}
*Task:* ${data.taskTitle}

*Microtasks:*
${checklist}

Reply with:
• \`done [microtask words]\` to check one off
• /reflect to log a quick reflection`;

  await axios.post(TELEGRAM_API, {
    chat_id: user.telegram_id,
    text: message,
    parse_mode: 'Markdown',
  });
}

// at top: keep existing requires
// const systemPrompts = require('./prompts');  // already present in your file

async function generateWeeklyReflectionMessage(tone = 'friendly', reflections = []) {
  try {
    const chatMessages = systemPrompts.weeklyCheckins.buildChat({ tone, reflections });
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: systemPrompts.weeklyCheckins.model,
      messages: chatMessages,
      max_tokens: 260,
      temperature: systemPrompts.weeklyCheckins.temperature,
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return res.data?.choices?.[0]?.message?.content?.trim()
      || '🪞 **Weekly Reflection**\n\n1) Biggest win this week?\n2) Biggest challenge?\n3) One lesson + next step.\n\nReply here with your answers.';
  } catch (err) {
    console.error('GPT weekly check-in error:', err.message);
    return '🪞 **Weekly Reflection**\n\n1) Biggest win this week?\n2) Biggest challenge?\n3) One lesson + next step.\n\nPlease reply to this message with your answers to 1–3 in one message.';
  }
}

async function sendWeeklyReflectionForUser(user) {
  const goalToneRes = await pool.query(`
    SELECT tone FROM goals
    WHERE user_id = $1 AND status = 'in_progress'
    LIMIT 1
  `, [user.id]);
  const tone = goalToneRes.rows[0]?.tone || 'friendly';

  // OLD:
  // const reflections = await fetchWeeklyReflectionsForUser(user);

  // NEW:
  const reflections = await fetchReflectionsSinceLastWeeklyPrompt(user);

  const message = await generateWeeklyReflectionMessage(tone, reflections);

  const tgRes = await axios.post(TELEGRAM_API, {
    chat_id: user.telegram_id,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: { force_reply: true }
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

async function sendWeeklyReflectionForUser(user) {
  // Find a tone based on an in-progress goal; fallback to friendly
  const goalToneRes = await pool.query(`
    SELECT tone FROM goals
    WHERE user_id = $1 AND status = 'in_progress'
    LIMIT 1
  `, [user.id]);

  const tone = goalToneRes.rows[0]?.tone || 'friendly';
  const message = await generateWeeklyReflectionMessage(tone);

  await axios.post(TELEGRAM_API, {
    chat_id: user.telegram_id,
    text: message,
    parse_mode: 'Markdown',
  });
}

// === cron gates (every minute) ===
cron.schedule('* * * * *', async () => {
  try {
    const { rows: users } = await pool.query(
      'SELECT id, name, telegram_id, timezone FROM users WHERE telegram_id IS NOT NULL'
    );
    for (const user of users) {
      if (isLocalTimeNow(user.timezone, DAILY_NUDGE_LOCAL_TIME)) {
        try { await sendDailyNudgeForUser(user); }
        catch (err) { console.error(`Daily nudge error ${user.id}:`, err.response?.data || err.message); }
      }
    }
  } catch (err) {
    console.error('❌ Cron daily loop error:', err.message);
  }
});

cron.schedule('* * * * *', async () => {
  try {
    const { rows: users } = await pool.query(
      'SELECT id, name, telegram_id, timezone FROM users WHERE telegram_id IS NOT NULL'
    );
    for (const user of users) {
      if (isLocalWeeklyNow(user.timezone, WEEKLY_LOCAL_TIME, WEEKLY_ISO_WEEKDAY)) {
        try { await sendWeeklyReflectionForUser(user); }
        catch (err) { console.error(`Weekly reflection error ${user.id}:`, err.response?.data || err.message); }
      }
    }
  } catch (err) {
    console.error('❌ Cron weekly loop error:', err.message);
  }
});

// Manual test
if (require.main === module) {
  (async () => {
    console.log('🚨 Manual test run (UTC time)…');
    try {
      const { rows: users } = await pool.query('SELECT id, name, telegram_id, timezone FROM users WHERE telegram_id IS NOT NULL LIMIT 1');
      if (users[0]) {
        await sendDailyNudgeForUser(users[0]);
        await sendWeeklyReflectionForUser(users[0]);
      } else {
        console.log('No users with telegram_id found.');
      }
    } finally {
      process.exit(0);
    }
  })();
}
