// src/pages/Reflections.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from '../api/axios';

const MAX_LEN = 500;
const REQ_TIMEOUT_MS = 15000;
const DEBOUNCE_MS = 400;

export default function Reflections() {
  const [reflections, setReflections] = useState([]);
  const [goals, setGoals] = useState([]);
  const [filters, setFilters] = useState({
    goal_id: '',
    start_date: '',
    end_date: '',
    sort: 'desc',
  });
  const [userId, setUserId] = useState(null);

  // add form state
  const [newReflection, setNewReflection] = useState({ goal_id: '', content: '' });
  const [adding, setAdding] = useState(false);

  // ui state
  const [loading, setLoading] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [error, setError] = useState('');

  // controllers & debounce
  const listCtrl = useRef(null);
  const goalsCtrl = useRef(null);
  const addCtrl = useRef(null);
  const debounceRef = useRef(null);

  // ──────────────────────────────
  // Fetch user id on mount
  // ──────────────────────────────
  useEffect(() => {
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
    return () => { mounted = false; };
  }, []);

  // ──────────────────────────────
  // Fetch goals for select
  // ──────────────────────────────
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
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        console.error('Error fetching goals:', err);
      } finally {
        setLoadingGoals(false);
      }
    })();

    return () => controller.abort();
  }, [userId]);

  // ──────────────────────────────
  // Fetch reflections (debounced on filter change)
  // ──────────────────────────────
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
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      console.error('Error fetching reflections:', err);
      setError('Failed to load reflections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    // debounce to avoid rapid calls while changing filters
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
  }, [userId, filters.goal_id, filters.start_date, filters.end_date, filters.sort]);

  useEffect(() => {
    return () => {
      if (listCtrl.current) listCtrl.current.abort();
      if (goalsCtrl.current) goalsCtrl.current.abort();
      if (addCtrl.current) addCtrl.current.abort();
    };
  }, []);

  // ──────────────────────────────
  // Add a reflection
  // ──────────────────────────────
  const handleAddReflection = async (e) => {
    e.preventDefault();
    setError('');

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
      await axios.post(
        '/reflections',
        {
          user_id: userId,
          goal_id: newReflection.goal_id || null, // allow null for N/A
          content,
        },
        { signal: controller.signal, timeout: REQ_TIMEOUT_MS }
      );

      // Clear form
      setNewReflection({ goal_id: '', content: '' });

      // Refresh list (no debounce)
      if (listCtrl.current) listCtrl.current.abort();
      const listController = new AbortController();
      listCtrl.current = listController;
      await fetchReflections(listController.signal);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      console.error('Error adding reflection:', err);
      setError(err.response?.data?.error || 'Failed to add reflection.');
    } finally {
      setAdding(false);
    }
  };

  // ──────────────────────────────
  // Derived helpers
  // ──────────────────────────────
  const goalOptions = useMemo(
    () => goals.map((g) => ({ id: g.id, title: g.title })),
    [goals]
  );

  if (!userId) {
    return <p className="text-center mt-10">Loading reflections…</p>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🪞 Your Reflections</h1>

      {/* Add Reflection Form */}
      <form onSubmit={handleAddReflection} className="add-reflection-form mb-6">
        <label htmlFor="ref-goal" className="sr-only">Goal</label>
        <select
          id="ref-goal"
          value={newReflection.goal_id}
          onChange={(e) => setNewReflection((prev) => ({ ...prev, goal_id: e.target.value }))}
          disabled={adding || loadingGoals}
        >
          <option value="">No specific goal</option>
          {goalOptions.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>

        <label htmlFor="ref-content" className="sr-only">Reflection</label>
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
          maxLength={MAX_LEN} // prevents typing past limit
        />

        <div style={{ fontSize: '0.85rem', color: '#666', textAlign: 'right' }}>
          {newReflection.content.length} / {MAX_LEN} characters
        </div>

        {error && <p className="error mt-2">{error}</p>}

        <button type="submit" disabled={adding}>
          {adding ? 'Saving…' : 'Add Reflection'}
        </button>
      </form>

      {/* Filters */}
      <div className="controls-group mb-4">
        <label htmlFor="flt-goal" className="sr-only">Filter by goal</label>
        <select
          id="flt-goal"
          name="goal_id"
          value={filters.goal_id}
          onChange={(e) => setFilters((prev) => ({ ...prev, goal_id: e.target.value }))}
          disabled={loadingGoals}
        >
          <option value="">All Goals</option>
          {goalOptions.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>

        <label htmlFor="flt-start" className="sr-only">Start date</label>
        <input
          id="flt-start"
          type="date"
          name="start_date"
          value={filters.start_date}
          onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
        />

        <label htmlFor="flt-end" className="sr-only">End date</label>
        <input
          id="flt-end"
          type="date"
          name="end_date"
          value={filters.end_date}
          onChange={(e) => setFilters((prev) => ({ ...prev, end_date: e.target.value }))}
        />

        <label htmlFor="flt-sort" className="sr-only">Sort</label>
        <select
          id="flt-sort"
          name="sort"
          value={filters.sort}
          onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Reflections Grid */}
      {loading ? (
        <p>Loading reflections…</p>
      ) : reflections.length === 0 ? (
        <p className="text-gray-600">No reflections found for these filters.</p>
      ) : (
        <div className="reflections-grid">
          {reflections.map((ref) => (
            <div key={ref.id} className="reflection-card">
              <div className="reflection-date">
                {ref.created_at ? new Date(ref.created_at).toLocaleString() : '—'}
              </div>
              <div className="reflection-goal">
                Goal: {ref.goal_name || 'N/A'}
              </div>
              <div className="reflection-content">
                {ref.content || 'No content'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}