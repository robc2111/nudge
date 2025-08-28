// server/controllers/paymentsController.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});
const pool = require('../db');

const APP_BASE = process.env.APP_BASE_URL || 'http://localhost:5173';
const PRICE_ID = process.env.STRIPE_PRICE_MONTHLY;

/**
 * Ensure there is a valid Stripe customer for the *current* Stripe mode (test/live).
 * - If the stored customer id exists & is valid -> use it
 * - Else try to find an existing customer by email in this mode
 * - Else create a new customer
 * Always persists the id back to the users table.
 */
async function ensureStripeCustomer(user) {
  // Try stored id (and verify it is valid in this mode)
  if (user.stripe_customer_id) {
    try {
      await stripe.customers.retrieve(user.stripe_customer_id);
      return user.stripe_customer_id;
    } catch (e) {
      console.warn('[stripe] Stored customer invalid in this mode:', e.message);
    }
  }

  // Try by email to avoid duplicates in this mode
  let custId = null;
  if (user.email) {
    const { data } = await stripe.customers.list({ email: user.email, limit: 1 });
    if (data[0]) custId = data[0].id;
  }

  // Create if still missing
  if (!custId) {
    const created = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { app_user_id: String(user.id) },
    });
    custId = created.id;
  }

  // Persist to DB
  await pool.query(
    `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
    [custId, user.id]
  );

  return custId;
}

/** POST /api/payments/checkout -> { url } */
exports.checkout = async (req, res) => {
  try {
    if (!PRICE_ID) return res.status(500).json({ error: 'Missing STRIPE_PRICE_MONTHLY' });

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
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${APP_BASE}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE}/billing/cancel`,
      metadata: { user_id: String(user.id) },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err?.message || err);
    return res.status(500).json({ error: 'Could not create checkout session' });
  }
};

/** POST /api/payments/portal -> { url } */
exports.portalLink = async (req, res) => {
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

    return res.json({ url: portal.url });
  } catch (err) {
    console.error('portalLink error:', err?.message || err);
    return res.status(500).json({ error: 'Could not create portal session' });
  }
};

/**
 * POST /api/payments/webhook
 * IMPORTANT: this route must receive the *raw* body. The router sets express.raw().
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,                     // provided by express.raw() in the route
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

        // Map subscription to user
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
               SET status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end`,
            [uid, sub.id, sub.status, sub.current_period_end]
          );

          const status =
            ['active', 'trialing'].includes(sub.status) ? 'active' :
            sub.status === 'past_due' ? 'past_due' :
            sub.status === 'canceled' ? 'canceled' : 'inactive';

          await pool.query(
            `UPDATE users SET plan = $1, plan_status = $2 WHERE id = $3`,
            [status === 'active' ? 'pro' : 'free', status, uid]
          );
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
        }
        break;
      }

      default:
        // ignore other events
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    return res.status(500).send('Server error');
  }
};