//cron.js
require('dotenv').config(); // ✅ Load environment variables

const cron = require('node-cron');
const axios = require('axios');
const pool = require('./db');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

// 🔁 Daily nudge logic
const sendDailyNudge = async () => {
  console.log('⏰ Running daily nudge logic...');

  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const users = usersRes.rows;

    for (const user of users) {
      const res = await pool.query(`
        SELECT mt.id, mt.title AS microtask_title, g.title AS goal_name
        FROM microtasks mt
        JOIN tasks t ON mt.task_id = t.id
        JOIN subgoals sg ON t.subgoal_id = sg.id
        JOIN goals g ON sg.goal_id = g.id
        WHERE mt.status = 'in_progress' AND g.user_id = $1
        LIMIT 1
      `, [user.id]);

      const microtask = res.rows[0];
      if (!microtask) continue;

      const message = `🐭 Hey ${user.name || 'there'}! Today's task is:\n\n🎯 *${microtask.microtask_title}*\n🧁 From goal: ${microtask.goal_name}\n\nHave you done it? Reply ✅ or 💤`;

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
const sendWeeklyReflection = async () => {
  console.log('📆 Running weekly reflection logic...');

  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const users = usersRes.rows;

    for (const user of users) {
      const message = `
🪞 *Weekly Reflection Time*

1. What went well this week?
2. What could have gone better?
3. What did you learn?

Reply in your own words and I’ll log it.`;

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