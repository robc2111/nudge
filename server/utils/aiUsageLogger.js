// server/utils/aiUsageLogger.js
const { track } = require('./analytics');

/**
 * Lightweight OpenAI usage logger.
 * Writes into your existing analytics_events via track()
 * (no cookies, hashed IP if req provided).
 *
 * @param {Object} opts
 * @param {string|null} opts.userId
 * @param {string}       opts.event         e.g. 'chat.completions'
 * @param {string}       opts.model         e.g. 'gpt-4o-mini'
 * @param {number}       opts.tokensIn
 * @param {number}       opts.tokensOut
 * @param {number|null}  opts.costUsd
 * @param {Object}       opts.meta          any extra fields (request_id, route, etc)
 * @param {Object}       [opts.req]         optional Express req (for ip/ua/referrer)
 */
async function logOpenAIUsage({
  userId = null,
  event,
  model,
  tokensIn = 0,
  tokensOut = 0,
  costUsd = null,
  meta = {},
  req = null,
}) {
  // Store a concise, namespaced event
  const props = {
    model,
    tokens_in: Number(tokensIn) || 0,
    tokens_out: Number(tokensOut) || 0,
    cost_usd: typeof costUsd === 'number' ? costUsd : null,
    ...meta,
  };

  // Uses server/utils/analytics.js → inserts into analytics_events
  await track({
    req, // optional; if present we respect DNT & hash IP
    userId,
    event: `openai:${event}`,
    props,
    source: 'server',
  });
}

module.exports = { logOpenAIUsage };
