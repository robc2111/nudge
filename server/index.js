// server/index.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { initSentry, sentryErrorHandler } = require('./monitoring/sentry');
const {
  apiLimiter,
  authLimiter,
  aiLimiter,
  aiIpBurstLimiter,
} = require('./middleware/rateLimiters');

const app = express();

// Let express-rate-limit see the client IP behind proxies (Render/CF/etc.)
app.set('trust proxy', process.env.TRUST_PROXY ?? 1);

const isProd = process.env.NODE_ENV === 'production';

/* ──────────────────────────
   Sentry (must be first)
   ────────────────────────── */
initSentry(app);

/* ──────────────────────────
   Tiny request logger
   ────────────────────────── */
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

/* ──────────────────────────
   Security headers (Helmet)
   ────────────────────────── */
// ---- Helmet (secure headers) ----
app.disable('x-powered-by'); // don't leak Express

const allowedOrigins = [
  'https://goalcrumbs.com',
  'https://www.goalcrumbs.com',
  'http://localhost:5173',
];

app.use(
  helmet({
    // Strong CSP in prod; disabled in dev to avoid blocking Vite/HMR
    contentSecurityPolicy: isProd
      ? {
          useDefaults: true,
          directives: {
            // Baseline
            'default-src': ["'self'"],
            'base-uri': ["'self'"],

            // Clickjacking protection (also provides X-Frame-Options: DENY via frameguard below)
            'frame-ancestors': ["'none'"],

            // XSS hardening
            'script-src': ["'self'"], // no inline/eval in prod
            'style-src': ["'self'", "'unsafe-inline'"], // allow inline styles only (React styles)
            'img-src': ["'self'", 'data:', 'blob:'],
            'connect-src': ["'self'", ...allowedOrigins],
            'object-src': ["'none'"], // disallow Flash/etc.
            'upgrade-insecure-requests': [], // auto-upgrade http->https
          },
        }
      : false,

    // Some frameworks/features need this disabled; keep as you had
    crossOriginEmbedderPolicy: false,

    // Explicitly keep these strong & on:
    frameguard: { action: 'deny' }, // Clickjacking header (X-Frame-Options: DENY)
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true, // X-Content-Type-Options: nosniff
    xssFilter: false, // deprecated; CSP does the job
    hsts: isProd
      ? { maxAge: 60 * 60 * 24 * 365, includeSubDomains: true, preload: true }
      : false, // only when served over HTTPS
    crossOriginResourcePolicy: { policy: 'same-site' },
    // (Permissions-Policy moved out of helmet; add if/when you need specific APIs)
  })
);

/* ──────────────────────────
   CORS
   ────────────────────────── */
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // preflight

/* ──────────────────────────
   Stripe webhook (raw) BEFORE json()
   ────────────────────────── */
const paymentsController = require('./controllers/paymentsController');
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.handleWebhook
);

/* ──────────────────────────
   JSON body for everything else
   ────────────────────────── */
app.use(express.json({ limit: '1mb' }));

// Sentry test
app.get('/api/debug-sentry', (req, _res, next) =>
  next(new Error('Sentry test error'))
);

/* ──────────────────────────
   Health endpoints (never rate-limited)
   ────────────────────────── */
app.use('/api', require('./routes/health'));

/* ──────────────────────────
   Global API rate limiter (after health & webhook)
   ────────────────────────── */
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

/* ──────────────────────────
   Routes
   ────────────────────────── */
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/users', require('./routes/users'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/subgoals', require('./routes/subgoals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/microtasks', require('./routes/microtasks'));
app.use('/api/check_ins', require('./routes/check_ins'));
app.use('/api/reflections', require('./routes/reflections'));

const aiRouter = require('./routes/ai');
app.use('/api/ai', aiLimiter, aiIpBurstLimiter, aiRouter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/passwordReset'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/gpt', require('./routes/gptRoutes'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api', require('./routes/goalPdf'));

try {
  app.use('/api/og', require('./routes/og'));
} catch (e) {
  console.warn('[og] disabled:', e.message);
}

app.use('/api/plan', require('./routes/plan'));

/* ──────────────────────────
   Root + 404
   ────────────────────────── */
app.get('/', (_req, res) => res.send('🚀 GoalCrumbs API is running'));

app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

/* ──────────────────────────
   Sentry error handler & final handler
   ────────────────────────── */
sentryErrorHandler(app);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  // Friendly CORS error response if origin blocked
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin is not allowed by CORS' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

/* ──────────────────────────
   Cron (optional)
   ────────────────────────── */
if (process.env.CRON_ENABLED !== 'false') {
  try {
    require('./cron');
  } catch (e) {
    console.error('[cron] failed to start:', e.message);
  }
} else {
  console.log('[cron] disabled (CRON_ENABLED=false)');
}

/* ──────────────────────────
   Start
   ────────────────────────── */
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
