// server/middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');

let store; // will be set to RedisStore if available

// Try to wire Redis (Upstash) for a distributed store
try {
  const haveUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (haveUpstash) {
    const { Redis } = require('@upstash/redis');
    const { RedisStore } = require('rate-limit-redis'); // <-- named import

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Adapter expected by rate-limit-redis v4
    store = new RedisStore({
      // Upstash client has sendCommand([...])
      sendCommand: (...args) => redis.sendCommand(args),
      // optional key prefix to avoid collisions with other app keys
      prefix: 'rl:',
    });

    console.log('[rateLimiters] Connected to Redis for rate limiting.');
  } else {
    console.warn('[rateLimiters] No Redis env set; using in-memory limiter.');
  }
} catch (err) {
  console.warn('[rateLimiters] Redis store unavailable:', err.message);
  // fall back to in-memory
}

function makeLimiter({
  windowMs,
  max,
  message = 'Too many requests',
  keyGenerator,
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    keyGenerator, // optional per-route override
    store, // undefined => memory store
    skipFailedRequests: false,
  });
}

/* ---------------- Profiles ---------------- */

const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 900, // whole API namespace soft cap (adjust as needed)
  message: 'Too many requests from this IP. Please slow down.',
});

const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50, // /api/auth namespace (register / login)
  message: 'Too many auth requests from this IP. Please wait a moment.',
});

const aiLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 30, // per minute per user token by default
  message: 'AI endpoint rate limit exceeded. Try again in a moment.',
  keyGenerator: (req) => {
    // Prefer user id if authenticated; else IP
    const uid = req.user?.id || req.user?.sub;
    return uid || req.ip;
  },
});

const aiIpBurstLimiter = makeLimiter({
  windowMs: 10 * 1000, // short burst
  max: 10, // per IP
  message: 'Please slow down.',
});

module.exports = { apiLimiter, authLimiter, aiLimiter, aiIpBurstLimiter };
