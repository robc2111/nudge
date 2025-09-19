import React, { useEffect, useRef, useState } from 'react';
import axios from '../api/axios';

export default function DeleteAccountSection() {
  // UI state
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [message, setMessage] = useState('');

  // deletion status
  const [pending, setPending] = useState(false);
  const [eta, setEta] = useState(null);

  // focus management for the dialog
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  // fetch current deletion flag from /users/me
  async function refreshMe() {
    try {
      const { data } = await axios.get('/users/me', { timeout: 12000 });
      setPending(Boolean(data?.deletion_pending));
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus();
    if (!open && triggerRef.current) triggerRef.current.focus();
  }, [open]);

  async function requestExport() {
    setExportBusy(true);
    setMessage('');
    try {
      await axios.post('/privacy/export', {}, { timeout: 15000 });
      setMessage('Export requested. We’ll email you a link when it’s ready.');
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to request export.');
    } finally {
      setExportBusy(false);
    }
  }

  async function scheduleDelete() {
    if (typed !== 'DELETE' || !ack) return;
    setBusy(true);
    setMessage('');
    try {
      const { data } = await axios.post(
        '/privacy/delete',
        {},
        { timeout: 15000 }
      );
      const when = data?.eta || data?.data?.eta || null;
      setEta(when);
      setPending(true);
      setOpen(false);
      setTyped('');
      setAck(false);
      setMessage(
        when
          ? `Deletion scheduled for ${new Date(when).toLocaleString()}. You can cancel before then.`
          : 'Deletion scheduled. You can cancel before it runs.'
      );
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Could not schedule deletion.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelDelete() {
    setCancelBusy(true);
    setMessage('');
    try {
      await axios.post('/privacy/delete/cancel', {}, { timeout: 12000 });
      setPending(false);
      setEta(null);
      setMessage('Deletion canceled.');
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Could not cancel deletion.');
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <section
      className="card"
      aria-labelledby="del-title"
      style={{ marginTop: '2rem' }}
    >
      <h3 id="del-title" style={{ marginTop: 0 }}>
        Privacy &amp; account
      </h3>

      {/* export / delete controls */}
      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}
      >
        <button
          className="btn"
          onClick={requestExport}
          disabled={exportBusy}
          type="button"
          aria-busy={exportBusy || undefined}
        >
          {exportBusy ? 'Requesting…' : '📤 Export my data'}
        </button>

        {!pending ? (
          <button
            ref={triggerRef}
            className="btn btn-danger"
            style={{ background: '#b91c1c' }}
            onClick={({ currentTarget }) => {
              triggerRef.current = currentTarget; // preserves focus return
              setOpen(true);
            }}
            type="button"
          >
            🗑️ Schedule account deletion
          </button>
        ) : (
          <button
            className="btn"
            onClick={cancelDelete}
            disabled={cancelBusy}
            type="button"
            aria-busy={cancelBusy || undefined}
          >
            ❎ Cancel scheduled deletion
          </button>
        )}
      </div>

      {/* status */}
      {pending && (
        <p style={{ margin: '6px 0', color: '#b45309' }}>
          Deletion is <strong>scheduled</strong>
          {eta ? (
            <>
              {' '}
              for <strong>{new Date(eta).toLocaleString()}</strong>
            </>
          ) : null}
          . You can cancel any time before it runs.
        </p>
      )}

      {/* feedback */}
      {message && <p style={{ marginTop: 6 }}>{message}</p>}

      {/* modal */}
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
              Deletion is scheduled with a 7-day grace period. Type{' '}
              <strong>DELETE</strong> and tick the box to schedule it now.
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
              I understand this will permanently remove all goals, tasks, and
              reflections in 7 days.
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
                onClick={scheduleDelete}
                aria-busy={busy || undefined}
                disabled={typed !== 'DELETE' || !ack || busy}
                type="button"
              >
                {busy ? 'Scheduling…' : 'Schedule deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
