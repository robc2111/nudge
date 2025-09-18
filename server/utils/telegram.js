// server/utils/telegram.js
const axios = require('axios');

const NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing');
  return token;
}

function apiUrl(method) {
  return `https://api.telegram.org/bot${getToken()}/${method}`;
}

/**
 * Generic resilient Telegram call with:
 * - network retries
 * - basic 5xx retries
 * - 429 retry_after handling
 */
async function callTelegram(method, payload) {
  const url = apiUrl(method);
  const maxAttempts = 4;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        timeout: 10000,
        validateStatus: (s) => s >= 200 && s < 500, // treat 5xx as errors (retry)
      });

      if (res.status === 429) {
        const retryAfter = res.data?.parameters?.retry_after ?? 2;
        if (attempt < maxAttempts) {
          await sleep((retryAfter + 0.5) * 1000);
          continue;
        }
        throw new Error(`Telegram 429 rate limit; retry_after=${retryAfter}s`);
      }

      if (res.status >= 400) {
        throw new Error(
          `Telegram error ${res.status}: ${JSON.stringify(res.data)}`
        );
      }

      return res; // success
    } catch (err) {
      lastErr = err;
      const code = err.code || err.cause?.code;
      const networky = code && NETWORK_CODES.has(code);
      const looks5xx = /\b5\d{2}\b/.test(String(err.message || ''));

      if ((networky || looks5xx) && attempt < maxAttempts) {
        await sleep(attempt * 1000); // backoff: 1s, 2s, 3s…
        continue;
      }
      break;
    }
  }

  throw lastErr;
}

/**
 * Safe wrapper for Telegram sendMessage with a few retries and 429 handling.
 * Usage: sendTelegram({ chat_id, text, parse_mode, reply_markup })
 */
async function sendTelegram({
  chat_id,
  text,
  parse_mode = 'Markdown',
  reply_markup,
} = {}) {
  const payload = { chat_id, text, parse_mode };
  if (reply_markup) payload.reply_markup = reply_markup;
  return callTelegram('sendMessage', payload);
}

/**
 * Edit an existing message (used to confirm tone selection in-place)
 * Usage: editTelegramMessage({ chat_id, message_id, text, parse_mode, reply_markup })
 */
async function editTelegramMessage({
  chat_id,
  message_id,
  text,
  parse_mode = 'Markdown',
  reply_markup,
} = {}) {
  const payload = { chat_id, message_id, text, parse_mode };
  if (reply_markup) payload.reply_markup = reply_markup;
  return callTelegram('editMessageText', payload);
}

/**
 * ACK a button tap so Telegram shows instant feedback (toast/spinner stops).
 * Usage: answerCallbackQuery({ callback_query_id, text, show_alert })
 */
async function answerCallbackQuery({
  callback_query_id,
  text,
  show_alert = false,
} = {}) {
  const payload = { callback_query_id };
  if (text) payload.text = text;
  if (show_alert) payload.show_alert = true;
  return callTelegram('answerCallbackQuery', payload);
}

/**
 * Inline keyboard for tone picker. `current` can be 'friendly' | 'strict' | 'motivational'
 */
function toneKeyboard(current) {
  const norm = String(current || '').toLowerCase();
  const row = (tone, label) => {
    const checked = norm === tone ? '✅ ' : '';
    return [{ text: `${checked}${label}`, callback_data: `tone:${tone}` }];
  };
  return {
    inline_keyboard: [
      row('friendly', '😊 Friendly'),
      row('strict', '💪 Strict'),
      row('motivational', '🚀 Motivational'),
    ],
  };
}

module.exports = {
  sendTelegram,
  editTelegramMessage,
  answerCallbackQuery,
  toneKeyboard,
};
