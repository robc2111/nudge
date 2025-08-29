import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { setSEO } from '../lib/seo';

const REQ_TIMEOUT_MS = 15000;

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
      const { data } = await axios.post('/payments/checkout', {});
      if (data?.url) window.location.href = data.url;
      else toast.error('Could not start checkout');
    } catch (err) {
      console.error(err);
      toast.error('Checkout failed');
    }
  };
  return <button className="btn" onClick={onUpgrade}>🚀 Upgrade to Pro</button>;
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
  return <button className="btn" onClick={onManage}>🧾 Manage Subscription</button>;
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchCtrl = useRef(null);
  const location = useLocation();

  const [tz, setTz] = useState('');
  const [savingTz, setSavingTz] = useState(false);

  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [savingTel, setSavingTel] = useState(false);

  useEffect(() => {
    setSEO({
      title: 'Your Profile - GoalCrumbs',
      description: 'Manage your account, billing and preferences for GoalCrumbs.',
    });
  }, []);

  async function saveTimezone() {
    if (!tz) return;
    setSavingTz(true);
    try {
      const { data } = await axios.patch('/users/me', { timezone: tz });
      setUser(data);
      toast.success('Timezone updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update timezone');
    } finally {
      setSavingTz(false);
    }
  }

  async function saveTelegramEnabled(next) {
    setSavingTel(true);
    try {
      const { data } = await axios.patch('/users/me', { telegram_enabled: next });
      setUser(data);
      toast.success(next ? 'Telegram reminders enabled' : 'Telegram reminders disabled');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update Telegram preference');
      setTelegramEnabled((prev) => !prev); // revert UI if failed
    } finally {
      setSavingTel(false);
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
        // keep plan fresh if returning from Stripe
        await axios.post('/payments/sync-plan').catch(() => {});

        const res = await axios.get('/users/me', {
          signal: controller.signal,
          timeout: REQ_TIMEOUT_MS,
        });

        setUser(res.data);
        setTz(res.data.timezone || guessBrowserTZ());
        setTelegramEnabled(res.data.telegram_enabled !== false);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        console.error('❌ Error loading your profile:', err);
        setError('Failed to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [location.key]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading your profile…</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">⚠️ Error</h1>
        <p style={{ marginBottom: '1rem' }}>{error}</p>
        <Link to="/login" className="btn">🔐 Log In</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
      <div className="auth-card">
        <h1 className="auth-title">👤 Your Profile</h1>
        {error && <p className="auth-error">{error}</p>}

        {/* Username */}
        <div className="form-row">
          <label className="form-label">Username</label>
          <input className="form-input" value={user?.name || '—'} readOnly />
        </div>

        {/* Email */}
        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="form-input" value={user?.email || '—'} readOnly />
        </div>

        {/* Telegram */}
        <div className="form-row">
          <label className="form-label">Telegram ID</label>
          <input className="form-input" value={user?.telegram_id || 'Not connected'} readOnly />
        </div>

        {/* Plan */}
        <div className="form-row">
          <label className="form-label">Plan</label>
          <input
            className="form-input"
            value={`${user?.plan || 'free'} (${user?.plan_status || 'inactive'})`}
            readOnly
          />
        </div>

        {/* Timezone */}
        <div className="form-row">
          <label className="form-label">Timezone</label>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-input"
              style={{ maxWidth: 360 }}
              value={tz}
              onChange={(e) => setTz(e.target.value)}
            >
              {!supportedTZ.includes(tz) && <option value={tz}>{tz}</option>}
              {supportedTZ.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <button
              className={`btn ${savingTz ? 'btn-disabled' : ''}`}
              onClick={saveTimezone}
              disabled={savingTz}
            >
              {savingTz ? 'Saving…' : 'Save'}
            </button>
          </div>
          {!user?.timezone && (
            <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
              Defaulting to your browser timezone: <code>{guessBrowserTZ()}</code>
            </div>
          )}
        </div>

        {/* Telegram reminders toggle */}
        <div className="form-row">
          <label className="form-label">Telegram reminders</label>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              id="tg-enabled"
              type="checkbox"
              checked={telegramEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                setTelegramEnabled(next);
                saveTelegramEnabled(next);
              }}
              disabled={savingTel}
            />
            <label htmlFor="tg-enabled">
              {telegramEnabled ? 'Enabled' : 'Disabled'}
            </label>
          </div>
          <div style={{ marginTop: 6, color: '#666', fontSize: '0.9rem' }}>
            Turn off to stop GoalCrumbs from sending you reminders on Telegram.
          </div>
        </div>
      </div>

      {/* Buttons row below the card */}
      <div className="profile-buttons" style={{ gap: '2.5rem', marginTop: '2rem' }}>
        <Link to="/dashboard" className="btn">📋 My Dashboard</Link>
        <Link to="/reflections" className="btn">📝 Reflections</Link>
        <Link to="/goal-setup" className="btn">➕ Add New Goal</Link>
        {user?.plan === 'pro' ? <ManageSubscriptionButton /> : <UpgradeButton />}
      </div>
    </div>
  );
}