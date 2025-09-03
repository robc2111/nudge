// client/src/components/DeleteAccountSection.jsx
import { useState } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const reallyDelete = async () => {
    // client-side guard (keeps UX snappy)
    if (typed !== 'DELETE' || !ack) return;
    if (!window.confirm('Final check: permanently delete your account and all data?')) return;

    try {
      setBusy(true);
      // IMPORTANT: axios.delete payload must go under `data`
      await axios.delete('/users/me', {
        timeout: 12000,
        data: {
          confirm: 'DELETE',
          acknowledge: true,
        },
      });

      // clear local session artifacts
      localStorage.removeItem('token');
      sessionStorage.clear?.();
      if (axios.defaults.headers) {
        delete axios.defaults.headers.common?.Authorization;
      }

      alert('Your account was deleted.');
      navigate('/signup');
    } catch (e) {
      // show server-provided error if present
      alert(e?.response?.data?.error || 'Failed to delete account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="del-title">
      <h3 id="del-title" style={{ color: '#b91c1c', marginTop: 0 }}>Danger zone</h3>
      <p style={{ marginTop: 0 }}>Delete your account and all data. This action cannot be undone.</p>
      <button
        className="btn-delete"
        style={{ background: '#b91c1c' }}
        onClick={() => setOpen(true)}
      >
        Delete account
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-h"
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="modal-card">
            <h4 id="del-h" style={{ marginTop: 0 }}>Confirm deletion</h4>
            <p>Type <strong>DELETE</strong> to confirm, and tick the box.</p>

            <input
              className="form-input"
              placeholder="Type DELETE"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />

            <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={ack}
                onChange={() => setAck(!ack)}
              />
              I understand this is permanent and removes all goals, tasks, and reflections.
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#b91c1c' }}
                onClick={reallyDelete}
                disabled={busy || typed !== 'DELETE' || !ack}
              >
                {busy ? 'Deleting…' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}