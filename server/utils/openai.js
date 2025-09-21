// server/utils/openai.js
const OpenAI = require('openai');

function pick(keyProd, keyDev, env) {
  return env === 'prod' ? keyProd : keyDev;
}

const ENV = (process.env.OPENAI_ENV || 'dev').toLowerCase();
const apiKey = pick(
  process.env.OPENAI_API_KEY_PROD,
  process.env.OPENAI_API_KEY_DEV,
  ENV
);
if (!apiKey) {
  console.warn('[openai] missing API key for env:', ENV);
}

const project = pick(
  process.env.OPENAI_PROJECT_ID_PROD,
  process.env.OPENAI_PROJECT_ID_DEV,
  ENV
);
const organization = process.env.OPENAI_ORG_ID || undefined;

const client = new OpenAI({
  apiKey,
  organization, // optional
  // project is not a top-level OpenAI SDK option for all endpoints;
  // we pass it via headers where supported (below).
});

function projectHeaders() {
  // Some endpoints read x-oa-project (depends on SDK version).
  // If unsupported, set the key at the project level in the dashboard.
  return project ? { 'OpenAI-Project': project } : {};
}

module.exports = {
  client,
  projectHeaders,
  ENV,
  defaultModels: {
    chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    embed: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
  },
};
