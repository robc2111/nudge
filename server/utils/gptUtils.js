// server/utils/gptUtils.js
const { getClient, projectHeaders } = require('./openai');
const mtPrompt = require('../prompts/mtBreakdown');

/**
 * Ask the model to break a single microtask title into smaller steps.
 * Returns an array of clean step strings.
 */
async function breakdownMicrotask(title) {
  const client = getClient(); // <-- uses OPENAI_ENV split + keys
  const prompt = mtPrompt.prompt(title);

  const completion = await client.chat.completions.create(
    {
      model: mtPrompt.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: mtPrompt.temperature,
    },
    { headers: projectHeaders() }
  );

  const text = completion.choices?.[0]?.message?.content || '';

  // Convert numbered list to array of trimmed lines
  return String(text)
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[).\s-]+/, '').trim())
    .filter(Boolean);
}

module.exports = { breakdownMicrotask };
