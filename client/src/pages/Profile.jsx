// src/pages/Profile.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const REQ_TIMEOUT_MS = 15000;

// at top of Profile.jsx
const supportedTZ = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : [
      'Etc/UTC','Europe/London','Europe/Paris','America/New_York','America/Chicago',
      'America/Denver','America/Los_Angeles','Asia/Tokyo','Asia/Singapore','Australia/Sydney'
    ];

function guessBrowserTZ() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
  } catch { return 'Etc/UTC'; }
}


function UpgradeButton() {
  const onUpgrade = async () => {
    try {
      const { data } = await axios.post('/payments/checkout', {}); // token auto‑injected
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not start checkout');
      }
    } catch (err) {
      console.error(err);
      toast.error('Checkout failed');
    }
  };

  return <button className="cta-button" onClick={onUpgrade}>🚀 Upgrade to Pro</button>;
}

function ManageSubscriptionButton() {
  const onManage = async () => {
    try {
      const { data } = await axios.post('/payments/portal', {});
      if (data?.url) window.location.href = data.url;
      else toast.error('Could not open billing portal');
    } catch (e) {
      console.error(e);
      toast.error('Could not open billing portal');
    }
  };
  return <button className="cta-button" onClick={onManage}>🧾 Manage Subscription</button>;
}



export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchCtrl = useRef(null);
  const [tz, setTz] = useState('');
const [savingTz, setSavingTz] = useState(false);

async function saveTimezone() {
  if (!tz) return;
  setSavingTz(true);
  try {
    const { data } = await axios.patch('/users/me', { timezone: tz });
    setUser(data);
    // optional: toast
    toast.success('Timezone updated');
  } catch (e) {
    console.error(e);
    toast.error('Failed to update timezone');
  } finally {
    setSavingTz(false);
  }
}


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
setTz(res.data.timezone || guessBrowserTZ());

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

        <div>
          <label className="block font-medium mb-1">Plan</label>
          <p className="p-3 border border-gray-300 rounded bg-gray-50 flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 rounded ${
              (user?.plan === 'pro') ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'
            }`}>
              {user?.plan || 'free'}
            </span>
            <span className="text-sm text-gray-600">({user?.plan_status || 'inactive'})</span>
          </p>
        </div>
      </div>

      {/* Timezone */}
<div>
  <label className="block font-medium mb-1">Timezone</label>
  <div className="flex gap-2">
    <select
      className="flex-1 border border-gray-300 p-2 rounded"
      value={tz}
      onChange={(e) => setTz(e.target.value)}
    >
      {(!supportedTZ.includes(tz)) && <option value={tz}>{tz}</option>}
      {supportedTZ.map(z => <option key={z} value={z}>{z}</option>)}
    </select>
    <button
      className="btn bg-gray-800 text-white px-3 rounded disabled:opacity-60"
      onClick={saveTimezone}
      disabled={savingTz}
      title="Save timezone"
    >
      {savingTz ? 'Saving…' : 'Save'}
    </button>
  </div>
  {!user?.timezone && (
    <p className="text-sm text-gray-500 mt-1">
      Defaulting to your browser timezone: <code>{guessBrowserTZ()}</code>
    </p>
  )}
</div>


      {/* Actions */}
         <div className="flex flex-wrap gap-3 mt-6 justify-center">
     <Link to="/dashboard" className="btn bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
       📋 My Dashboard
     </Link>
     <Link to="/goal-setup" className="btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
       ➕ Add New Goal
     </Link>
{user?.plan === 'pro' ? <ManageSubscriptionButton /> : <UpgradeButton />}
   </div>
    </div>
  );
}