//telegram.js
const express = require('express');
const axios = require('axios');
const router = express.Router(); // ✅ THIS LINE IS MISSING IN YOURS

const pool = require('../db'); // assuming you're using pg with Pool

router.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    console.log('✅ Incoming message:', message);

    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;

      // Check DB for existing user
      const userCheck = await pool.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [chatId]
      );

      let reply;

      if (userCheck.rows.length > 0) {
  const user = userCheck.rows[0];
  reply = `Hi ${user.name}, you said: "${text}"`;
} else {
  reply = `👋 Hi! It looks like you haven't registered yet.\n\nPlease [click here to register](https://yourwebsite.com/register) so Goalcrumbs can keep you on track!`;
}

      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
  chat_id: chatId,
  text: reply,
  parse_mode: "Markdown"
});
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;