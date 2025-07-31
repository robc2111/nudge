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
  const goalId = goalRes.rows[0]?.id || null;

  if (!goalId) {
    await sendMessage(chatId, "⚠️ You don’t have an active goal. Please create one in the app before submitting reflections.");
    return;
  }

  await pool.query(
    `INSERT INTO reflections (user_id, goal_id, content)
     VALUES ($1, $2, $3)`,
    [user.id, goalId, text]
  );

  await sendMessage(chatId, "✅ Your reflection has been saved. Keep up the great work!");
  return res.sendStatus(200);
}

    // 4. If Sunday evening, store weekly reflection
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

    // 5. Fallback reply
    const reply = `Hi ${user.name}, you said: "${text}"`;
    await sendMessage(chatId, reply);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;