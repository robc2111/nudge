// server/utils/telegramAccount.js
const pool = require('../db');
const { sendTelegram } = require('./telegram');

async function sendFarewellIfPossible(user) {
  try {
    if (!user?.telegram_id) return;

    const firstName = (user.name || '').split(' ')[0] || 'there';
    const text =
      `👋 Hey ${firstName},\n\n` +
      `Your GoalCrumbs account has been deleted. Thanks for giving us a try!\n\n` +
      `If you ever come back, just create a new account and /start again. Wishing you all the best with your goals. 💛`;

    await sendTelegram({
      chat_id: user.telegram_id,
      text,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.warn('[delete] Telegram farewell failed:', err.message);
  }
}

async function forgetTelegramForUser(userId) {
  await pool.query(
    `UPDATE public.users
        SET telegram_id = NULL,
            telegram_enabled = FALSE,
            updated_at = NOW()
      WHERE id = $1`,
    [userId]
  );

  const optionalDeletes = [
    `DELETE FROM telegram_sessions WHERE user_id = $1`,
    `DELETE FROM weekly_prompts WHERE user_id = $1`,
    `DELETE FROM telegram_incoming WHERE user_id = $1`,
  ];

  for (const sql of optionalDeletes) {
    try {
      await pool.query(sql, [userId]);
    } catch {
      /* ignore table-not-found or similar */
    }
  }
}

module.exports = {
  sendFarewellIfPossible,
  forgetTelegramForUser,
};
