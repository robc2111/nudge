// src/auth/AuthProvider.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { logoutBus } from './logoutBus';
import { AuthCtx } from './auth-context';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = (u, token) => {
    if (token) localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  // keep tabs in sync + react to 401s
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'token') {
        const raw = localStorage.getItem('user');
        setUser(raw ? JSON.parse(raw) : null);
      }
    };
    window.addEventListener('storage', onStorage);
    const off = logoutBus.on(() => logout());
    return () => {
      window.removeEventListener('storage', onStorage);
      off();
    };
  }, []);

  // hydrate on refresh: if we have a token but no user, fetch me
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || user) return;
    api
      .get('/users/me')
      .then((res) => {
        setUser(res.data); // adjust if your API returns {user: {...}}
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch(() => {
        /* 401 handled by interceptor */
      });
  }, [user]);

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
