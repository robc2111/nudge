// client/src/utils/planGuard.js
export function isPro(plan, status) {
  const p = String(plan || '').toLowerCase();
  const s = String(status || '').toLowerCase();
  return (
    p === 'pro' &&
    [
      'active',
      'trialing',
      'past_due',
      'unpaid',
      'cancel_at_period_end',
    ].includes(s)
  );
}

export function getActiveGoalLimit(plan, status, freeLimit = 1) {
  return isPro(plan, status) ? Infinity : Number(freeLimit || 1);
}

export function atActiveGoalLimit(activeCount, plan, status, freeLimit = 1) {
  const limit = getActiveGoalLimit(plan, status, freeLimit);
  return limit !== Infinity && activeCount >= limit;
}
