// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from '../api/axios';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('/auth/login', form);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="form-page">
      <div className="auth-card">
        <h2 className="auth-title">Log in to GoalCrumbs</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-block">
              Log In
            </button>
          </div>
        </form>

        {error && <p className="auth-error">{error}</p>}

        {/* ✅ Terms & Privacy reminder */}
<p className="auth-terms">
  By logging in, you agree to our{' '}
  <Link to="/terms" className="brand-link">Terms of Service</Link> and{' '}
  <Link to="/privacy" className="brand-link">Privacy Policy</Link>.
</p>

        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don’t have an account? <Link to="/signup" className="brand-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;