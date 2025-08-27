// server/prompts/index.js
const goalGeneration   = require('./goalGeneration');
const editGoal         = require('./editGoal');
const mtBreakdown      = require('./mtBreakdown');
const telegramMessages = require('./telegramMessages');
const weeklyCheckins   = require('./weeklyCheckins');

/**
 * Central registry of prompt configs.
 * - For weekly check-ins we pass straight through to the module’s buildMessages,
 *   which already returns the full [{role, content}, ...] messages array.
 */
const systemPrompts = {
  goalBreakdown:      { model: 'gpt-4', temperature: 0.4, prompt: goalGeneration },
  editGoal:           { model: 'gpt-4', temperature: 0.3, prompt: editGoal },
  microtaskBreakdown: { model: 'gpt-4', temperature: 0.5, prompt: mtBreakdown },

  // These mappings are still useful elsewhere in the app.
  telegramMessages:   { model: 'gpt-4', temperature: 0.8, promptMap: telegramMessages },

  // Weekly check-ins (reflections-aware, includes “done this week” list).
  weeklyCheckins: {
    model: weeklyCheckins.model,
    temperature: weeklyCheckins.temperature,
    buildMessages: weeklyCheckins.buildMessages, // direct passthrough
  },
};

module.exports = systemPrompts;