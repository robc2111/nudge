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

/** Only DM if we have a numeric chat id and the user hasn't disabled Telegram. */
function canDM(user) {
  const id = String(user?.telegram_id ?? '').trim();
  return /^[0-9]+$/.test(id) && user?.telegram_enabled !== false;
}

function bullets(list = []) {
  return list.map((s) => `• ${s}`).join('\n');
}

async function sendWelcomeOnRegister(user) {
  if (!canDM(user)) return;
  const name = escapeTgMarkdown(user.name || 'there');

  const text =
    `👋 Hi ${name}! Welcome to *GoalCrumbs*.\n\n` +
    `Here’s how to use Telegram with your goals:\n` +
    bullets([
      '* /today* — see your next microtasks',
      '* done* — pick a microtask to mark done (or `done 2` for #2)',
      '* /reflect* — log a quick weekly reflection',
      '* /tone* — change coach tone',
      '* /help* - view your options',
    ]) +
    `\n\nOpen your dashboard: https://goalcrumbs.com/dashboard`;

  await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown',
  });
}

async function sendGoalCreated(user, goal, nextMicros = []) {
  if (!canDM(user)) return;
  const g = escapeTgMarkdown(goal?.title || 'your goal');

  let text =
    `🎯 New goal set: *${g}*\n\n` +
    `I’ll remind you daily with the next microtasks. You can also use the following commands:\n` +
    bullets([
      '* /today* — view what’s next',
      '* done* — check one microtask off',
      '* /reflect* — capture learnings weekly',
    ]);

  if (nextMicros?.length) {
    const preview = nextMicros
      .slice(0, 3)
      .map((m) => `• ${escapeTgMarkdown(m.title)}`)
      .join('\n');
    text += `\n\nNext up:\n${preview}`;
  }

  await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown',
  });
}

async function sendGoalCompleted(user, goal) {
  if (!canDM(user)) return;
  const g = escapeTgMarkdown(goal?.title || 'your goal');

  const text =
    `🏁 *Goal completed!*\n` +
    `Huge congrats on finishing *${g}* 🎉\n\n` +
    `Take a minute to /reflect on what worked, then set your next goal when you’re ready.`;

  await sendTelegram({
    chat_id: user.telegram_id,
    text,
    parse_mode: 'Markdown',
  });
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
 * Escape Telegram Markdown (v1) specials we use: _, *, [, ], `
 */
function escapeTgMarkdown(s = '') {
  return String(s).replace(/([_*[\]`])/g, '\\$1');
}

/** If you ever switch parse_mode to 'HTML' */
function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Resilient Telegram call with retries and 429 handling */
async function callTelegram(method, payload) {
  const url = apiUrl(method);
  const maxAttempts = 4;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        timeout: 10000,
        validateStatus: (s) => s >= 200 && s < 500,
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
        const preview =
          typeof payload?.text === 'string' ? payload.text.slice(0, 300) : '';
        throw new Error(
          `Telegram error ${res.status}: ${JSON.stringify(
            res.data
          )} | preview="${preview}"`
        );
      }

      return res;
    } catch (err) {
      lastErr = err;
      const code = err.code || err.cause?.code;
      const networky = code && NETWORK_CODES.has(code);
      const looks5xx = /\b5\d{2}\b/.test(String(err.message || ''));
      if ((networky || looks5xx) && attempt < maxAttempts) {
        await sleep(attempt * 1000);
        continue;
      }
      break;
    }
  }

  throw lastErr;
}

/** Wrapper for sendMessage */
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

/** Edit message text */
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

/** ACK inline button tap */
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

/** Tone picker keyboard */
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
  escapeTgMarkdown,
  escapeHtml,
  sendWelcomeOnRegister,
  sendGoalCreated,
  sendGoalCompleted,
};
