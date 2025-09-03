const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { regenerateBreakdown } = require('../controllers/aiController');
const systemPrompts = require('../prompts');
const { model, temperature } = systemPrompts.goalBreakdown;

const { validate } = require('../validation/middleware');
const { GoalBreakdownBody, IdParam } = require('../validation/schemas');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/goal-breakdown', validate(GoalBreakdownBody, 'body'), async (req, res) => {
  const { goal } = req.body;

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

router.post('/goals/:id/regenerate', validate(IdParam, 'params'), regenerateBreakdown);

module.exports = router;