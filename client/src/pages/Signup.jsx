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
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
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

    setSubmitting(true);
    try {
      const res = await axios.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        telegram_id: form.telegram_id.trim() || null, // optional
        password: form.password,
      });

      // Persist auth locally
      if (res.data?.token) localStorage.setItem('token', res.data.token);
      if (res.data?.user)  localStorage.setItem('user', JSON.stringify(res.data.user));

      setSuccess(true);
      // small pause then go to dashboard
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
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Create your GoalCrumbs account</h2>

      {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
      {success && <p className="text-green-600 mb-4 text-center">🎉 Registration successful!</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block font-medium mb-1">Username</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded"
            disabled={submitting}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block font-medium mb-1">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded"
            disabled={submitting}
            required
          />
        </div>

        <div>
          <label htmlFor="telegram_id" className="block font-medium mb-1">
            Telegram ID <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="telegram_id"
            name="telegram_id"
            type="text"
            placeholder="@yourhandle or numeric id"
            value={form.telegram_id}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded"
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-medium mb-1">Password</label>
          <div className="flex">
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-l"
              disabled={submitting}
              required
              minLength={MIN_PASSWORD}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="px-3 border border-l-0 border-gray-300 rounded-r"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              disabled={submitting}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-3 text-white rounded ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#bd661d] hover:bg-[#a55217]'}`}
          disabled={submitting}
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}