//ai.js
const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { regenerateBreakdown } = require('../controllers/aiController');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/goal-breakdown', async (req, res) => {
  const { goal } = req.body;

  if (!goal) return res.status(400).json({ error: 'Missing goal' });
// allow different prompts based on goal type (e.g learning, fitness, career, etc.)
  const prompt = `
You are an expert productivity coach.

Break down the user's goal into a structured plan using the following hierarchy:
- Subgoals (each achievable within 3–7 days)
- Tasks (each achievable in less than a day)
- Microtasks (3–5 small, specific actions per task)

Rules:
- Use natural, friendly language for titles.
- Ensure microtasks are highly actionable and specific.
- If the task should be repeated daily (like “learn 10 new words” or “do 30 mins exercise”), then split it into multiple daily entries.

- Do NOT return vague or generic microtasks like “practice every day”. Instead, return specific daily steps like:
- "Day 1: Learn 10 new words related to food"
- "Day 2: Learn 10 new words related to travel"
- Suggest resources that can help achieve each microtask, based on your knowledge.
- If unsure or lacking details, respond with "unknown" or leave fields empty. Do not guess or invent tasks.
- Do not include anything unrelated to the core goal.
- Do NOT include commentary, only return valid JSON.

Return ONLY a well-formatted JSON object like this:
{
  "goal": "string",
  "subgoals": [
    {
      "title": "string",
      "tasks": [
        {
          "title": "string",
          "microtasks": ["string", "string", "string"]
        }
      ]
    }
  ]
}

User's goal: "${goal}"
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