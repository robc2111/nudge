const express = require('express');
const router = express.Router();

const POSTS = [
  {
    slug: 'ai-accountability-partner',
    title: 'What an AI Accountability Partner Actually Does',
    excerpt: 'How AI nudges keep you moving…',
    published_at: '2025-09-20',
    html: '<p>Short intro…</p><h2>Why it helps</h2><p>…</p>',
  },
  {
    slug: 'daily-reminder-app',
    title: 'Daily Reminder Apps: What Matters (And What Doesn’t)',
    excerpt: 'If your reminders feel naggy or invisible, try this…',
    published_at: '2025-09-22',
    html: '<p>Content…</p>',
  },
];

router.get('/posts', (_req, res) => {
  const posts = POSTS.map(({ ...rest }) => rest);
  res.json({ posts });
});

router.get('/posts/:slug', (req, res) => {
  const post = POSTS.find((p) => p.slug === req.params.slug);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json({ post });
});

module.exports = router;
