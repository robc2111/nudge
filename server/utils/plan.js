// server/utils/plan.js
// Central entitlements + helpers used across the server.

const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);

const ENTITLEMENTS = {
  free: {
    dailyReminders: true,
    weeklyCheckin: true,
    personalizedMessages: false, // generic copy
    activeGoals: 1, // max active goals
  },
  pro: {
    dailyReminders: true,
    weeklyCheckin: true,
    personalizedMessages: true, // tailored copy
    activeGoals: 9999, // effectively unlimited
  },
};

function planKeyFromRow(rowOrString) {
  if (typeof rowOrString === 'string') {
    return rowOrString.toLowerCase() === 'pro' ? 'pro' : 'free';
  }
  const plan = (rowOrString?.plan || 'free').toLowerCase();
  const status = (rowOrString?.plan_status || 'inactive').toLowerCase();
  return plan === 'pro' && PAID_STATUSES.has(status) ? 'pro' : 'free';
}

function limitsFor(rowOrString) {
  const key = planKeyFromRow(rowOrString);
  return { activeGoals: ENTITLEMENTS[key].activeGoals };
}

function can(rowOrString, feature) {
  const key = planKeyFromRow(rowOrString);
  return !!ENTITLEMENTS[key]?.[feature];
}

function isPro(rowOrString) {
  return planKeyFromRow(rowOrString) === 'pro';
}

module.exports = {
  ENTITLEMENTS,
  PAID_STATUSES,
  limitsFor,
  can,
  isPro,
  planKeyFromRow,
};
