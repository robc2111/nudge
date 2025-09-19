const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../utils/requireAuth'); // if you have one
const { kickOffExport } = require('../services/exportService');

router.post('/export', requireAuth, async (req, res) => {
  const userId = req.user.id; // your auth middleware should set this
  const { rows } = await pool.query(
    `insert into privacy_exports (user_id, status)
     values ($1, 'pending')
     returning id, requested_at`,
    [userId]
  );

  // fire-and-forget job to build & upload the export
  kickOffExport({ userId, exportId: rows[0].id }).catch(() => {});
  res.json({ ok: true, export_id: rows[0].id });
});

router.post('/delete', requireAuth, async (req, res) => {
  const userId = req.user.id;

  // schedule for +7 days; flip UI flag
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
