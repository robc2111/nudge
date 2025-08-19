// src/pages/EditGoal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const MAX_DESCRIPTION = 500; // ≈ ~100 tokens
const MIN_DESCRIPTION = 40;  // ensure useful context

export default function EditGoal() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // AbortControllers (Axios v1+)
  const fetchCtrl = useRef(null);
  const mutateCtrl = useRef(null);

  // Fetch goal on mount
  useEffect(() => {
    // cancel any previous fetch
    if (fetchCtrl.current) fetchCtrl.current.abort();
    const controller = new AbortController();
    fetchCtrl.current = controller;

    (async () => {
      try {
        const res = await axios.get(`/goals/${id}`, {
          signal: controller.signal,
          timeout: 15000,
        });
        setGoal(res.data);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        console.error('❌ Failed to fetch goal:', err);
        setError('Goal not found or server error');
      }
    })();

    return () => controller.abort();
  }, [id]);

  const descLen = useMemo(() => goal?.description?.length || 0, [goal]);
  const tooShort = descLen > 0 && descLen < MIN_DESCRIPTION;
  const atLimit = descLen >= MAX_DESCRIPTION;

  const handleUpdate = async () => {
    setError('');
    if (!goal) return;

    const description = (goal.description || '').trim();
    if (description.length < MIN_DESCRIPTION) {
      setError(`Please add a bit more detail (min ${MIN_DESCRIPTION} characters).`);
      return;
    }
    if (description.length > MAX_DESCRIPTION) {
      setError(`Description is too long (max ${MAX_DESCRIPTION} characters).`);
      return;
    }

    // cancel any in‑flight mutation
    if (mutateCtrl.current) mutateCtrl.current.abort();
    const controller = new AbortController();
    mutateCtrl.current = controller;

    setLoading(true);
    try {
      // 1) Regenerate breakdown with AI
      await axios.post(
        `/ai/goals/${id}/regenerate`,
        { description },
        { signal: controller.signal, timeout: 60000 }
      );
      toast.info('🧠 AI breakdown regenerated');

      // 2) Update goal details
      await axios.put(
        `/goals/${id}`,
        { title: goal.title, description, due_date: goal.due_date },
        { signal: controller.signal, timeout: 15000 }
      );
      toast.success('✅ Goal updated successfully');

      navigate('/dashboard');
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        console.info('[EditGoal] request canceled');
        return;
      }
      console.error('❌ Update error:', err);
      toast.error('Something went wrong while updating');
      setError('Something went wrong during update.');
    } finally {
      setLoading(false);
    }
  };

  // abort any in‑flight mutation on unmount
  useEffect(() => {
    return () => {
      if (mutateCtrl.current) mutateCtrl.current.abort();
    };
  }, []);

  if (!goal && !error) return <p style={{ padding: '2rem' }}>Loading…</p>;

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Edit Goal</h2>

      {loading && (
        <p className="text-blue-600 mb-4 text-center">🧠 Regenerating subgoals with AI...</p>
      )}
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      {goal && (
        <>
          <h3 className="font-semibold text-lg mb-6 text-center">{goal.title}</h3>

          <div className="mb-6 text-left">
            <div className="flex items-start mb-2 gap-3">
              <label htmlFor="description" className="font-medium flex-1 pr-2">
                Description / Details{' '}
                <span className="text-gray-500 text-sm">
                  (what, why, constraints, timeframe, resources)
                </span>
              </label>
              <span
                className={`${tooShort ? 'text-orange-600' : 'text-gray-500'} whitespace-nowrap`}
              >
                {descLen}/{MAX_DESCRIPTION} characters
              </span>
            </div>

            <textarea
              id="description"
              placeholder="Add details or make changes to your goal..."
              className={`goal-textarea w-full border rounded p-3 min-h-[150px] ${
                atLimit ? 'border-orange-400' : ''
              }`}
              value={goal.description || ''}
              onChange={(e) => setGoal({ ...goal, description: e.target.value })}
              maxLength={MAX_DESCRIPTION}
              disabled={loading}
            />

            {tooShort && (
              <div className="mt-1 text-sm text-orange-600">
                Add at least {MIN_DESCRIPTION - descLen} more characters for a useful breakdown.
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-medium" htmlFor="dueDate">
              Due Date:
            </label>
            <input
              id="dueDate"
              type="date"
              className="w-full border border-gray-300 p-3 rounded text-base"
              value={goal.due_date || ''}
              onChange={(e) => setGoal({ ...goal, due_date: e.target.value })}
              disabled={loading}
            />
          </div>

          <button
            className={`w-full py-3 text-white rounded text-lg font-semibold transition ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? '⏳ Regenerating…' : '🔁 Regenerate Subgoals'}
          </button>
        </>
      )}
    </div>
  );
}