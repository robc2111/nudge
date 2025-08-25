//sorters.js

export const sortByStatusThenIndex = (arr = []) => {
  const rank = { in_progress: 0, todo: 1, not_started: 1, done: 2 };
  return [...arr].sort((a, b) => {
    const byStatus = (rank[a?.status] ?? 99) - (rank[b?.status] ?? 99);
    if (byStatus !== 0) return byStatus;
    const ai = Number(a?.order_index ?? Number.MAX_SAFE_INTEGER);
    const bi = Number(b?.order_index ?? Number.MAX_SAFE_INTEGER);
    // stable tie-breaks:
    if (ai !== bi) return ai - bi;
    if (a?.created_at && b?.created_at) {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    return String(a?.title || "").localeCompare(String(b?.title || ""));
  });
};

export const sortByPosition = (arr = []) =>
  [...arr].sort((a, b) => {
    const ap = Number(a?.position ?? Number.MAX_SAFE_INTEGER);
    const bp = Number(b?.position ?? Number.MAX_SAFE_INTEGER);
    if (ap !== bp) return ap - bp;
    return Number(a?.id ?? 0) - Number(b?.id ?? 0);
  });