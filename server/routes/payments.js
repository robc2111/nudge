// server/routes/payments.js
const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth'); // JWT middleware sets req.user
const payments = require('../controllers/paymentsController');

// Create subscription checkout session
router.post('/checkout', requireAuth, payments.checkout);

// Open Stripe Billing Portal
router.post('/portal', requireAuth, payments.portalLink);

// Webhook: must use raw body so signature verification works
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  payments.handleWebhook
);

module.exports = router;