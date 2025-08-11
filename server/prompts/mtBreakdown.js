// prompts/mtBreakdown.js
module.exports = {
  model: 'gpt-4',
  temperature: 0.3,
  prompt: (title) => `
Break down the following microtask into 3 to 5 smaller, actionable steps.
Return them as a plain numbered list of short titles only.

Microtask: "${title}"
`
};