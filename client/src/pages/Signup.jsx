// src/pages/Signup.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const MIN_PASSWORD = 8;

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    telegram_id: '',
    password: '',
    agree: false,   // ✅ added checkbox state
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
      return setError('You must agree to the Terms of Service and Privacy Policy.');
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        telegram_id: form.telegram_id.trim() || null,
        password: form.password,
      });

      if (res.data?.token) localStorage.setItem('token', res.data.token);
      if (res.data?.user)  localStorage.setItem('user', JSON.stringify(res.data.user));

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
        {/* Username */}
        <div>
          <label htmlFor="username" className="block font-medium mb-1">
            Username
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
          <label htmlFor="telegram_id" className="block font-medium mb-1">
            Telegram ID
          </label>
          <input
            id="telegram_id"
            name="telegram_id"
            type="text"
            placeholder="@yourhandle or numeric id"
            value={form.telegram_id}
            onChange={handleChange}
            className="form-input"
            disabled={submitting}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block font-medium mb-1">Password</label>
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

        {/* ✅ Terms + Privacy Checkbox */}
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
            <Link to="/terms" className="brand-link">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="brand-link">Privacy Policy</Link>.
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
        <Link to="/login" className="brand-link">Log in</Link>
      </p>
    </div>
  );
}