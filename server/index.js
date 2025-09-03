// server/index.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();
require('./cron');
const pool = require('./db');

const app = express();
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production';

// ---- tiny request logger (first so it logs everything) ----
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`🌐 ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
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
            "default-src": ["'self'"],
            "base-uri": ["'self'"],
            "frame-ancestors": ["'none'"],
            "img-src": ["'self'", "data:", "blob:"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "script-src": ["'self'"],
            "connect-src": ["'self'", ...allowedOrigins],
          },
        }
      : false, // keep CSP off in dev so Vite/WS aren't blocked
    crossOriginEmbedderPolicy: false,
  })
);

// ---- CORS (single source of truth) ----
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                // same-origin/cURL
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};
app.use(cors(corsOptions));
// NOTE: Removed app.options('*', …) — newer path-to-regexp rejects '*'
// If you want an explicit preflight handler, use '/*' instead:
// app.options('/*', cors(corsOptions));

// ---- Stripe webhook (raw body) MUST be before json() ----
const paymentsController = require('./controllers/paymentsController');
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.handleWebhook
);

// ---- JSON bodies for everything else ----
app.use(express.json());

// ---- Routes ----
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/users', require('./routes/users'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/subgoals', require('./routes/subgoals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/microtasks', require('./routes/microtasks'));
app.use('/api/check_ins', require('./routes/check_ins'));
app.use('/api/reflections', require('./routes/reflections'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/passwordReset'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/gpt', require('./routes/gptRoutes'));
app.use('/api/payments', require('./routes/payments'));

// 🔒 plan management (choose active on Free)
app.use('/api/plan', require('./routes/plan'));

// ---- Health/root ----
app.get('/', (req, res) => res.send('🚀 GoalCrumbs API is running'));

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));