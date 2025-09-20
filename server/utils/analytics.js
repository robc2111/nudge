// server/utils/analytics.js
const { createHash } = require('node:crypto'); // ← no shadowing
const { parse } = require('useragent');
const pool = require('../db');

const ENABLED = process.env.ANALYTICS_ENABLED !== 'false'; // default ON
const SALT = process.env.ANALYTICS_IP_SALT || 'rotate-me-please';
const RESPECT_DNT = process.env.ANALYTICS_RESPECT_DNT !== 'false'; // default true

function hashIp(ip) {
  if (!ip) return null;
  try {
    return createHash('sha256')
      .update(SALT + ip)
      .digest('hex');
  } catch {
    return null;
  }
}

function parseUA(uaString = '') {
  try {
    const ua = parse(uaString);
    return {
      ua_family: ua.family || null,
      ua_os: ua.os?.family || null,
      ua_device: ua.device?.family ? ua.device.family.toLowerCase() : 'desktop',
    };
  } catch {
    return { ua_family: null, ua_os: null, ua_device: null };
  }
}

/**
 * Core tracker (privacy-respecting)
 */
async function track({
  req,
  userId = null,
  event,
  props = {},
  source = 'server',
}) {
  if (!ENABLED || !event) return;

  if (RESPECT_DNT && req && req.headers['dnt'] === '1') return;

  const ip =
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    null;

  const uaString = req?.headers?.['user-agent'] || '';
  const { ua_family, ua_os, ua_device } = parseUA(uaString);

  const path = req?.originalUrl?.slice(0, 300) || null;
  const referrer = req?.headers?.referer?.slice(0, 300) || null;

  await pool.query(
    `insert into analytics_events
       (user_id, anon_id, session_id, event, props, ip_hash, ua_family, ua_device, ua_os, path, referrer, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      userId,
      props.anon_id || null,
      props.session_id || null,
      event,
      props,
      hashIp(ip),
      ua_family,
      ua_device,
      ua_os,
      path,
      referrer,
      source,
    ]
  );
}

module.exports = { track };
