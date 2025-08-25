// server/prompts/index.js
const goalGeneration = require('./goalGeneration');
const editGoal = require('./editGoal');
const mtBreakdown = require('./mtBreakdown');
const telegramMessages = require('./telegramMessages');
const weeklyCheckins = require('./weeklyCheckins');

const systemPrompts = {
  goalBreakdown: { model: 'gpt-4', temperature: 0.4, prompt: goalGeneration },
  editGoal: { model: 'gpt-4', temperature: 0.3, prompt: editGoal },
  microtaskBreakdown: { model: 'gpt-4', temperature: 0.5, prompt: mtBreakdown },
  telegramMessages: { model: 'gpt-4', temperature: 0.8, promptMap: telegramMessages },

  // NEW: reflections-aware weekly check-ins
  weeklyCheckins: {
    model: weeklyCheckins.model,
    temperature: weeklyCheckins.temperature,
    buildChat: ({ tone = 'friendly', reflections = [] } = {}) => {
      const system = telegramMessages[tone] || telegramMessages.friendly;
      const userMsgs = weeklyCheckins.buildMessages({ tone, reflections });
      return [{ role: 'system', content: system }, ...userMsgs];
    },
  },
};

module.exports = systemPrompts;