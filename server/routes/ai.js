//ai.js
const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { regenerateBreakdown } = require('../controllers/aiController');
const systemPrompts = require('../prompts');
const { model, temperature } = systemPrompts.goalBreakdown;



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/goal-breakdown', async (req, res) => {
  const { goal } = req.body;

  if (!goal) return res.status(400).json({ error: 'Missing goal' });
// allow different prompts based on goal type (e.g learning, fitness, career, etc.)
  const prompt = systemPrompts.goalBreakdown.prompt(goal);

  try {
    const chatResponse = await openai.chat.completions.create({
  model,
  messages: [{ role: 'user', content: prompt }],
  temperature
});

    const json = JSON.parse(chatResponse.choices[0].message.content);
    res.json(json);
  } catch (err) {
    console.error('🛑 AI Breakdown Error:', err.message);
    res.status(500).json({ error: 'Failed to generate breakdown' });
  }
});

// routes/ai.js
router.post('/goals/:id/regenerate', regenerateBreakdown);

module.exports = router;