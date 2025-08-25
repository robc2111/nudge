// prompts/mtBreakdown.js
module.exports = {
  model: 'gpt-4',
  temperature: 0.2,
  prompt: (title) => `
You are a productivity coach.

Break down the following microtask into 3–5 even smaller, atomic steps.

Rules:
- Output must be a plain numbered list (e.g., "1. Do X"), with no commentary, no markdown, no JSON.
- Each step must begin with an action verb (e.g., "Write", "Check", "Open").
- Each step must be specific, concrete, and completable in ≤15 minutes.
- Avoid vague items like "research" or "plan" unless paired with a concrete outcome.
- Do not duplicate steps.

Microtask: "${title}"
`
};