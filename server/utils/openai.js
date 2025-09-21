// server/utils/openai.js
const OpenAI = require('openai');

const ENV = (process.env.OPENAI_ENV || 'dev').toLowerCase(); // 'prod' | 'dev'

function pickEnv(prodVal, devVal) {
  return ENV === 'prod' ? prodVal : devVal;
}

// Priority order:
// 1) OPENAI_API_KEY_PROD/OPENAI_API_KEY_DEV (env-specific)
// 2) OPENAI_API_KEY (global fallback)
const envKey = pickEnv(
  process.env.OPENAI_API_KEY_PROD,
  process.env.OPENAI_API_KEY_DEV
);
const apiKey = envKey || process.env.OPENAI_API_KEY || '';

const organization = process.env.OPENAI_ORG_ID || undefined;

// `project` is supported by the modern OpenAI SDK
const project =
  pickEnv(
    process.env.OPENAI_PROJECT_ID_PROD,
    process.env.OPENAI_PROJECT_ID_DEV
  ) ||
  process.env.OPENAI_PROJECT_ID ||
  undefined;

// Lazy singleton so the app can boot even if the key is missing;
// callers will get a clear error when they actually try to use it.
let _client = null;

function getClient() {
  if (_client) return _client;
  if (!apiKey) {
    const hint =
      ENV === 'prod'
        ? 'Set OPENAI_API_KEY_PROD (or OPENAI_API_KEY).'
        : 'Set OPENAI_API_KEY_DEV (or OPENAI_API_KEY).';
    const msg = `[openai] Missing API key for env "${ENV}". ${hint}`;
    // Throwing here gives a clear error only when code tries to use OpenAI.
    const err = new Error(msg);
    err.code = 'OPENAI_MISSING_KEY';
    throw err;
  }
  _client = new OpenAI({
    apiKey,
    organization, // optional
    project, // optional, but supported
  });
  return _client;
}

// If you want to add a small helper for headers (rarely needed now)
function projectHeaders() {
  // Most endpoints respect the top-level `project` option; this is here
  // only if you pin an older SDK or need custom headers.
  return project ? { 'OpenAI-Project': project } : {};
}

module.exports = {
  getClient,
  projectHeaders,
  ENV,
  defaultModels: {
    chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    embed: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
  },
};
