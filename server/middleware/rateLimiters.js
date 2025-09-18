// server/middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');

/**
 * Store: Redis if REDIS_URL is set; otherwise in-memory.
 * In-memory is fine for dev, but for prod use Redis so limits are shared across instances.
 */
let store;
if (process.env.REDIS_URL) {
  const redis = new Redis(process.env.REDIS_URL, {
    enableAutoPipelining: true,
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
  store = new RedisStore({ sendCommand: (...args) => redis.call(...args) });
}

/** Normalized client IP (trust proxy must be enabled on app). */
const ipKey = (req) =>
  req.ip ||
  req.headers['x-forwarded-for'] ||
  req.connection.remoteAddress ||
  'unknown';

/** Normalized email for auth rate limiting (falls back to IP if missing). */
const emailKey = (req) => {
  const raw = (req.body?.email || '').toString().trim().toLowerCase();
  return raw || `ip:${ipKey(req)}`;
};

/** Normalized user id for authenticated endpoints (falls back to IP). */
const userKey = (req) => req.user?.id || req.user?.sub || `ip:${ipKey(req)}`;

/** Shared response body for 429s */
const onLimitReached = (req, res) => {
  res.status(429).json({
    error: 'Too many requests. Please slow down and try again shortly.',
    code: 'RATE_LIMITED',
  });
};

/* ------------------------- Global API limiter ------------------------- */
/** Soft guard for all /api traffic */
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // 300 requests / 5min / IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  handler: onLimitReached,
  store,
});

/* --------------------------- Auth limiters ---------------------------- */
/** Generic auth namespace limiter (GET/POST /api/auth/*) */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // 60 requests / 10min / IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  handler: onLimitReached,
  store,
});

/**
 * Login limiter (IP scope) – protects from wide scans.
 * 10 attempts / 10 minutes / IP.
 */
const loginIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  handler: (req, res) => {
    res.status(429).json({
      error:
        'Too many login attempts from this IP. Try again in a few minutes.',
      code: 'LOGIN_RATE_LIMITED',
    });
  },
  store,
});

/**
 * Login limiter (email scope) – protects a single account from brute force.
 * 5 attempts / 10 minutes / email (plus IP fallback).
 */
const loginEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many attempts for this account. Please wait a few minutes.',
      code: 'LOGIN_ACCOUNT_LOCKED',
    });
  },
  store,
});

/* ---------------------------- AI limiters ----------------------------- */
/**
 * AI/chat/completion endpoints – per user to prevent abuse,
 * still works for anonymous users via IP fallback.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests / minute / user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  handler: (req, res) => {
    res.status(429).json({
      error: 'You are sending requests too quickly to the AI endpoint.',
      code: 'AI_RATE_LIMITED',
    });
  },
  store,
});

/** Optional: tighter burst cap per-IP for AI (defense-in-depth). */
const aiIpBurstLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 8, // 8 requests / 15s / IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many rapid AI requests from this IP.',
      code: 'AI_IP_BURST_LIMITED',
    });
  },
  store,
});

module.exports = {
  apiLimiter,
  authLimiter,
  loginIpLimiter,
  loginEmailLimiter,
  aiLimiter,
  aiIpBurstLimiter,
};
