//index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./cron');
const pool = require('./db');

const app = express();

// ✅ Allowed origins for production & local dev
const allowedOrigins = [
  'https://goalcrumbs.com',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ✅ Additional headers for preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const paymentsController = require('./controllers/paymentsController');
app.post('/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.handleWebhook
);

// ✅ Parse JSON bodies
app.use(express.json());

// ✅ API routes
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
app.use('/api/profile', require('./routes/profile'));
app.use('/api/gpt', require('./routes/gptRoutes'));
app.use('/api/payments', require('./routes/payments'));

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('🚀 GoalCrumbs API is running');
});

// ✅ Log all incoming requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ✅ Start the server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));