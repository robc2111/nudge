//telegram.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../db');
const reflectionSessions = {}; // Temporary in-memory storage for reflect mode

function isWeeklyReflectionWindow() {
  const now = new Date();
  const weekday = now.getDay(); // Sunday = 0
  const hour = now.getHours();
  return weekday === 0 && hour >= 18 && hour <= 23;
}

const sendMessage = async (chatId, text) => {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  });
};

router.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const text = message.text.trim();

    console.log('✅ Incoming message:', JSON.stringify(message, null, 2));
    console.log('➡️ message.text:', text);

    // 1. Check DB for user
    const userCheck = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [chatId]);
    const user = userCheck.rows[0];

    if (!user) {
      const reply = `👋 Hi! It looks like you haven't registered yet.\n\nPlease [click here to register](https://goalcrumbs.com/signup) so Goalcrumbs can keep you on track!`;
      await sendMessage(chatId, reply);
      return res.sendStatus(200);
    }

    // 2. If user just sent /reflect, prompt them
    if (text.toLowerCase() === '/reflect') {
      console.log('📥 /reflect command received');
      reflectionSessions[chatId] = true;
      await sendMessage(chatId, "🪞 Please reply with your reflection. What went well, what didn’t, and what did you learn?");
      return res.sendStatus(200);
    }

    // 3. If user is expected to reply with a reflection
    if (reflectionSessions[chatId]) {
      reflectionSessions[chatId] = false;

      const goalRes = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = goalRes.rows.length ? goalRes.rows[0].id : null;

      if (!goalId) {
        await sendMessage(chatId, "⚠️ You don’t have an active goal. Please create one in the app before submitting reflections.");
        return res.sendStatus(200);
      }

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content)
         VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(chatId, "✅ Your reflection has been saved. Keep up the great work!");
      return res.sendStatus(200);
    }

    // 4. If Sunday evening, store weekly reflection automatically
    if (isWeeklyReflectionWindow()) {
      const goalRes = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = goalRes.rows[0]?.id || null;

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content) VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(chatId, "✅ Got it! Your reflection has been logged. See you next week.");
      return res.sendStatus(200);
    }

    // 5. Show active goals
    if (text.toLowerCase() === '/goals') {
      const activeGoals = await pool.query(
        `SELECT title FROM goals WHERE user_id = $1 AND status = 'in_progress'`,
        [user.id]
      );

      if (activeGoals.rows.length === 0) {
        await sendMessage(chatId, "📭 You don't have any active goals right now.");
      } else {
        const titles = activeGoals.rows.map(g => `🎯 ${g.title}`).join('\n');
        await sendMessage(chatId, `Here are your active goals:\n\n${titles}`);
      }

      return res.sendStatus(200);
    }

    // 6. Mark a microtask as done
    if (text.toLowerCase().startsWith('done')) {
      const microtaskTitle = text.slice(4).trim();

      const result = await pool.query(
        `SELECT mt.*, g.user_id
         FROM microtasks mt
         JOIN tasks t ON mt.task_id = t.id
         JOIN subgoals sg ON t.subgoal_id = sg.id
         JOIN goals g ON sg.goal_id = g.id
         WHERE mt.title ILIKE '%' || $1 || '%' AND g.telegram_id = $2
         LIMIT 1`,
        [microtaskTitle, telegramId]
      );

      const microtask = result.rows[0];

      if (!microtask) {
        await sendMessage(chatId, `⚠️ Microtask "${microtaskTitle}" not found.`);
        return res.sendStatus(200);
      }

      await pool.query(
        `UPDATE microtasks SET status = 'done' WHERE id = $1`,
        [microtask.id]
      );

      await sendMessage(chatId, `✅ Marked *"${microtask.title}"* as done! 🎉`);

      // 👉 Find and send next microtask
      const nextRes = await pool.query(`
        SELECT mt.*
        FROM microtasks mt
        JOIN tasks t ON mt.task_id = t.id
        JOIN subgoals sg ON t.subgoal_id = sg.id
        JOIN goals g ON sg.goal_id = g.id
        WHERE mt.status != 'done' AND g.telegram_id = $1
        ORDER BY mt.id
        LIMIT 1
      `, [telegramId]);

      const next = nextRes.rows[0];

      if (next) {
        await sendMessage(chatId, `👉 Next up: *${next.title}*`);
      } else {
        await sendMessage(chatId, `🎉 You’ve completed all your microtasks for now. Great work!`);
      }

      return res.sendStatus(200);
    }

    // 7. Help command
    if (text.toLowerCase() === '/help') {
      await sendMessage(chatId, `🤖 *Goalcrumbs Bot Help*
Here’s what I can do:

🪞 */reflect* – Log a weekly reflection  
🎯 */goals* – View your active goals  
✅ *done [task]* – Mark a microtask as done  
❓ */help* – Show this message`);
      return res.sendStatus(200);
    }

    // 8. Fallback reply
    const fallback = `Hi ${user.name}, I didn’t understand that command. 🤔

Try:
- *done plan meals*
- /reflect
- /goals
- /help`;
    await sendMessage(chatId, fallback);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;