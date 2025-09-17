// src/api/axios.js
import axios from 'axios';
import { logoutBus } from '../auth/logoutBus';

const rawBase = import.meta.env.VITE_API_URL || '';
const base = rawBase ? rawBase.replace(/\/$/, '') : '';

if (!base && import.meta.env.DEV) {
  console.warn(
    '⚠️ VITE_API_URL is not set. API requests will be relative to the current origin.'
  );
}

const instance = axios.create({
  baseURL: `${base}/api`,
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirecting = false;
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    // If unauthorized, clear session and bounce to login
    if (err?.response?.status === 401 && !redirecting) {
      redirecting = true;
      logoutBus.emit();
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const here = window.location.pathname + window.location.search;
      const onLogin = window.location.pathname === '/login';
      if (!onLogin) {
        const from = encodeURIComponent(here);
        window.location.replace(`/login?from=${from}`);
      } else {
        // If we're already on login, avoid redirect loop
        redirecting = false;
      }
    }
    return Promise.reject(err);
  }
);

if (import.meta.env.DEV) {
  console.log('🌍 Axios base URL:', instance.defaults.baseURL);
}

export default instance;
