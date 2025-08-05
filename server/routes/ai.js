//ai.js
const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { regenerateBreakdown } = require('../controllers/aiController');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/goal-breakdown', async (req, res) => {
  const { goal } = req.body;

  if (!goal) return res.status(400).json({ error: 'Missing goal' });

  const prompt = `
Break down the following goal into 3–5 subgoals. 
Then break each subgoal into 3–5 tasks.
Then break each task into 3–5 microtasks.
Return only a clean JSON object like:

{
  "goal": "string",
  "subgoals": [
    {
      "title": "string",
      "tasks": [
        {
          "title": "string",
          "microtasks": ["string", "string"]
        }
      ]
    }
  ]
}

Goal: "${goal}"
`;

  try {
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
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