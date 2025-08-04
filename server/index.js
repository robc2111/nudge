//index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./cron');
const pool = require('./db');

const app = express();
const allowedOrigins = [
  'http://localhost:5173',       // local dev
  'https://goalcrumbs.com'       // production frontend
];

app.use(cors({
  origin: ['https://goalcrumbs.com', 'http://localhost:5173'],
  credentials: true
}));

// ✳️ Must follow cors middleware
app.use((req, res, next) => {
  const allowedOrigins = ['https://goalcrumbs.com', 'http://localhost:5173'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});
app.use(express.json());

const telegramRoutes = require('./routes/telegram');
app.use('/api/telegram', telegramRoutes);

// Mount API routes
app.use('/api/users', require('./routes/users'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/subgoals', require('./routes/subgoals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/microtasks', require('./routes/microtasks'));
app.use('/api/check_ins', require('./routes/check_ins'));
app.use('/api/reflections', require('./routes/reflections'));
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);
app.use('/api/gpt', require('./routes/gptRoutes'));

// Optional debug log
if (process.env.NODE_ENV !== 'production') {
  console.log("Connected to DB:", process.env.DATABASE_URL);
}

// Root route
app.get('/', (req, res) => {
  res.send('Nudge API is running');
});

app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl}`);
  next();
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));