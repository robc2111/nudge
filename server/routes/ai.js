// server/routes/ai.js
const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth');
const { aiBudgetGuard } = require('../middleware/aiBudget');

const { getClient, projectHeaders, defaultModels } = require('../utils/openai');
const { logOpenAIUsage } = require('../utils/aiUsageLogger');

const systemPrompts = require('../prompts');
const { model: breakdownModel, temperature: breakdownTemp } =
  systemPrompts.goalBreakdown;

const { validate } = require('../validation/middleware');
const { GoalBreakdownBody, IdParam } = require('../validation/schemas');

const { regenerateBreakdown } = require('../controllers/aiController');

/* ------------------------------- Helpers ------------------------------- */

function stripCodeFences(s = '') {
  // Handles ```json ... ``` or ``` ... ```
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : s.trim();
}

function tryParseJson(text) {
  const raw = stripCodeFences(text);

  // First, straight parse
  try {
    return JSON.parse(raw);
  } catch {
    // ignore
  }

  // Second, try to grab first {...} or [...] block
  const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {
      // ignore
    }
  }

  return null;
}

/* -------------------------- Goal breakdown (AI) ------------------------- */
/**
 * POST /api/ai/goal-breakdown
 * Body: { goal: string }
 * Returns JSON structure produced by the goalBreakdown prompt.
 */
router.post(
  '/goal-breakdown',
  optionalAuth, // attach req.user if token present (per-user caps)
  aiBudgetGuard, // enforce soft caps
  validate(GoalBreakdownBody, 'body'),
  async (req, res) => {
    const { goal } = req.body;
    const prompt = systemPrompts.goalBreakdown.prompt(goal);
    const model = breakdownModel || defaultModels.chat;
    const temperature = Number.isFinite(breakdownTemp) ? breakdownTemp : 0.3;

    let client;
    try {
      client = getClient(); // ← lazy init at request time
    } catch (e) {
      // e.g. our utils threw OPENAI_MISSING_KEY
      const msg = e?.message || 'OpenAI client not configured';
      console.error('[ai.goal-breakdown] getClient failed:', msg);
      return res.status(500).json({ error: msg });
    }

    try {
      const completion = await client.chat.completions.create(
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
        },
        { headers: projectHeaders() }
      );

      const content = completion.choices?.[0]?.message?.content ?? '';
      const parsed = tryParseJson(content);

      // Log usage (tokens & cost estimate if usage missing)
      const usage = completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
      };
      await logOpenAIUsage({
        userId: req.user?.id || null,
        event: 'chat.completions',
        model,
        tokensIn: usage.prompt_tokens || 0,
        tokensOut: usage.completion_tokens || 0,
        costUsd: null,
        meta: { request_id: completion.id || null, route: 'goal-breakdown' },
      });

      if (!parsed) {
        // Return friendly error + raw model output for debugging (server-side only logs)
        console.error('[ai.goal-breakdown] JSON parse failed. Raw:', content);
        return res.status(502).json({
          error: 'The AI did not return valid JSON.',
          hint: 'Please try again.',
        });
      }

      return res.json(parsed);
    } catch (err) {
      console.error(
        '🛑 AI Breakdown Error:',
        err?.response?.data || err.message
      );
      return res.status(500).json({ error: 'Failed to generate breakdown' });
    }
  }
);

/* ---------------------- Regenerate from existing goal ------------------- */
/**
 * POST /api/ai/goals/:id/regenerate
 * Delegates to your controller; still gets the benefits of auth/caps.
 */
router.post(
  '/goals/:id/regenerate',
  optionalAuth,
  aiBudgetGuard,
  validate(IdParam, 'params'),
  regenerateBreakdown
);

module.exports = router;
