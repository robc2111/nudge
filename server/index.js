//index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(cors());
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

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

// Optional debug log
if (process.env.NODE_ENV !== 'production') {
  console.log("Connected to DB:", process.env.DATABASE_URL);
}

// Root route
app.get('/', (req, res) => {
  res.send('Nudge API is running');
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));