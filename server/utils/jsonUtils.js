// utils/jsonUtils.js
function extractJsonObject(text = '') {
  if (!text || typeof text !== 'string') return null;

  // 1) If the model returned a fenced block ```json ... ```
  const fence = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fence && fence[1]) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }

  // 2) Try plain parse
  try { return JSON.parse(text.trim()); } catch {}

  // 3) Last resort: find the first balanced {...}
  const s = text;
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch {}
      }
    }
  }
  return null;
}

module.exports = { extractJsonObject };