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

/**
 * Safe wrapper for Telegram sendMessage with a few retries and 429 handling.
 * Usage: sendTelegram({ chat_id, text, parse_mode, reply_markup })
 */
async function sendTelegram({ chat_id, text, parse_mode = 'Markdown', reply_markup } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id, text, parse_mode, ...(reply_markup ? { reply_markup } : {}) };

  const maxAttempts = 4;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        timeout: 10000,
        validateStatus: (s) => s >= 200 && s < 500, // treat 5xx as errors (retry)
      });

      // Rate-limited
      if (res.status === 429) {
        const retryAfter = res.data?.parameters?.retry_after ?? 2;
        if (attempt < maxAttempts) {
          await sleep((retryAfter + 0.5) * 1000);
          continue;
        }
        throw new Error(`Telegram 429 rate limit; retry_after=${retryAfter}s`);
      }

      // Other client errors
      if (res.status >= 400) {
        throw new Error(`Telegram error ${res.status}: ${JSON.stringify(res.data)}`);
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

module.exports = { sendTelegram };