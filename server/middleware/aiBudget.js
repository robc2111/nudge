// server/middleware/aiBudget.js
const pool = require('../db');

const GLOBAL_DAILY = Number(process.env.AI_GLOBAL_DAILY_USD || 2);
const GLOBAL_MONTH = Number(process.env.AI_GLOBAL_MONTHLY_USD || 45);

const USER_DAILY = Number(process.env.AI_USER_DAILY_USD || 0.5);
const USER_MONTH = Number(process.env.AI_USER_MONTHLY_USD || 5);

async function spent(rangeSql, params) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(cost_usd),0)::numeric AS usd FROM openai_usage WHERE ${rangeSql}`,
    params
  );
  return Number(rows[0]?.usd || 0);
}

async function aiBudgetGuard(req, res, next) {
  try {
    const userId = req.user?.id || null;

    // Global caps
    const globalDay = await spent("created_at >= NOW() - interval '1 day'", []);
    if (globalDay >= GLOBAL_DAILY) {
      return res
        .status(429)
        .json({ error: 'AI daily budget exhausted (global)' });
    }
    const globalMonth = await spent(
      "date_trunc('month', created_at) = date_trunc('month', now())",
      []
    );
    if (globalMonth >= GLOBAL_MONTH) {
      return res
        .status(429)
        .json({ error: 'AI monthly budget exhausted (global)' });
    }

    // Per-user caps (only if we have a user)
    if (userId) {
      const userDay = await spent(
        "user_id = $1 AND created_at >= NOW() - interval '1 day'",
        [userId]
      );
      if (userDay >= USER_DAILY) {
        return res
          .status(429)
          .json({ error: 'Your AI daily budget is exhausted' });
      }
      const userMonth = await spent(
        "user_id = $1 AND date_trunc('month', created_at) = date_trunc('month', now())",
        [userId]
      );
      if (userMonth >= USER_MONTH) {
        return res
          .status(429)
          .json({ error: 'Your AI monthly budget is exhausted' });
      }
    }

    next();
  } catch (e) {
    console.error('[aiBudgetGuard] failed:', e.message);
    // Fail open to avoid blocking if DB is down
    next();
  }
}

module.exports = { aiBudgetGuard };
