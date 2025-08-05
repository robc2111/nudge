//axios.js
// axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`,
  withCredentials: true,
});

// ✅ Automatically attach JWT token from localStorage
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
console.log('🌍 Axios base URL:', instance.defaults.baseURL);
export default instance;