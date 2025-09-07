// server/routes/health.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1'); // DB reachable
    res.status(200).json({
      ok: true,
      service: 'goalcrumbs-api',
      time: new Date().toISOString(),
      git_sha: process.env.GIT_SHA || null,
    });
  } catch (e) {
    console.log(e);
    res.status(503).json({ ok: false, error: 'db_unreachable' });
  }
});

// Optional: readiness (can be stricter during deploys or warmup)
router.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

module.exports = router;
