//cron.js
require('dotenv').config(); // ✅ Load environment variables
const systemPrompts = require('./prompts');

const cron = require('node-cron');
const axios = require('axios');
const pool = require('./db');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

const gptSystemPrompts = {
  friendly: "You are a kind and supportive productivity coach. Your tone is friendly, gentle, and empathetic. Speak like a warm companion who encourages without pressure.",
  strict: "You are a no-nonsense productivity coach. Your tone is direct, disciplined, and results-oriented. Encourage users to stay on track with firm but respectful language.",
  motivational: "You are an upbeat, enthusiastic productivity coach. Your tone is energetic, motivating, and optimistic. Always look for wins and celebrate effort."
};

async function generateToneBasedMessage(tone, taskTitle) {
  const system = systemPrompts.telegramMessages.promptMap[tone] || systemPrompts.telegramMessages.promptMap["friendly"];
  const prompt = `The user is working on: "${taskTitle}". Write a short, 1-sentence check-in message to send via Telegram.`;

  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: systemPrompts.telegramMessages.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: systemPrompts.telegramMessages.temperature
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("GPT message error:", err.message);
    return "How’s it going with your task today? Let me know if you need support!";
  }
}

// 🔁 Daily nudge logic
const sendDailyNudge = async () => {
  console.log('⏰ Running daily nudge logic...');

  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const users = usersRes.rows;

    for (const user of users) {
      const res = await pool.query(`
  SELECT mt.id, mt.title AS microtask_title, g.title AS goal_title, g.tone
  FROM microtasks mt
  JOIN tasks t ON mt.task_id = t.id
  JOIN subgoals sg ON t.subgoal_id = sg.id
  JOIN goals g ON sg.goal_id = g.id
  WHERE mt.status = 'in_progress' AND g.user_id = $1
  LIMIT 1
`, [user.id]);

console.log(`📦 Microtask query result for ${user.name}:`, res.rows);
if (!res.rows.length) {
  console.log(`⚠️ No in-progress microtasks for ${user.name}`);
  continue;
}

      const microtask = res.rows[0];
      if (!microtask) continue;

      const toneMessage = await generateToneBasedMessage(
  microtask.tone,
  microtask.microtask_title
);

const message = `👋 Hey ${user.name || 'there'}!\n\n${toneMessage}\n\n🎯 Task: *${microtask.microtask_title}*\n🧁 From goal: ${microtask.goal_title}\n\nReply ✅ or 💤`;

      console.log(`📬 Sending nudge to ${user.name || user.id} (${user.telegram_id})`);

      try {
        await axios.post(TELEGRAM_API, {
          chat_id: user.telegram_id,
          text: message,
          parse_mode: 'Markdown',
        });
        console.log('✅ Sent successfully!');
      } catch (err) {
        console.error(`❌ Telegram error for ${user.telegram_id}:`, err.response?.data || err.message);
      }
    }
  } catch (err) {
    console.error('❌ Daily nudge error:', err.message);
  }
};

// 🔁 Weekly reflection logic
const getWeeklyReflectionMessage = (tone = 'friendly') => {
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

Shoot me your reflections! 🎯`
  };

  return prompts[tone] || prompts.friendly;
};

const sendWeeklyReflection = async () => {
  console.log('📆 Running weekly reflection logic...');

  try {
    //const usersRes = await pool.query('SELECT * FROM users');
    const usersRes = await pool.query('SELECT * FROM users WHERE telegram_id = $1', ['7118227053']);
    const users = usersRes.rows;

    for (const user of users) {
      const goalToneRes = await pool.query(`
  SELECT tone FROM goals
  WHERE user_id = $1 AND status = 'in_progress'
  LIMIT 1
`, [user.id]);

const tone = goalToneRes.rows[0]?.tone || 'friendly';
const message = getWeeklyReflectionMessage(tone);

      console.log(`📬 Sending reflection prompt to ${user.name || user.id} (${user.telegram_id})`);

      try {
        await axios.post(TELEGRAM_API, {
          chat_id: user.telegram_id,
          text: message,
          parse_mode: 'Markdown'
        });
        console.log('✅ Prompt sent!');
      } catch (err) {
        console.error(`❌ Telegram reflection error for ${user.telegram_id}:`, err.response?.data || err.message);
      }
    }
  } catch (err) {
    console.error('❌ Weekly reflection error:', err.message);
  }
};

// 🗓️ Production schedules
cron.schedule('0 8 * * *', sendDailyNudge);         // 8:00 AM daily
cron.schedule('0 18 * * 0', sendWeeklyReflection);  // 6:00 PM Sunday

// // 🧪 Rapid dev testing every minute
// if (process.env.NODE_ENV !== 'production') {
//   cron.schedule('* * * * *', async () => {
//     console.log('🧪 Running rapid test nudges...');
//     await sendDailyNudge();
//     await sendWeeklyReflection(); // Optional
//   });
// }

// 🧪 Manual trigger via `node cron.js`
if (require.main === module) {
  (async () => {
    console.log('🚨 Manual test run of nudges...');
    await sendDailyNudge();
    await sendWeeklyReflection();
    process.exit(0);
  })();
}