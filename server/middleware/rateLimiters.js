// server/middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');

let RedisStore;
let Redis;
try {
  RedisStore = require('rate-limit-redis');
  Redis = require('ioredis');
} catch {
  // If modules not installed, fallback gracefully
  console.warn(
    '[rateLimiters] Redis packages not found, will use memory store.'
  );
}

const redisUrl = process.env.REDIS_URL || null;
let redisClient = null;
if (redisUrl && Redis) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redisClient.on('error', (err) => {
      console.error('[rateLimiters] Redis error:', err.message);
    });
    console.log('[rateLimiters] Connected to Redis for rate limiting.');
  } catch (err) {
    console.error('[rateLimiters] Failed to init Redis client:', err.message);
    redisClient = null;
  }
}

// Helper to create a limiter (store = Redis if possible)
function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true, // return rate limit info in headers
    legacyHeaders: false, // disable deprecated headers
    store:
      redisClient && RedisStore
        ? new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
          })
        : undefined,
  });
}

// 🔒 Specific limiters
const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Try again later.',
});

const authLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many authentication requests. Slow down.',
});

const aiLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many AI requests. Please wait a moment.',
});

module.exports = {
  loginLimiter,
  authLimiter,
  aiLimiter,
};
