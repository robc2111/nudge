// server/utils/aiUsageLogger.js
const pool = require('../db');

const COST_IN = Number(process.env.AI_COST_PER_1M_INPUT || 0.5); // $/1M input tokens
const COST_OUT = Number(process.env.AI_COST_PER_1M_OUTPUT || 1.5); // $/1M output tokens

function estimateCost(tokensIn, tokensOut) {
  const usdIn = (tokensIn / 1_000_000) * COST_IN;
  const usdOut = (tokensOut / 1_000_000) * COST_OUT;
  return Number((usdIn + usdOut).toFixed(6));
}

async function logOpenAIUsage({
  userId = null,
  event,
  model,
  tokensIn = 0,
  tokensOut = 0,
  costUsd = null,
  meta = {},
}) {
  try {
    const cost = costUsd ?? estimateCost(tokensIn, tokensOut);
    await pool.query(
      `INSERT INTO openai_usage (user_id, event, model, tokens_in, tokens_out, cost_usd, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, event, model, tokensIn, tokensOut, cost, meta]
    );
  } catch (e) {
    console.error('[openai-usage] insert failed:', e.message);
  }
}

module.exports = { logOpenAIUsage };
