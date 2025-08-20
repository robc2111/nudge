// server/routes/payments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth'); // JWT -> sets req.user
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const payments = require('../controllers/paymentsController');

const APP_BASE = process.env.APP_BASE_URL || 'http://localhost:5173';
const PRICE_ID = process.env.STRIPE_PRICE_MONTHLY;

// POST /api/payments/checkout  -> returns { url }
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    // Make sure user exists and has/creates a Stripe customer
    const { id: userId, email, name } = req.user;

    // fetch current user row
    const uRes = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    let customerId = uRes.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
    }

    // Create a Checkout Session for a subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${APP_BASE}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE}/billing/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err.message);
    return res.status(500).json({ error: 'Could not create checkout session' });
  }
});

// GET /api/payments/manage -> Stripe customer portal
router.get('/manage', requireAuth, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const uRes = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    const customerId = uRes.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer on record' });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_BASE}/profile`,
    });

    res.json({ url: portal.url });
  } catch (err) {
    console.error('createPortalSession error:', err.message);
    res.status(500).json({ error: 'Could not create portal session' });
  }
});

router.post('/portal',   requireAuth, payments.portalLink);

module.exports = router;