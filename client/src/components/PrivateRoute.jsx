// src/components/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function PrivateRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setStatus('unauth');
      return;
    }

    // Verify token with server
    api.get('/users/me')
      .then(() => setStatus('authed'))
      .catch(() => {
        // No need to remove token here — axios.js 401 handler will handle it
        setStatus('unauth');
      });
  }, []);

  if (status === 'checking') {
    return <div style={{ padding: '2rem' }}>Checking session…</div>;
  }

  if (status === 'unauth') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}