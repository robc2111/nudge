// src/api/axios.js
import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL || '';
const base = rawBase ? rawBase.replace(/\/$/, '') : '';

if (!base && import.meta.env.DEV) {
  console.warn('⚠️ VITE_API_URL is not set. API requests will be relative to the current origin.');
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
    if (err?.response?.status === 401 && !redirecting) {
      redirecting = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const here = window.location.pathname + window.location.search;
      const onLogin = window.location.pathname === '/login';
      if (!onLogin) {
        const from = encodeURIComponent(here);
        window.location.replace(`/login?from=${from}`);
      }
    }
    return Promise.reject(err);
  }
);

if (import.meta.env.DEV) {
  console.log('🌍 Axios base URL:', instance.defaults.baseURL);
}

export default instance;