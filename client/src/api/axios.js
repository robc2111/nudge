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
  timeout: 15000,
  withCredentials: false, // JWT in headers
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let redirecting = false;

function clearAppCaches() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('gc:user');
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('gc:dashboard:')) localStorage.removeItem(k);
    });
  } catch (e) {
    // non-fatal; some environments block storage
    console.warn('[axios] clearAppCaches failed:', e);
  }
}

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if ((status === 401 || status === 419 || status === 440) && !redirecting) {
      redirecting = true;

      // Tell the app to log out (AuthProvider listens)
      logoutBus.emit();

      // Fallback clean-up
      clearAppCaches();

      const here =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      const onLogin = window.location.pathname === '/login';
      if (!onLogin) {
        window.location.replace(
          `/login?reason=expired&from=${encodeURIComponent(here)}`
        );
      } else {
        redirecting = false; // avoid loop if already on /login
      }
    }

    return Promise.reject(err);
  }
);

if (import.meta.env.DEV) {
  console.log('🌍 Axios base URL:', instance.defaults.baseURL);
}

export default instance;
