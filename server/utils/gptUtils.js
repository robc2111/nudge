// utils/gptUtils.js
const OpenAI = require('openai');
const mtPrompt = require('../prompts/mtBreakdown');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function breakdownMicrotask(title) {
  const prompt = mtPrompt.prompt(title);
  const chatCompletion = await openai.chat.completions.create({
    model: mtPrompt.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: mtPrompt.temperature,
  });
  const text = chatCompletion.choices[0].message.content;

  const lines = text
    .split('\n')
    .map((line) => line.replace(/^\d+[).\s-]+/, '').trim())
    .filter(Boolean);

  return lines;
}

module.exports = { breakdownMicrotask };
