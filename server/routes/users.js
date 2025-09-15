// server/routes/users.js
const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');

const {
  getUsers,
  createUser,
  getUserById,
  getCurrentUser,
  patchMe,
  updateUser,
  deleteUser,
  getUserDashboard,
} = require('../controllers/usersController');

const pool = require('../db');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const { validate } = require('../validation/middleware');
const {
  UserPatchSchema,
  UserIdParam,
  UserDashboardParams,
} = require('../validation/schemas');

/* --------------------------- helpers --------------------------- */

async function cancelStripeForUser(stripeCustomerId) {
  if (!stripe || !stripeCustomerId) return { cancelled: 0 };
  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 100,
  });

  let cancelled = 0;
  for (const s of subs.data) {
    if (!s.cancel_at_period_end) {
      await stripe.subscriptions.update(s.id, { cancel_at_period_end: true });
      cancelled++;
    }
  }
  return { cancelled };
}

/* --------------------------- routes ---------------------------- */

// Public
router.get('/', getUsers);
router.post('/', createUser);

// Authenticated
router.get('/me', verifyToken, getCurrentUser);
router.patch('/me', verifyToken, validate(UserPatchSchema, 'body'), patchMe);

// New: delete own account (cancel Stripe, soft-delete user)
router.delete('/me', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, stripe_customer_id, plan, plan_status, deleted_at
         FROM public.users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // idempotent
    if (user.deleted_at) {
      return res.json({ ok: true, message: 'Account already deleted' });
    }

    let cancelled = 0;
    try {
      const out = await cancelStripeForUser(user.stripe_customer_id);
      cancelled = out.cancelled;
    } catch (e) {
      console.error('[users.deleteMe] Stripe cancel failed:', e.message);
      // continue – don’t block deletion
    }

    await pool.query(
      `UPDATE public.users
          SET deleted_at = NOW(),
              plan = 'free',
              plan_status = 'canceled'
        WHERE id = $1`,
      [userId]
    );

    // (Optional) mark non-done goals as done to freeze state
    await pool.query(
      `UPDATE public.goals
          SET status = CASE WHEN status='done' THEN status ELSE 'done' END
        WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      ok: true,
      cancelledSubscriptions: cancelled,
      message:
        cancelled > 0
          ? 'Account deleted and subscription will end at period end.'
          : 'Account deleted.',
    });
  } catch (err) {
    console.error('❌ DELETE /users/me error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.get(
  '/:userId/dashboard',
  verifyToken,
  validate(UserDashboardParams, 'params'),
  getUserDashboard
);

router.get('/:id', verifyToken, validate(UserIdParam, 'params'), getUserById);

router.put(
  '/:id',
  verifyToken,
  validate(UserIdParam, 'params'),
  validate(UserPatchSchema, 'body'),
  updateUser
);

router.delete('/:id', verifyToken, validate(UserIdParam, 'params'), deleteUser);

module.exports = router;
