// src/lib/entitlements.js
export const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function planKey(user) {
  return user?.plan === 'pro' &&
    PAID_STATUSES.has((user?.plan_status || '').toLowerCase())
    ? 'pro'
    : 'free';
}

const ENTITLEMENTS = {
  free: {
    dailyReminders: true,
    weeklyCheckin: true,
    personalizedMessages: false,
    activeGoals: 1,
  },
  pro: {
    dailyReminders: true,
    weeklyCheckin: true,
    personalizedMessages: true,
    activeGoals: 9999,
  },
};

export function can(user, feature) {
  return !!ENTITLEMENTS[planKey(user)]?.[feature];
}

export function limit(user, key) {
  return ENTITLEMENTS[planKey(user)]?.[key];
}
