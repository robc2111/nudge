// src/utils/auth.js

// ====== Getters ======
export const getToken = () => localStorage.getItem('token') || null;

export const getUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => !!getToken();

// ====== Setters ======
export const setAuth = (token, user) => {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

export const updateUser = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

// ====== Clear / Logout ======
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const logout = (redirectTo = '/login') => {
  clearAuth();
  // Redirect handled here for convenience, but can be optional
  if (redirectTo) window.location.href = redirectTo;
};