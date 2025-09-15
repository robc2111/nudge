import React, { useState, useRef, useEffect } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // for accessibility focus management
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus();
    if (!open && triggerRef.current) triggerRef.current.focus();
  }, [open]);

  const reallyDelete = async () => {
    if (typed !== 'DELETE' || !ack) return;
    if (
      !window.confirm(
        'Final check: permanently delete your account and all data?'
      )
    )
      return;

    try {
      setBusy(true);
      // axios.delete payload must be under `data`
      await axios.delete('/users/me', {
        timeout: 12000,
        data: { confirm: 'DELETE', acknowledge: true },
      });

      // clear local session artifacts
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear?.();
      if (axios.defaults.headers) {
        delete axios.defaults.headers.common?.Authorization;
      }

      alert('Your account was deleted.');
      navigate('/signup');
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="del-title">
      <h3 id="del-title" style={{ color: '#b91c1c', marginTop: 0 }}>
        Danger zone
      </h3>
      <p style={{ marginTop: 0 }}>
        Delete your account and all data. This action cannot be undone.
      </p>

      <button
        className="btn-delete"
        style={{ background: '#b91c1c' }}
        onClick={(e) => {
          triggerRef.current = e.currentTarget;
          setOpen(true);
        }}
        type="button"
      >
        Delete account
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-h"
          aria-describedby="del-desc"
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="modal-card" role="document">
            <h4 id="del-h" style={{ marginTop: 0 }}>
              Confirm deletion
            </h4>
            <p id="del-desc">
              Type <strong>DELETE</strong> to confirm, and tick the box.
            </p>

            <input
              className="form-input"
              placeholder="Type DELETE"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              aria-label="Type DELETE to confirm"
            />

            <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={ack}
                onChange={() => setAck(!ack)}
              />
              I understand this is permanent and removes all goals, tasks, and
              reflections.
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                ref={closeRef}
                className="btn"
                onClick={() => setOpen(false)}
                disabled={busy}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#b91c1c' }}
                onClick={reallyDelete}
                aria-busy={busy || undefined}
                type="button"
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
