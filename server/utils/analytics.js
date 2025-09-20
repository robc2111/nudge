// server/utils/analytics.js
const nodeCrypto = require('crypto');
const pool = require('../db');

let uaParse; // optional dependency
try {
  // only present if added to server/package.json
  ({ parse: uaParse } = require('useragent'));
} catch {
  uaParse = null;
}

const ENABLED = process.env.ANALYTICS_ENABLED !== 'false';
const SALT = process.env.ANALYTICS_IP_SALT || 'rotate-me-please';
const RESPECT_DNT = process.env.ANALYTICS_RESPECT_DNT !== 'false';

function hashIp(ip) {
  if (!ip) return null;
  try {
    return nodeCrypto
      .createHash('sha256')
      .update(SALT + ip)
      .digest('hex');
  } catch {
    return null;
  }
}

// very small fallback parser when `useragent` isn’t available
function cheapUaSummary(ua = '') {
  const s = String(ua);
  const os = /Windows/i.test(s)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(s)
      ? 'macOS'
      : /Android/i.test(s)
        ? 'Android'
        : /iPhone|iPad|iOS/i.test(s)
          ? 'iOS'
          : /Linux/i.test(s)
            ? 'Linux'
            : null;

  const fam = /Chrome/i.test(s)
    ? 'Chrome'
    : /Safari/i.test(s) && !/Chrome/i.test(s)
      ? 'Safari'
      : /Firefox/i.test(s)
        ? 'Firefox'
        : /Edge/i.test(s)
          ? 'Edge'
          : /Node\.js/i.test(s)
            ? 'Node'
            : null;

  const device = /Mobile|iPhone|Android/i.test(s)
    ? 'mobile'
    : /iPad|Tablet/i.test(s)
      ? 'tablet'
      : 'desktop';

  return { ua_family: fam, ua_os: os, ua_device: device };
}

function parseUA(uaString = '') {
  if (uaParse) {
    try {
      const ua = uaParse(uaString);
      return {
        ua_family: ua.family || null,
        ua_os: ua.os?.family || null,
        ua_device: ua.device?.family
          ? ua.device.family.toLowerCase()
          : 'desktop',
      };
    } catch {
      /* fall through */
    }
  }
  return cheapUaSummary(uaString);
}

async function track({
  req,
  userId = null,
  event,
  props = {},
  source = 'server',
}) {
  if (!ENABLED || !event) return;
  if (RESPECT_DNT && req && req.headers?.dnt === '1') return;

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
