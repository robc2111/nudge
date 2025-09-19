// server/controllers/paymentsController.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});
const pool = require('../db');
const { limitsFor } = require('../utils/plan');

const APP_BASE = process.env.APP_BASE_URL || 'http://localhost:5173';

/** Ensure we have a valid Stripe customer in the current mode. */
async function ensureStripeCustomer(user) {
  if (user.stripe_customer_id) {
    try {
      await stripe.customers.retrieve(user.stripe_customer_id);
      return user.stripe_customer_id;
    } catch (e) {
      console.warn('[stripe] stored customer invalid:', e.message);
    }
  }

  let custId = null;
  if (user.email) {
    const { data } = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (data[0]) custId = data[0].id;
  }
  if (!custId) {
    const created = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { app_user_id: String(user.id) },
    });
    custId = created.id;
  }
  await pool.query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [
    custId,
    user.id,
  ]);
  return custId;
}

/** Enforce plan’s active-goal cap (prefers keep_active_goal_id). */
async function enforceGoalLimitForPlan(userId, plan) {
  const { activeGoals: limit } = limitsFor(plan);
  if (limit >= 9999) return;

  const { rows: prefRows } = await pool.query(
    `SELECT keep_active_goal_id FROM users WHERE id = $1`,
    [userId]
  );
  const preferredId = prefRows[0]?.keep_active_goal_id || null;

  const { rows: activeRows } = await pool.query(
    `SELECT id
       FROM goals
      WHERE user_id = $1 AND status = 'in_progress'
      ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  if (!activeRows.length) return;

  let ordered = activeRows.map((r) => r.id);
  if (preferredId && ordered.includes(preferredId)) {
    ordered = [preferredId, ...ordered.filter((id) => id !== preferredId)];
  }

  const keep = ordered.slice(0, limit);
  const demote = ordered.slice(limit);

  if (demote.length) {
    await pool.query(
      `UPDATE goals SET status = 'not_started'
        WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [userId, demote]
    );
  }
  if (keep.length) {
    await pool.query(
      `UPDATE goals SET status = 'in_progress'
        WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [userId, keep]
    );
  }
}

/** Promo window (UTC). */
function withinPromoWindow() {
  const cutoff = new Date(
    process.env.PROMO_CUTOFF_UTC || '2025-10-31T23:59:59Z'
  ).getTime();
  return Number.isFinite(cutoff) && Date.now() <= cutoff;
}

/** POST /api/payments/checkout -> { url } */
async function checkout(req, res) {
  try {
    const priceStandard =
      process.env.STRIPE_PRICE_PRO_GBP || process.env.STRIPE_PRICE_MONTHLY;
    const pricePromo = process.env.STRIPE_PRICE_PROMO_OCT2025_GBP;
    const priceId =
      withinPromoWindow() && pricePromo ? pricePromo : priceStandard;
    if (!priceId)
      return res.status(500).json({ error: 'Stripe price not configured' });

    const { rows } = await pool.query(
      `SELECT id, email, name, stripe_customer_id FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = await ensureStripeCustomer(user);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      success_url: `${APP_BASE}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE}/billing/cancel`,
      metadata: { user_id: String(user.id) },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err?.message || err);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
}

/** POST /api/payments/portal -> { url } */
async function portalLink(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, stripe_customer_id FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = await ensureStripeCustomer(user);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_BASE}/profile`,
    });

    res.json({ url: portal.url });
  } catch (err) {
    console.error('portalLink error:', err?.message || err);
    res.status(500).json({ error: 'Could not create portal session' });
  }
}

/** POST /api/payments/sync-plan -> { ok } */
async function syncPlanForMe(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, plan FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    const me = rows[0];
    if (!me) return res.status(404).json({ error: 'User not found' });

    await enforceGoalLimitForPlan(me.id, me.plan || 'free');
    res.json({ ok: true });
  } catch (e) {
    console.error('syncPlanForMe error:', e.message);
    res.status(500).json({ error: 'Failed to sync plan/goal limits' });
  }
}

/** POST /api/payments/webhook (raw body) */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sess = event.data.object;
        const userId = sess.metadata?.user_id;
        if (userId) {
          await pool.query(
            `UPDATE users SET plan = 'pro', plan_status = 'active' WHERE id = $1`,
            [userId]
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;

        let uid = sub.metadata?.user_id || null;
        if (!uid) {
          const { rows } = await pool.query(
            `SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1`,
            [sub.customer]
          );
          uid = rows[0]?.id || null;
        }

        if (uid) {
          await pool.query(
            `INSERT INTO subscriptions (user_id, stripe_subscription_id, status, current_period_end)
             VALUES ($1, $2, $3, to_timestamp($4))
             ON CONFLICT (stripe_subscription_id) DO UPDATE
               SET status = EXCLUDED.status,
                   current_period_end = EXCLUDED.current_period_end`,
            [uid, sub.id, sub.status, sub.current_period_end]
          );

          const status = ['active', 'trialing'].includes(sub.status)
            ? 'active'
            : sub.status === 'past_due'
              ? 'past_due'
              : sub.status === 'canceled'
                ? 'canceled'
                : 'inactive';

          await pool.query(
            `UPDATE users SET plan = $1, plan_status = $2 WHERE id = $3`,
            [status === 'active' ? 'pro' : 'free', status, uid]
          );

          const isActive = ['active', 'trialing'].includes(sub.status);
          await enforceGoalLimitForPlan(uid, isActive ? 'pro' : 'free');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { rows } = await pool.query(
          `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
          [sub.id]
        );
        const uid = rows[0]?.user_id;
        if (uid) {
          await pool.query(
            `UPDATE users SET plan = 'free', plan_status = 'canceled' WHERE id = $1`,
            [uid]
          );
          await pool.query(
            `UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = $1`,
            [sub.id]
          );
          await enforceGoalLimitForPlan(uid, 'free');
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    res.status(500).send('Server error');
  }
}

module.exports = {
  checkout,
  portalLink,
  syncPlanForMe,
  handleWebhook,
  enforceGoalLimitForPlan, // used by /api/plan etc.
};
