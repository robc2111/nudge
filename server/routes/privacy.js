// server/routes/privacy.js
const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { kickOffExport } = require('../services/exportService'); // ← must match

// Quick ping for troubleshooting
router.get('/ping', (_req, res) => res.json({ ok: true, route: 'privacy' }));

// POST /api/privacy/export
router.post('/export', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { rows } = await pool.query(
    `insert into privacy_exports (user_id, status)
     values ($1, 'pending')
     returning id, requested_at`,
    [userId]
  );
  // fire-and-forget build
  kickOffExport({ userId, exportId: rows[0].id }).catch((e) => {
    console.error('[export] job failed:', e);
  });
  res.json({ ok: true, export_id: rows[0].id });
});

// POST /api/privacy/delete
router.post('/delete', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { rows } = await pool.query(
    `insert into privacy_deletes (user_id, requested_at, eta, status)
     values ($1, now(), now() + interval '7 days', 'pending')
     on conflict (user_id) do update
       set requested_at = excluded.requested_at,
           eta          = excluded.eta,
           status       = 'pending'
     returning eta`,
    [userId]
  );
  await pool.query(`update users set deletion_pending = true where id = $1`, [
    userId,
  ]);
  res.json({ ok: true, eta: rows[0].eta });
});

// POST /api/privacy/delete/cancel
router.post('/delete/cancel', requireAuth, async (req, res) => {
  const userId = req.user.id;
  await pool.query(
    `update privacy_deletes set status = 'cancelled' where user_id = $1`,
    [userId]
  );
  await pool.query(`update users set deletion_pending = false where id = $1`, [
    userId,
  ]);
  res.json({ ok: true });
});

module.exports = router;
