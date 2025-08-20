// paymentsController.js
// controllers/paymentsController.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const pool = require('../db');

// helper: create/find customer
async function getOrCreateCustomer(user) {
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { user_id: user.id }
  });

  await pool.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customer.id, user.id]
  );

  return customer.id;
}

exports.createCheckoutSession = async (req, res) => {
  try {
    // req.user.id from auth middleware
    const me = await pool.query('SELECT id, email, name, stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    const user = me.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = await getOrCreateCustomer(user);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
      success_url: `${process.env.APP_BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/billing/cancel`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

exports.portalLink = async (req, res) => {
  try {
    const me = await pool.query('SELECT id, stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    const user = me.rows[0];
    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer' });

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.APP_BASE_URL}/profile`
    });

    res.json({ url: portal.url });
  } catch (err) {
    console.error('portalLink error:', err.message);
    res.status(500).json({ error: 'Failed to create portal link' });
  }
};

// Webhook: must be raw body
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sess = event.data.object;
        const userId = sess.metadata?.user_id;
        // mark plan active after subscription created (use next event too)
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
        const userId = sub.metadata?.user_id || null; // may be null; we’ll map via customer if needed
        // find user by customer if missing in metadata:
        let uid = userId;
        if (!uid) {
          const customerId = sub.customer;
          const u = await pool.query('SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1', [customerId]);
          uid = u.rows[0]?.id || null;
        }

        if (uid) {
          await pool.query(
            `INSERT INTO subscriptions (user_id, stripe_subscription_id, status, current_period_end)
             VALUES ($1, $2, $3, to_timestamp($4))
             ON CONFLICT (stripe_subscription_id) DO UPDATE
               SET status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end`,
            [uid, sub.id, sub.status, sub.current_period_end]
          );

          // reflect quick status on users
          const status = ['active', 'trialing'].includes(sub.status) ? 'active'
                        : sub.status === 'past_due'                     ? 'past_due'
                        : sub.status === 'canceled'                      ? 'canceled'
                        : 'inactive';

          await pool.query(
            `UPDATE users SET plan = $1, plan_status = $2 WHERE id = $3`,
            [status === 'active' ? 'pro' : 'free', status, uid]
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const u = await pool.query(
          'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
          [sub.id]
        );
        const uid = u.rows[0]?.user_id;
        if (uid) {
          await pool.query(`UPDATE users SET plan = 'free', plan_status = 'canceled' WHERE id = $1`, [uid]);
          await pool.query(`UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = $1`, [sub.id]);
        }
        break;
      }
      default:
        // ignore
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    res.status(500).send('Server error');
  }
};