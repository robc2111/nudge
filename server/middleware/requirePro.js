// requirePro.js
// middleware/requirePro.js
const pool = require('../db');

module.exports = async function requirePro(req, res, next) {
  try {
    const me = await pool.query('SELECT plan, plan_status FROM users WHERE id = $1', [req.user.id]);
    const { plan, plan_status } = me.rows[0] || {};
    if (plan === 'pro' && plan_status === 'active') return next();
    return res.status(402).json({ error: 'Pro plan required' }); // 402 Payment Required
  } catch (e) {
    console.error('requirePro error', e.message);
    res.status(500).json({ error: 'Internal error' });
  }
};