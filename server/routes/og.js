// server/routes/og.js
const express = require('express');
const router = express.Router();
const sharp = require('sharp'); // npm i sharp

router.get('/og', async (req, res) => {
  const {
    title = 'GoalCrumbs',
    subtitle = 'Break Big Goals Into Tiny Crumbs',
    theme = 'dark',
  } = req.query;

  const bg = theme === 'light' ? '#ffffff' : '#0F1020';
  const fg = theme === 'light' ? '#0F1020' : '#ffffff';
  const brand = '#6F3FF5';

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${brand}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${brand}" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="${bg}"/>
    <rect x="0" y="0" width="1200" height="630" fill="url(#g)"/>
    <circle cx="1060" cy="90" r="60" fill="${brand}" opacity="0.15"/>
    <g transform="translate(80,100)">
      <image href="https://goalcrumbs.com/logo.png" x="0" y="-8" width="72" height="72" />
      <text x="90" y="40" font-family="Inter, system-ui, -apple-system, Segoe UI" font-size="42" fill="${fg}" font-weight="700">GoalCrumbs</text>
    </g>
    <foreignObject x="80" y="220" width="1040" height="300">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter, system-ui; color:${fg}">
        <div style="font-weight:800; font-size:72px; line-height:1.05">${escapeHtml(title).slice(0, 140)}</div>
        <div style="margin-top:18px; font-size:34px; opacity:.9">${escapeHtml(subtitle).slice(0, 180)}</div>
      </div>
    </foreignObject>
  </svg>`;

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.set('Content-Type', 'image/png').send(png);
  } catch (e) {
    console.error('OG render error:', e);
    res.status(500).end();
  }
});

function escapeHtml(s = '') {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
}

module.exports = router;
