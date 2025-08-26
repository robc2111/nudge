import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from '../api/axios';

export default function ResetPassword() {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');

  const [pw, setPw] = useState('');
  const [cpw, setCpw] = useState('');
  const [phase, setPhase] = useState('ready'); // 'ready' | 'done' | 'error'
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setMsg('This link is invalid. Request a new one from the login page.');
    }
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!token) {
      setPhase('error');
      setMsg('Missing token.');
      return;
    }
    if (pw !== cpw) {
      setMsg('Passwords must match.');
      return;
    }
    try {
      await axios.post('/password/reset-password', { token, password: pw }); // ✅ send both
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setMsg(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  if (phase === 'done') {
    return (
      <div className="auth-card">
        <h2 className="auth-title">Password updated 🎉</h2>
        <p>You can now <Link className="brand-link" to="/login">log in</Link> with your new password.</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="auth-card">
        <h2 className="auth-title">Reset link problem</h2>
        <p className="auth-error">{msg || 'Failed to reset password'}</p>
        <p>Try again from the <Link className="brand-link" to="/login">Login</Link> page.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2 className="auth-title">Set a new password</h2>
      <form onSubmit={submit} className="auth-form">
        <div className="form-row">
          <label className="form-label" htmlFor="pw">New password</label>
          <input id="pw" type="password" className="form-input"
                 value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor="cpw">Confirm password</label>
          <input id="cpw" type="password" className="form-input"
                 value={cpw} onChange={(e) => setCpw(e.target.value)} required />
        </div>
        <div className="form-actions" style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
          <button className="btn" type="submit">Update password</button>
        </div>
      </form>
      {msg && <p className="auth-error" style={{ marginTop: '.5rem' }}>{msg}</p>}
    </div>
  );
}