import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import axios from '../api/axios';
import { setSEO, seoPresets } from '../lib/seo';
import { logoutBus } from '../auth/logoutBus';

const MAX_LEN = 500;
const REQ_TIMEOUT_MS = 15000;
const DEBOUNCE_MS = 400;

const LS_USER_KEY = 'gc:user';
function loadCachedUser() {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Reflections() {
  // 🔝 Keep page pinned to top and ensure heading isn’t cut off
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const main = document.getElementById('main');
    if (main?.focus) main.focus({ preventScroll: true });
  }, []);

  const [reflections, setReflections] = useState([]);
  const [goals, setGoals] = useState([]);
  const [filters, setFilters] = useState({
    goal_id: '',
    start_date: '',
    end_date: '',
    sort: 'desc',
  });
  const [userId, setUserId] = useState(() => loadCachedUser()?.id ?? null);

  const [newReflection, setNewReflection] = useState({
    goal_id: '',
    content: '',
  });
  const [adding, setAdding] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const closeBtnRef = useRef(null);

  const [openRef, setOpenRef] = useState(null);

  const listCtrl = useRef(null);
  const goalsCtrl = useRef(null);
  const addCtrl = useRef(null);
  const debounceRef = useRef(null);

  // ✅ SEO
  useEffect(() => {
    setSEO({
      title: 'Reflections – GoalCrumbs',
      description:
        'Review your weekly reflections to spot trends, celebrate wins, and adjust next steps.',
      url: `${seoPresets.baseUrl}/reflections`,
      image: '/og/reflections.png',
      type: 'website',
      noindex: false,
    });
  }, []);

  const closeModal = useCallback(() => setOpenRef(null), []);
  useEffect(() => {
    if (openRef && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [openRef]);
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [closeModal]);

  // React to global logout instantly
  useEffect(() => {
    const off = logoutBus.on(() => {
      setUserId(null);
      setReflections([]);
      setGoals([]);
      setError('');
    });
    return off;
  }, []);

  // Fallback: if no cached userId, fetch it once
  useEffect(() => {
    if (userId) return; // already have from cache
    let mounted = true;
    (async () => {
      try {
        const me = await axios.get('/users/me', { timeout: REQ_TIMEOUT_MS });
        if (mounted) setUserId(me.data?.id ?? null);
      } catch (err) {
        console.error('Error fetching user ID:', err);
        if (mounted) setError('Failed to load account.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // goals
  useEffect(() => {
    if (!userId) return;
    if (goalsCtrl.current) goalsCtrl.current.abort();
    const controller = new AbortController();
    goalsCtrl.current = controller;
    (async () => {
      try {
        setLoadingGoals(true);
        const res = await axios.get('/goals', {
          params: { user_id: userId },
          signal: controller.signal,
          timeout: REQ_TIMEOUT_MS,
        });
        setGoals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Error fetching goals:', err);
        }
      } finally {
        setLoadingGoals(false);
      }
    })();
    return () => controller.abort();
  }, [userId]);

  // list (debounced)
  const fetchReflections = async (signal) => {
    try {
      setLoading(true);
      const params = {
        user_id: userId,
        goal_id: filters.goal_id || undefined,
        start_date: filters.start_date?.trim() || undefined,
        end_date: filters.end_date?.trim() || undefined,
        sort: filters.sort || 'desc',
      };
      const res = await axios.get('/reflections', {
        params,
        signal,
        timeout: REQ_TIMEOUT_MS,
      });
      setReflections(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        console.error('Error fetching reflections:', err);
        setError('Failed to load reflections.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (listCtrl.current) listCtrl.current.abort();
      const controller = new AbortController();
      listCtrl.current = controller;
      fetchReflections(controller.signal);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
    filters.goal_id,
    filters.start_date,
    filters.end_date,
    filters.sort,
  ]);

  useEffect(() => {
    return () => {
      if (listCtrl.current) listCtrl.current.abort();
      if (goalsCtrl.current) goalsCtrl.current.abort();
      if (addCtrl.current) addCtrl.current.abort();
    };
  }, []);

  // add new
  const handleAddReflection = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMsg('');

    const content = newReflection.content.trim();
    if (!content) {
      setError('Please enter your reflection.');
      return;
    }

    if (addCtrl.current) addCtrl.current.abort();
    const controller = new AbortController();
    addCtrl.current = controller;

    try {
      setAdding(true);
      setStatusMsg('Saving…');
      await axios.post(
        '/reflections',
        { user_id: userId, goal_id: newReflection.goal_id || null, content },
        { signal: controller.signal, timeout: REQ_TIMEOUT_MS }
      );
      setNewReflection({ goal_id: '', content: '' });

      if (listCtrl.current) listCtrl.current.abort();
      const listController = new AbortController();
      listCtrl.current = listController;
      await fetchReflections(listController.signal);
    } catch (err) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        console.error('Error adding reflection:', err);
        setError(err.response?.data?.error || 'Failed to add reflection.');
      }
    } finally {
      setAdding(false);
      setStatusMsg('');
    }
  };

  const goalOptions = useMemo(
    () => goals.map((g) => ({ id: g.id, title: g.title })),
    [goals]
  );

  if (!userId) return <p className="text-center mt-10">Loading reflections…</p>;

  return (
    <div className="reflections-container">
      <h1 className="auth-title" style={{ marginBottom: '1rem' }}>
        🪞 Your Reflections
      </h1>

      {/* Add Reflection */}
      <form
        onSubmit={handleAddReflection}
        className="add-reflection-form mb-6"
        aria-describedby="form-status"
      >
        <label htmlFor="ref-goal" className="form-label">
          Goal
        </label>
        <select
          id="ref-goal"
          value={newReflection.goal_id}
          onChange={(e) =>
            setNewReflection((prev) => ({ ...prev, goal_id: e.target.value }))
          }
          disabled={adding || loadingGoals}
          className="form-input"
        >
          <option value="">No specific goal</option>
          {goalOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>

        <label htmlFor="ref-content" className="form-label">
          Reflection
        </label>
        <textarea
          id="ref-content"
          placeholder="Write your reflection…"
          value={newReflection.content}
          onChange={(e) =>
            setNewReflection((prev) => ({
              ...prev,
              content: e.target.value.slice(0, MAX_LEN),
            }))
          }
          maxLength={MAX_LEN}
          className="form-input"
          style={{ minHeight: 140 }}
          aria-describedby="ref-content-help"
        />

        <div id="ref-content-help" className="char-counter">
          {newReflection.content.length} / {MAX_LEN} characters
        </div>

        <p id="form-status" className="visually-hidden" aria-live="polite">
          {statusMsg || (error ? `Error: ${error}` : '')}
        </p>
        {error && (
          <p className="error mt-2" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={adding}
          className="btn btn-block"
          aria-busy={adding || undefined}
        >
          {adding ? 'Saving…' : 'Add Reflection'}
        </button>
      </form>

      {/* Filters */}
      <div className="reflections-filters mb-4">
        <select
          id="flt-goal"
          name="goal_id"
          value={filters.goal_id}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, goal_id: e.target.value }))
          }
          disabled={loadingGoals}
          className="form-input"
        >
          <option value="">All Goals</option>
          {goalOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>

        <select
          id="flt-sort"
          name="sort"
          value={filters.sort}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, sort: e.target.value }))
          }
          className="form-input"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <p>Loading reflections…</p>
      ) : reflections.length === 0 ? (
        <p className="text-gray-600">No reflections found for these filters.</p>
      ) : (
        <div className="reflections-grid">
          {reflections.map((ref) => (
            <button
              key={`${ref.type || 'reflection'}-${ref.id}`}
              className={`reflection-card reflection-card--clickable ${
                ref.type === 'completed_goal' ? 'reflection-card--goal' : ''
              }`}
              onClick={() => setOpenRef(ref)}
              aria-label="Open reflection"
            >
              <div className="reflection-date">
                {ref.created_at
                  ? new Date(ref.created_at).toLocaleString()
                  : '—'}
              </div>

              <div className="reflection-goal">
                {ref.type === 'completed_goal' ? '🏆 Completed:' : 'Goal:'}{' '}
                <span className="goal-title" title={ref.goal_name || 'N/A'}>
                  {ref.goal_name || 'N/A'}
                </span>
              </div>

              <div className="reflection-content reflection-content--clamp">
                {ref.content || 'No content'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {openRef && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ref-modal-title"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <div className="modal-header">
              <h3 id="ref-modal-title">
                {openRef.type === 'completed_goal'
                  ? 'Achievement'
                  : 'Reflection'}
              </h3>
              <button
                ref={closeBtnRef}
                className="modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-meta">
              <div>
                <strong>Date:</strong>{' '}
                {openRef.created_at
                  ? new Date(openRef.created_at).toLocaleString()
                  : '—'}
              </div>
              <div>
                <strong>Goal:</strong>{' '}
                <span title={openRef.goal_name || 'N/A'}>
                  {openRef.goal_name || 'N/A'}
                </span>
              </div>
            </div>
            <div className="modal-body">{openRef.content || 'No content'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
