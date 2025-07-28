//auth.js
export const getToken = () => localStorage.getItem('token');

export const isAuthenticated = () => !!getToken();

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};