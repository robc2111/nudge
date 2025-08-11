// prompts/index.js
// ✅ Create a new file: prompts/index.js

const goalGeneration = require('./goalGeneration');
const editGoal = require('./editGoal');
const mtBreakdown = require('./mtBreakdown');
const telegramMessages = require('./telegramMessages');

const systemPrompts = {
  goalBreakdown: {
    model: 'gpt-4',
    temperature: 0.4,
    prompt: goalGeneration,
  },
  editGoal: {
    model: 'gpt-4',
    temperature: 0.3,
    prompt: editGoal,
  },
  microtaskBreakdown: {
    model: 'gpt-4',
    temperature: 0.5,
    prompt: mtBreakdown,
  },
  telegramMessages: {
    model: 'gpt-4',
    temperature: 0.8,
    promptMap: telegramMessages,
  },
};

module.exports = systemPrompts;