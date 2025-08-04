// utils/gptUtils.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function breakdownMicrotask(title) {
  const prompt = `Break down the following microtask into 3 to 5 smaller, actionable steps. 
Return them as a plain numbered list of short titles. 
Microtask: "${title}"`;

  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const text = chatCompletion.choices[0].message.content;
  const lines = text
    .split('\n')
    .map(line => line.replace(/^\d+[\).\s-]+/, '').trim())
    .filter(line => line.length > 0);

  return lines;
}

module.exports = { breakdownMicrotask };