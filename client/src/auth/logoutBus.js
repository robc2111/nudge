// src/auth/logoutBus.js
export const logoutBus = {
  subs: new Set(),
  on(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  },
  emit() {
    this.subs.forEach((fn) => fn());
  },
};
