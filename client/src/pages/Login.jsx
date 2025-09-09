// src/pages/Login.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from '../api/axios';
import { setSEO, seoPresets } from '../lib/seo';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSEO({
      title: 'Log in – GoalCrumbs',
      description: 'Access your GoalCrumbs account.',
      url: `${seoPresets.baseUrl}/login`,
      image: seoPresets.brandImage,
      noindex: true,
    });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'email' && !resetOpen) setResetEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const params = new URLSearchParams(location.search);
      const fromQuery = params.get('from');
      const target = fromQuery || '/dashboard';

      navigate(target, { replace: true });
    } catch {
      setError('Login failed');
    }
  };

  const openReset = () => {
    setResetMsg('');
    setError('');
    setResetOpen(true);
    setResetEmail((prev) => prev || form.email);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg('');
    setError('');

    if (!resetEmail) {
      setError('Please enter your email to reset your password.');
      return;
    }

    try {
      setResetLoading(true);
      await axios.post('/password/forgot-password', { email: resetEmail });
      setResetMsg(
        'If an account exists for that email, a reset link has been sent.'
      );
    } catch {
      setResetMsg(
        'If an account exists for that email, a reset link has been sent.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="auth-card">
        <h2 className="auth-title">Log in to GoalCrumbs</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="form-input"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-row">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              required
              autoComplete="current-password"
            />
          </div>

          <div
            className="form-actions"
            style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}
          >
            <button type="submit" className="btn">
              Log In
            </button>
            <button
              type="button"
              className="btn"
              onClick={openReset}
              aria-expanded={resetOpen}
            >
              Forgot password?
            </button>
          </div>
        </form>

        {error && <p className="auth-error">{error}</p>}

        {resetOpen && (
          <form
            onSubmit={handleReset}
            className="auth-form"
            style={{ marginTop: '1rem' }}
          >
            <div className="form-row">
              <label htmlFor="reset-email" className="form-label">
                Reset email
              </label>
              <input
                id="reset-email"
                type="email"
                className="form-input"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={resetLoading}
                autoComplete="email"
              />
            </div>
            <div
              className="form-actions"
              style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
            >
              <button type="submit" className="btn" disabled={resetLoading}>
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setResetOpen(false)}
                disabled={resetLoading}
              >
                Cancel
              </button>
            </div>
            {resetMsg && (
              <p className="auth-success" style={{ marginTop: '0.5rem' }}>
                {resetMsg}
              </p>
            )}
          </form>
        )}

        <p className="auth-terms">
          By logging in, you agree to our{' '}
          <Link to="/terms" className="brand-link">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="brand-link">
            Privacy Policy
          </Link>
          .
        </p>

        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don’t have an account?{' '}
          <Link to="/signup" className="brand-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
