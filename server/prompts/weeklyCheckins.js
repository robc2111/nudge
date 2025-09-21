// server/prompts/weeklyCheckins.js
// Generates short, tone-aware weekly reflection prompts for Telegram,
// including recent reflections and microtasks completed this week.

const { escapeTgMarkdown } = require('../utils/telegram');
const { DateTime } = require('luxon');

module.exports = {
  model: 'gpt-4',
  temperature: 0.5,

  /**
   * Build chat messages for OpenAI given tone + recent reflections + completed items.
   * @param {Object} opts
   * @param {'friendly'|'strict'|'motivational'} [opts.tone='friendly']
   * @param {Array<{created_at:string, goal_title?:string, content:string}>} [opts.reflections=[]]
   * @param {Array<{done_at:string, goal_title?:string, task_title?:string, micro_title:string}>} [opts.completed=[]]
   * @returns {Array<{role:'system'|'user', content:string}>}
   */
  buildMessages: ({
    tone = 'friendly',
    reflections = [],
    completed = [],
  } = {}) => {
    const compact = (s, n = 1000) => (s || '').slice(0, n);

    // Reflections context (last 8 days, escape user content + titles for Telegram Markdown)
    const cutoff = DateTime.now().minus({ days: 8 });
    const reflRows = reflections
      .filter((r) => {
        const dt = DateTime.fromISO(r.created_at, { zone: 'utc' });
        return dt.isValid && dt >= cutoff;
      })
      .map((r) => {
        const date = (r.created_at || '').toString().slice(0, 10);
        const goal = r.goal_title ? ` [${escapeTgMarkdown(r.goal_title)}]` : '';
        const text = escapeTgMarkdown(
          (r.content || '').replace(/\s+/g, ' ').trim()
        );
        return `- ${date}${goal}: ${text}`;
      })
      .join('\n');

    // Completed microtasks context (escape titles)
    const compRows = completed
      .slice(0, 12)
      .map((c) => {
        const d = (c.done_at || '').toString().slice(0, 10);
        const g = c.goal_title ? ` [${escapeTgMarkdown(c.goal_title)}]` : '';
        const t = c.task_title ? ` — ${escapeTgMarkdown(c.task_title)}` : '';
        const micro = escapeTgMarkdown(c.micro_title || '');
        return `• ${d}${g}${t}: ${micro}`;
      })
      .join('\n');

    const hasReflections = reflections.length > 0;
    const hasCompleted = completed.length > 0;

    const system = `You are a short, clear coaching assistant. Match the user's selected tone: "${tone}". Keep replies helpful, specific, and concise.`;

    const user = `
Compose a weekly check-in message for a Telegram productivity bot.

INPUT: Recent reflections from the last 8 days (may be empty):
${hasReflections ? compact(reflRows) : '(no reflections found in the last 7 days)'}
INPUT: Microtasks completed in the last 7 days (may be empty):
${hasCompleted ? compact(compRows) : '(no microtasks marked done in the last 7 days)'}

OUTPUT FORMAT (Markdown, not MarkdownV2):
1) First line: **Weekly Reflection**
2) If reflections exist: 2–3 sentences of feedback summarizing themes, progress, and blockers (tone-aligned).
   If none: 1 sentence prompting them to reflect next week (tone-aligned).
3) If completed items exist: add a very short "Done this week:" line and list up to 5 bullets (microtask titles only, no dates).
4) Then exactly 3 numbered questions:
   1. Biggest win this week?
   2. Biggest challenge or setback?
   3. One lesson + your next step for next week.
5) Last line: Reply here with your answers.

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

// Backward compatibility alias for older callers
module.exports.buildChat = module.exports.buildMessages;
