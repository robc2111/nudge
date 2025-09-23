// src/pages/signup.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/auth-context';
import { setSEO } from '../lib/seo';

const MIN_PASSWORD = 8;

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    telegram_id: '',
    password: '',
    agree: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showTgHelp, setShowTgHelp] = useState(false);

  useEffect(() => {
    setSEO({
      title: 'Create GoalCrumbs Account | GoalCrumbs',
      description:
        'Create your GoalCrumbs account to break big goals into tiny crumbs with AI nudges and a clean dashboard.',
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!form.name.trim()) return setError('Please enter a name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError('Please enter a valid email.');
    }
    if (form.password.length < MIN_PASSWORD) {
      return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    }
    if (!form.agree) {
      return setError(
        'You must agree to the Terms of Service and Privacy Policy.'
      );
    }

    // Sanitize telegram input to digits (numeric chat id only)
    let telegramId = form.telegram_id.trim();
    if (telegramId) {
      const digitsOnly = telegramId.replace(/\D/g, '');
      if (!digitsOnly) {
        return setError(
          'Telegram ID should be the numeric chat ID (see “What’s this?”).'
        );
      }
      telegramId = digitsOnly;
    } else {
      telegramId = null;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        telegram_id: telegramId,
        password: form.password,
      });

      login(res.data.user, res.data.token);

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.statusText ||
        err.message ||
        'Signup failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Create your GoalCrumbs account</h2>

      {error && <p className="auth-error">{error}</p>}
      {success && <p className="auth-success">🎉 Registration successful!</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block font-medium mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            className="form-input"
            disabled={submitting}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            className="form-input"
            disabled={submitting}
            required
          />
        </div>

        {/* Telegram */}
        <div>
          <div className="flex-between">
            <label htmlFor="telegram_id" className="block font-medium mb-1">
              Telegram ID (numeric)
            </label>
            <div>
              <button
                type="button"
                className="help-link"
                onClick={() => setShowTgHelp(true)}
                aria-haspopup="dialog"
                style={{ marginRight: 10 }}
              >
                What’s this?
              </button>
              <a
                className="help-link"
                href="https://telegram.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Telegram
              </a>
            </div>
          </div>
          <input
            id="telegram_id"
            name="telegram_id"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g. 5123456789"
            value={form.telegram_id}
            onChange={handleChange}
            className="form-input"
            disabled={submitting}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block font-medium mb-1">
            Password
          </label>
          <div className="password-wrapper">
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              disabled={submitting}
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="password-toggle"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              disabled={submitting}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Terms + Privacy */}
        <div className="form-row">
          <label className="form-label">
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
              disabled={submitting}
              required
            />{' '}
            I agree to the{' '}
            <Link to="/terms" className="brand-link">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="brand-link">
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className={`btn btn-block ${submitting ? 'btn-disabled' : ''}`}
            disabled={submitting}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </div>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link to="/login" className="brand-link">
          Log in
        </Link>
      </p>

      {/* Telegram help modal */}
      {showTgHelp && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tg-help-title"
          onClick={() => setShowTgHelp(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="tg-help-title">Find your Telegram numeric ID</h3>
              <button
                className="modal-close"
                onClick={() => setShowTgHelp(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ol>
                <li>
                  Open Telegram and start this helper bot:{' '}
                  <a
                    className="brand-link"
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @userinfobot
                  </a>
                  .
                </li>
                <li>
                  Tap <strong>Start</strong>. It will reply with your{' '}
                  <em>numeric ID</em>.
                </li>
                <li>
                  Copy the number (e.g. <code>5123456789</code>) and paste it
                  into “Telegram ID”.
                </li>
              </ol>
              <p style={{ marginTop: 8 }}>
                Tip: your <code>@username</code> is <em>not</em> the ID — we
                need the number so our bot can message you.
              </p>
              <p style={{ marginTop: 12 }}>
                Don&apos;t have Telegram yet?{' '}
                <a
                  className="brand-link"
                  href="https://telegram.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Telegram
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
