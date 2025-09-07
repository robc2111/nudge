// server/monitoring/sentry.js
const Sentry = require('@sentry/node');

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn === 'your-sentry-dsn') {
    console.warn('[Sentry] DSN missing; Sentry disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.GIT_SHA || undefined,

    // Tracing: keep a small sample in prod; adjust later.
    tracesSampleRate: 0.1,

    // Profiling: disable for Node 23 (no prebuilts).
    profilesSampleRate: 0,
  });

  // Request middleware (new SDK) or fallback to legacy if present
  if (typeof Sentry.expressRequestHandler === 'function') {
    app.use(Sentry.expressRequestHandler());
  } else if (Sentry.Handlers?.requestHandler) {
    app.use(Sentry.Handlers.requestHandler());
  }

  // Tracing middleware is optional on v8; skip unless you specifically need it.
  // If you want it and your SDK exposes it:
  if (Sentry.Handlers?.tracingHandler) {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

function sentryErrorHandler(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn === 'your-sentry-dsn') return;

  // Error middleware (new SDK) or fallback to legacy if present
  if (typeof Sentry.expressErrorHandler === 'function') {
    app.use(Sentry.expressErrorHandler());
  } else if (Sentry.Handlers?.errorHandler) {
    app.use(Sentry.Handlers.errorHandler());
  }
}

module.exports = { initSentry, sentryErrorHandler };
