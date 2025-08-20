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

function getWeeklyReflectionMessage(tone = 'friendly') {
  const prompts = {
    friendly: `
🪞 *Weekly Reflection Time*  

Hey there 😊 Let’s gently reflect on your week:

1. What went well?  
2. What could have gone better?  
3. What did you learn?

No pressure — just reply whenever you’re ready. 💬`,
    strict: `
📋 *Weekly Review*  

Time to audit your progress. Be honest and objective:  

1. Wins this week?  
2. Weaknesses or setbacks?  
3. What lessons will guide next week?

Reply directly and stay accountable.`,
    motivational: `
🚀 *Weekly Victory Lap!*  

Look at you go! Let’s celebrate and grow:  

1. What made you proud?  
2. What challenged you?  
3. What will you build on next?

Shoot me your reflections! 🎯`,
  };
  return prompts[tone] || prompts.friendly;
}

async function sendWeeklyReflectionForUser(user) {
  const goalToneRes = await pool.query(`
    SELECT tone FROM goals
    WHERE user_id = $1 AND status = 'in_progress'
    LIMIT 1
  `, [user.id]);
  const tone = goalToneRes.rows[0]?.tone || 'friendly';
  const message = getWeeklyReflectionMessage(tone);

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
