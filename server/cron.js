//cron.js
const cron = require('node-cron');
const axios = require('axios');
const pool = require('./db'); // PostgreSQL pool
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

// 🕗 Run every day at 8:00 AM (server time)
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily nudge job...');

  try {
    // 1. Fetch all active users
    const usersRes = await pool.query('SELECT * FROM users');
    const users = usersRes.rows;

    for (const user of users) {
      // 2. Fetch their current in-progress microtask
      const res = await pool.query(`
        SELECT mt.id, mt.name, g.name AS goal_name 
        FROM microtasks mt
        JOIN tasks t ON mt.task_id = t.id
        JOIN subgoals sg ON t.subgoal_id = sg.id
        JOIN goals g ON sg.goal_id = g.id
        WHERE mt.status = 'in_progress' AND g.user_id = $1
        LIMIT 1
      `, [user.id]);

      const microtask = res.rows[0];

      if (!microtask) continue;

      // 3. Format and send Telegram message
      const message = `🐭 Hey ${user.name || 'there'}! Today's task is:\n\n🎯 *${microtask.name}*\n🧁 From goal: ${microtask.goal_name}\n\nHave you done it? Reply ✅ or 💤`;

      await axios.post(TELEGRAM_API, {
        chat_id: user.telegram_id,
        text: message,
        parse_mode: 'Markdown',
      });
    }
  } catch (err) {
    console.error('❌ Daily nudge error:', err.message);
  }
});

// 🗓️ Every Sunday at 6 PM
cron.schedule('0 18 * * 0', async () => {
  console.log('📆 Running weekly reflection prompt...');

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

      await axios.post(TELEGRAM_API, {
        chat_id: user.telegram_id,
        text: message,
        parse_mode: 'Markdown'
      });
    }
  } catch (err) {
    console.error('❌ Weekly reflection error:', err.message);
  }
});