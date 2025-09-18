import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import DeleteAccountSection from '../components/DeleteAccountSection';
import { setSEO, seoPresets } from '../lib/seo';

const PROMO_DEADLINE_MS = new Date('2025-10-31T23:59:59Z').getTime();
const promoActive = Date.now() <= PROMO_DEADLINE_MS;

const REQ_TIMEOUT_MS = 15000;

const supportedTZ =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [
        'Etc/UTC',
        'Europe/London',
        'Europe/Paris',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Asia/Tokyo',
        'Asia/Singapore',
        'Australia/Sydney',
      ];

function guessBrowserTZ() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
  } catch {
    return 'Etc/UTC';
  }
}

function UpgradeButton() {
  const [busy, setBusy] = useState(false);

  const onUpgrade = async () => {
    try {
      setBusy(true);
      const { data } = await axios.post('/payments/checkout', {});
      if (data?.url) window.location.href = data.url;
      else toast.error('Could not start checkout');
    } catch (err) {
      console.error(err);
      toast.error('Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn" onClick={onUpgrade} disabled={busy}>
      {busy
        ? 'Redirecting…'
        : promoActive
          ? '🚀 Upgrade to Pro – £5/mo (until 31 Oct)'
          : '🚀 Upgrade to Pro – £8.99/mo'}
    </button>
  );
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
  return (
    <button className="btn" onClick={onManage}>
      🧾 Manage Subscription
    </button>
  );
}

function friendlyProfileError(codeOrMsg) {
  const code = String(codeOrMsg || '').toUpperCase();
  if (code === 'USER_NOT_FOUND') return 'We could not find your account.';
  if (code === 'ACCOUNT_DELETED') return 'This account has been deleted.';
  if (code === 'PROFILE_LOAD_FAILED') return 'Failed to load your profile.';
  return codeOrMsg || 'Failed to load your profile.';
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
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setSEO({
      title: 'Profile – GoalCrumbs',
      description:
        'Manage your GoalCrumbs account: timezone, Telegram reminders, and subscription settings.',
      url: `${seoPresets.baseUrl}/profile`,
      image: '/og/mouseog.png',
      noindex: true,
    });
  }, []);

  async function saveTimezone() {
    if (!tz) return;
    setSavingTz(true);
    setStatusMsg('Saving timezone…');
    try {
      const { data } = await axios.patch('/users/me', { timezone: tz });
      setUser(data);
      toast.success('Timezone updated');
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.error === 'INVALID_TIMEZONE'
          ? 'Please choose a valid timezone.'
          : 'Failed to update timezone'
      );
    } finally {
      setSavingTz(false);
      setStatusMsg('');
    }
  }

  async function saveTelegramEnabled(next) {
    setSavingTel(true);
    setStatusMsg(next ? 'Enabling Telegram…' : 'Disabling Telegram…');
    try {
      const { data } = await axios.patch('/users/me', {
        telegram_enabled: next,
      });
      setUser(data);
      toast.success(
        next ? 'Telegram reminders enabled' : 'Telegram reminders disabled'
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to update Telegram preference');
      setTelegramEnabled((prev) => !prev);
    } finally {
      setSavingTel(false);
      setStatusMsg('');
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
        await axios.post('/payments/sync-plan').catch(() => {});
        const res = await axios.get('/users/me', {
          signal: controller.signal,
          timeout: REQ_TIMEOUT_MS,
        });

        setUser(res.data);
        setTz(res.data.timezone || guessBrowserTZ());
        setTelegramEnabled(res.data.telegram_enabled !== false);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED')
          return;

        const raw =
          err.response?.data?.error || err.response?.statusText || err.message;

        const msg = !navigator.onLine
          ? 'You appear to be offline.'
          : err.code === 'ECONNABORTED'
            ? 'Request timed out. Please try again.'
            : friendlyProfileError(raw);

        console.error('❌ Error loading your profile:', err);
        setError(msg);
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
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={() => window.location.reload()}>
            🔄 Try again
          </button>
          <Link to="/login" className="btn">
            🔐 Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <div className="auth-card">
        <h1 className="auth-title">👤 Your Profile</h1>
        {error && <p className="auth-error">{error}</p>}

        <div className="form-row">
          <label className="form-label">Username</label>
          <input className="form-input" value={user?.name || '—'} readOnly />
        </div>

        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="form-input" value={user?.email || '—'} readOnly />
        </div>

        <div className="form-row">
          <label className="form-label">Telegram ID</label>
          <input
            className="form-input"
            value={user?.telegram_id || 'Not connected'}
            readOnly
          />
        </div>

        <div className="form-row">
          <label className="form-label">Plan</label>
          <input
            className="form-input"
            value={`${user?.plan || 'free'} (${user?.plan_status || 'inactive'})`}
            readOnly
          />
        </div>

        <div className="form-row">
          <label className="form-label">Timezone</label>
          <div
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <select
              className="form-input"
              style={{ maxWidth: 360 }}
              value={tz}
              onChange={(e) => setTz(e.target.value)}
            >
              {!supportedTZ.includes(tz) && <option value={tz}>{tz}</option>}
              {supportedTZ.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <button
              className={`btn ${savingTz ? 'btn-disabled' : ''}`}
              onClick={saveTimezone}
              disabled={savingTz}
              aria-busy={savingTz || undefined}
              type="button"
            >
              {savingTz ? 'Saving…' : 'Save'}
            </button>
          </div>
          {!user?.timezone && (
            <div
              style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}
            >
              Defaulting to your browser timezone:{' '}
              <code>{guessBrowserTZ()}</code>
            </div>
          )}
        </div>

        <div className="form-row">
          <label className="form-label">Telegram reminders</label>
          <div
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
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
          <p className="visually-hidden" aria-live="polite">
            {statusMsg}
          </p>
        </div>
      </div>

      <div
        className="profile-buttons"
        style={{ gap: '2.5rem', marginTop: '2rem' }}
      >
        <Link to="/dashboard" className="btn">
          📋 My Dashboard
        </Link>
        <Link to="/reflections" className="btn">
          📝 Reflections
        </Link>
        <Link to="/goal-setup" className="btn">
          ➕ Add New Goal
        </Link>
        {user?.plan === 'pro' ? (
          <ManageSubscriptionButton />
        ) : (
          <UpgradeButton />
        )}
        {user && <DeleteAccountSection />}
      </div>
    </div>
  );
}
