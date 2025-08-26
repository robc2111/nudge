const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./cron');
const pool = require('./db');

const app = express();

/* --- simple request logger (first so it logs everything) --- */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`🌐 ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Allowed origins
const allowedOrigins = ['https://goalcrumbs.com', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true
}));

// Preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Stripe webhook must be before json()
const paymentsController = require('./controllers/paymentsController');
app.post('/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.handleWebhook
);

// JSON bodies for the rest
app.use(express.json());

// Routes
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

// 🔑 mount password reset here (clear, dedicated prefix)
app.use('/api/password', require('./routes/passwordReset'));

app.use('/api/profile', require('./routes/profile'));
app.use('/api/gpt', require('./routes/gptRoutes'));
app.use('/api/payments', require('./routes/payments'));

app.get('/', (req, res) => res.send('🚀 GoalCrumbs API is running'));

// 404
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` }));

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));