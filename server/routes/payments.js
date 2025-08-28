// server/routes/payments.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const payments = require('../controllers/paymentsController');

router.post('/checkout',  requireAuth, payments.checkout);
router.post('/portal',    requireAuth, payments.portalLink);
router.post('/sync-plan', requireAuth, payments.syncPlanForMe);

// Webhook: must use raw body so signature verification works
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  payments.handleWebhook
);

module.exports = router;