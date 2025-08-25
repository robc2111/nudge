// src/pages/GoalSetup.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const MAX_LEN = 300;

const GoalSetup = () => {
  const navigate = useNavigate();

  // data
  const [userId, setUserId] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [breakdown, setBreakdown] = useState(null);

  // ui state
  const [loadingUser, setLoadingUser] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // abort controllers (so we don’t set state after unmount)
  const genAbortRef = useRef(null);
  const saveAbortRef = useRef(null);

  const placeholders = [
  "Describe your goal with what, why, and when. Example: Run a marathon in April 2026 by training 4 days a week.",
  "Be specific so we can break it down for you: Save £5,000 in 6 months by cutting expenses and freelancing.",
  "Think of your goal like you’re explaining it to a coach — clear, measurable, and time-bound.",
  "What do you want to achieve, why is it important, and by when? Example: Learn Spanish to conversational level in 6 months by practicing 30 mins daily.",
  "Write your goal in natural language, but add details (what, when, why). The more detail, the better the plan."
];

const [placeholder] = useState(
  () => placeholders[Math.floor(Math.random() * placeholders.length)]
);

  // ──────────────────────────────
  // Load current user once
  // ──────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUser(true);
      try {
        const res = await axios.get('/users/me', { timeout: 12000 });
        if (mounted && res.data?.id) setUserId(res.data.id);
      } catch (err) {
        if (!mounted) return;
        console.error('❌ Error fetching user:', err.response?.data || err.message);
        setError('Failed to fetch user. Please log in again.');
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ──────────────────────────────
  // Derived helpers
  // ──────────────────────────────
  const canGenerate = useMemo(
    () => goalText.trim().length > 0 && !generating && !saving,
    [goalText, generating, saving]
  );

  const canSave = useMemo(() => {
    return (
      !!userId &&
      !!breakdown &&
      !!breakdown.title &&
      !!breakdown.tone &&
      Array.isArray(breakdown.subgoals) &&
      !saving &&
      !generating
    );
  }, [userId, breakdown, saving, generating]);

  // ──────────────────────────────
  // Generate breakdown with AI
  // ──────────────────────────────
  const handleGenerate = async () => {
    if (!canGenerate) return;

    // cancel any previous generate call
    if (genAbortRef.current) genAbortRef.current.abort();
    const controller = new AbortController();
    genAbortRef.current = controller;

    setGenerating(true);
    setError('');
    setSaved(false);
    setBreakdown(null);

    try {
      const response = await axios.post(
        '/ai/goal-breakdown',
        { goal: goalText.trim() },
        { timeout: 60000, signal: controller.signal }
      );

      const data = response.data || {};

      // be defensive about shape
      const safeSubgoals = Array.isArray(data.subgoals)
        ? data.subgoals.map((sg) => ({
            title: sg?.title ?? 'Untitled subgoal',
            tasks: Array.isArray(sg?.tasks)
              ? sg.tasks.map((t) => ({
                  title: t?.title ?? 'Untitled task',
                  microtasks: Array.isArray(t?.microtasks) ? t.microtasks : [],
                }))
              : [],
          }))
        : [];

      setBreakdown({
        title: data.goal ?? data.title ?? goalText.trim(),
        tone: data.tone ?? '',
        subgoals: safeSubgoals,
      });
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      console.error('❌ Breakdown error:', err);
      setError(err.response?.data?.error || 'Failed to generate breakdown');
    } finally {
      setGenerating(false);
    }
  };

  // ──────────────────────────────
  // Save goal
  // ──────────────────────────────
  const handleSave = async () => {
  if (!canSave) {
    if (!userId) setError('User not loaded. Please log in again.');
    else if (!breakdown?.tone) {
      setError('Please select a coaching tone.');
      document.getElementById('toneSelect')?.focus();
      toast.info('Pick a coaching tone to proceed 🙂');
    } else if (!breakdown?.title) setError('Missing goal title.');
    return;
  }

    if (saveAbortRef.current) saveAbortRef.current.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaving(true);
    setError('');
    setSaved(false);

    const payload = {
      user_id: userId,
      title: breakdown.title,
      tone: breakdown.tone,
      subgoals: breakdown.subgoals,
    };

    try {
      await axios.post('/goals', payload, { timeout: 20000, signal: controller.signal });
      setSaved(true);
      // short success pause for UX
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      console.error('❌ Save error:', err);
      setError(err.response?.data?.error || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  // cancel in‑flight requests on unmount
  useEffect(() => {
    return () => {
      if (genAbortRef.current) genAbortRef.current.abort();
      if (saveAbortRef.current) saveAbortRef.current.abort();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold text-center mb-4">🎯 Goal Setup</h2>

      {/* Compose goal */}
      <div className="flex flex-col items-stretch gap-2 mb-4">
        <label htmlFor="goalText" className="font-medium">Describe your goal</label>
        <textarea
  id="goalText"
  className="goal-textarea"
  placeholder={placeholder}
  rows={5}
  value={goalText}
  onChange={(e) => setGoalText(e.target.value.slice(0, MAX_LEN))}
  maxLength={MAX_LEN}
  disabled={generating || saving}
/>
        <p className="text-sm text-gray-500">
          {goalText.length} / {MAX_LEN} characters
        </p>

        <button
          className="btn"
          onClick={handleGenerate}
          disabled={!canGenerate || loadingUser}
          aria-busy={generating}
        >
          {generating ? 'Generating…' : 'Generate Breakdown'}
        </button>
      </div>

      {/* Messages */}
      {loadingUser && (
        <p className="text-sm text-gray-500 text-center">Loading your account…</p>
      )}
      {error && <p className="text-red-600 text-center mt-1">{error}</p>}
      {saved && <p className="text-green-600 text-center mt-1">✅ Goal saved successfully</p>}

          {/* AI Breakdown preview */}
{breakdown && (
  <div className="breakdown-section">
    <h3 className="breakdown-heading">AI Breakdown</h3>

    {/* Card with right-aligned content */}
    <div className="card text-right-card">
      <h4 className="breakdown-title">{breakdown.title}</h4>

      {(breakdown.subgoals ?? []).map((subgoal, i) => (
        <div key={`${subgoal.title}-${i}`} className="breakdown-subgoal">
          <h5 className="breakdown-subgoal-title">🧩 {subgoal.title}</h5>

          {(subgoal.tasks ?? []).map((task, j) => (
            <div key={`${task.title}-${j}`} className="breakdown-task">
              <p className="breakdown-task-title">🔹 {task.title}</p>
              <ul className="rtl-list">
                {(task.microtasks ?? []).map((micro, k) => (
                  <li key={`${micro}-${k}`}>🟠 {micro}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Tone + Save */}
    <div className="goalsetup-container">
      <div className="tone-block">
        <label className="tone-label" htmlFor="toneSelect">
  Choose your coaching tone: <span style={{color:'#b91c1c'}}>*</span>
</label>
<select
  id="toneSelect"
  className="tone-select"
  value={breakdown.tone || ''}
  onChange={(e) => setBreakdown((prev) => ({ ...prev, tone: e.target.value }))}
  required
>
  <option value="" disabled>Select tone</option>
  <option value="friendly">😊 Friendly</option>
  <option value="strict">💼 Strict</option>
  <option value="motivational">💪 Motivational</option>
</select>
{!breakdown.tone && (
  <p className="text-sm" style={{color:'#b91c1c'}}>Please select a tone to continue.</p>
)}
      </div>

      <button className="btn save" onClick={handleSave} disabled={!canSave} aria-busy={saving}>
  {saving ? 'Saving…' : 'Confirm & Save'}
</button>
    </div>
  </div>
)}
    </div>
  );
};

export default GoalSetup;