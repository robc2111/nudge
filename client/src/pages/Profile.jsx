// src/pages/Profile.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';

const REQ_TIMEOUT_MS = 15000;

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchCtrl = useRef(null);

  useEffect(() => {
    if (fetchCtrl.current) fetchCtrl.current.abort();
    const controller = new AbortController();
    fetchCtrl.current = controller;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/users/me', {
          signal: controller.signal,
          timeout: REQ_TIMEOUT_MS,
        });
        setUser(res.data);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        console.error('❌ Error loading user:', err);
        setError('Failed to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading your profile…</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-bold mb-2">⚠️ Error</h1>
        <p className="mb-4">{error}</p>
        <Link
          to="/login"
          className="btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🔐 Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6 text-center">👤 Your Profile</h1>

      {error && (
        <p className="text-red-600 text-center mb-4">{error}</p>
      )}

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="block font-medium mb-1">Username</label>
          <p className="p-3 border border-gray-300 rounded bg-gray-50">
            {user?.name || '—'}
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block font-medium mb-1">Email</label>
          <p className="p-3 border border-gray-300 rounded bg-gray-50">
            {user?.email || '—'}
          </p>
        </div>

        {/* Telegram */}
        <div>
          <label className="block font-medium mb-1">Telegram ID</label>
          <p className="p-3 border border-gray-300 rounded bg-gray-50">
            {user?.telegram_id || 'Not connected'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6 justify-center">
        <Link
          to="/dashboard"
          className="btn bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          📋 My Dashboard
        </Link>
        <Link
          to="/goal-setup"
          className="btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Add New Goal
        </Link>
      </div>
    </div>
  );
}