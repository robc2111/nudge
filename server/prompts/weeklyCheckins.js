// server/prompts/weeklyCheckins.js
// Generates short, tone-aware weekly reflection prompts for Telegram.
// If recent reflections are provided, the bot gives feedback on them first.

module.exports = {
  model: 'gpt-4',
  temperature: 0.5,

  /**
   * Build chat messages for OpenAI given tone + recent reflections.
   * @param {Object} opts
   * @param {'friendly'|'strict'|'motivational'} [opts.tone='friendly']
   * @param {Array<{created_at:string, goal_title?:string, content:string}>} [opts.reflections=[]]
   * @returns {Array<{role:'system'|'user', content:string}>}
   */
  buildMessages: ({ tone = 'friendly', reflections = [] } = {}) => {
    // Compact the reflections into a short context string (max ~1000 chars)
    const rows = reflections
      .slice(-8) // last 8 entries max
      .map(r => {
        const date = (r.created_at || '').toString().slice(0, 10);
        const goal = r.goal_title ? ` [${r.goal_title}]` : '';
        const text = (r.content || '').replace(/\s+/g, ' ').trim();
        return `- ${date}${goal}: ${text}`;
      })
      .join('\n')
      .slice(0, 1000);

    const user = `
Compose a weekly check-in message for a Telegram productivity bot.

INPUT: Recent reflections from the last 7 days (may be empty):
${hasReflections ? rows : '(no reflections found in the last 7 days)'}

OUTPUT FORMAT (Markdown, not MarkdownV2):
1) First line: **Weekly Reflection**
2) If reflections exist: 2–3 sentences of feedback summarizing themes, progress, and blockers (be specific, concise, and tone-aligned).
   If none: 1 sentence prompting them to reflect next week (tone-aligned).
3) Then exactly 3 numbered questions:
   1. Biggest win this week?
   2. Biggest challenge or setback?
   3. One lesson + your next step for next week.
4) Last line: Reply here with your answers.

STRICT RULES:
- ≤130 words total.
- Use Markdown for the title and numbering only.
- No links, no hashtags, no code fences.
- Do not echo the input.
- Keep language clear and plain.
- Respect the tone’s emoji policy.
`.trim();

    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  },
};