// server/index.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Sentry (request + tracing first, error handler later)
const { initSentry, sentryErrorHandler } = require('./monitoring/sentry');

// 🔒 Rate limiting
const {
  apiLimiter,
  authLimiter,
  aiLimiter,
  aiIpBurstLimiter,
} = require('./middleware/rateLimiters');

const app = express();

/**
 * IMPORTANT for rate limiting behind proxies (Render/Heroku/Nginx/Cloudflare):
 * This lets express-rate-limit read the real client IP from X-Forwarded-For.
 * If you’re behind multiple proxies, you can bump this number or use true.
 */
app.set('trust proxy', process.env.TRUST_PROXY ?? 1);

const isProd = process.env.NODE_ENV === 'production';

// ---- Sentry (must be before any other middleware/routers) ----
initSentry(app);

// ---- tiny request logger ----
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const isHealth = req.path === '/api/healthz' || req.path === '/api/readyz';
    const ms = Date.now() - start;
    if (!isHealth || res.statusCode >= 400) {
      console.log(
        `🌐 ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`
      );
    }
  });
  next();
});

// ---- allow-list for CORS & CSP ----
const allowedOrigins = [
  'https://goalcrumbs.com',
  'https://www.goalcrumbs.com',
  'http://localhost:5173',
];

// ---- Helmet (secure headers) ----
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          useDefaults: true,
          directives: {
            'default-src': ["'self'"],
            'base-uri': ["'self'"],
            'frame-ancestors': ["'none'"],
            'img-src': ["'self'", 'data:', 'blob:'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'script-src': ["'self'"],
            'connect-src': ["'self'", ...allowedOrigins],
          },
        }
      : false, // keep CSP off in dev so Vite/WS aren't blocked
    crossOriginEmbedderPolicy: false,
  })
);

// ---- CORS ----
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ---- Stripe webhook (raw body) MUST be before json() & NOT rate-limited ----
const paymentsController = require('./controllers/paymentsController');
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.handleWebhook
);

// ---- JSON for everything else ----
app.use(express.json({ limit: '1mb' }));

// Sentry test
app.get('/api/debug-sentry', (req, res, next) =>
  next(new Error('Sentry test error'))
);

/**
 * Mount health endpoints BEFORE global API limiter so they’re never rate-limited
 * (useful for uptime checks and platform health probes).
 */
const healthRoutes = require('./routes/health');
app.use('/api', healthRoutes);

// ---------- 🔒 Rate limiters (mount BEFORE other routes) ----------
// Global soft guard for API traffic (excludes the Stripe webhook and health above)
app.use('/api', apiLimiter);

// Name-spaced guard for auth; /login has its own limiter inside its router if you added one
app.use('/api/auth', authLimiter);

// ---- Routes ----
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/users', require('./routes/users'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/subgoals', require('./routes/subgoals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/microtasks', require('./routes/microtasks'));
app.use('/api/check_ins', require('./routes/check_ins'));
app.use('/api/reflections', require('./routes/reflections'));

// AI endpoints — per-user limiter + short burst per-IP limiter
const aiRouter = require('./routes/ai');
app.use('/api/ai', aiLimiter, aiIpBurstLimiter, aiRouter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/passwordReset'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/gpt', require('./routes/gptRoutes'));
app.use('/api/payments', require('./routes/payments'));
try {
  app.use('/api/og', require('./routes/og'));
} catch (e) {
  console.warn('[og] disabled:', e.message);
}

// 🔒 plan management
app.use('/api/plan', require('./routes/plan'));

// ---- Health/root (root is not rate-limited anyway) ----
app.get('/', (_req, res) => res.send('🚀 GoalCrumbs API is running'));

// ---- 404 ----
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---- Sentry error handler ----
sentryErrorHandler(app);

// ---- Final error handler ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Cron (gate with env so dev can disable) ----
if (process.env.CRON_ENABLED !== 'false') {
  try {
    require('./cron');
  } catch (e) {
    console.error('[cron] failed to start:', e.message);
  }
} else {
  console.log('[cron] disabled (CRON_ENABLED=false)');
}

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Process-level safety nets
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
