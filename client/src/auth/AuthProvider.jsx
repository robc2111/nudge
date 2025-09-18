import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { logoutBus } from './logoutBus';
import { AuthCtx } from './auth-context';

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function clearCaches() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('gc:user');
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('gc:dashboard:')) localStorage.removeItem(k);
    });
  } catch (e) {
    console.warn('[auth] clearCaches failed:', e);
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? safeParse(raw) : null;
  });

  const logout = useCallback(() => {
    clearCaches();
    setUser(null);
  }, []);

  const login = useCallback((u, token) => {
    if (token) localStorage.setItem('token', token);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    setUser(u || null);
  }, []);

  // Keep tabs in sync + react to 401s from axios interceptor
  useEffect(() => {
    const onStorage = (e) => {
      if (e.storageArea !== localStorage) return;
      if (e.key === 'user' || e.key === 'token') {
        const raw = localStorage.getItem('user');
        setUser(raw ? safeParse(raw) : null);
      }
    };
    window.addEventListener('storage', onStorage);
    const off = logoutBus.on(() => logout());
    return () => {
      window.removeEventListener('storage', onStorage);
      off();
    };
  }, [logout]);

  // Hydrate on refresh: token exists but user is missing
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || user) return;
    api
      .get('/users/me')
      .then((res) => {
        const me = res.data;
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      })
      .catch(() => {
        // 401 handled by axios interceptor
      });
  }, [user]);

  const value = useMemo(
    () => ({ user, setUser, login, logout }),
    [user, login, logout]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
