// server/lib/entitlements.js
const ENTITLEMENTS = {
  free: {
    telegramReminders: true, // example
    weeklyCheckin: false,
    maxGoals: 3,
    exportData: true,
  },
  pro: {
    telegramReminders: true,
    weeklyCheckin: true,
    maxGoals: 999,
    exportData: true,
  },
};

// Only treat these statuses as paid/Pro
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);
// If you want to block on past_due, remove it from the set.

function planKey(user) {
  return user?.plan === 'pro' && PAID_STATUSES.has(user?.plan_status)
    ? 'pro'
    : 'free';
}

function can(user, feature) {
  const key = planKey(user);
  return Boolean(ENTITLEMENTS[key]?.[feature]);
}

function limit(user, thing) {
  const key = planKey(user);
  return ENTITLEMENTS[key]?.[thing];
}

module.exports = { can, limit, planKey, ENTITLEMENTS, PAID_STATUSES };
