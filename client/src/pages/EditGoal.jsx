// EditGoal.jsx
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const MAX_DESCRIPTION = 500;   // ≈ ~100 tokens
const MIN_DESCRIPTION = 40;    // ensure useful context

const EditGoal = () => {
  const { id } = useParams();
  const [goal, setGoal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        const res = await axios.get(`/goals/${id}`);
        setGoal(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch goal:", err.message);
        setError('Goal not found or server error');
      }
    };
    fetchGoal();
  }, [id]);

  const descLen = useMemo(() => (goal?.description?.length || 0), [goal]);
  const tooShort = descLen > 0 && descLen < MIN_DESCRIPTION;
  const atLimit = descLen >= MAX_DESCRIPTION;

  const handleUpdate = async () => {
    setError('');

    const description = (goal.description || '').trim();
    if (description.length < MIN_DESCRIPTION) {
      setError(`Please add a bit more detail (min ${MIN_DESCRIPTION} characters).`);
      return;
    }
    if (description.length > MAX_DESCRIPTION) {
      setError(`Description is too long (max ${MAX_DESCRIPTION} characters).`);
      return;
    }

    setLoading(true);
    try {
      // 1) Regenerate breakdown using updated description
      await axios.post(`/ai/goals/${id}/regenerate`, { description });

      // 2) Update goal fields
      await axios.put(`/goals/${id}`, {
        title: goal.title,
        description,
        due_date: goal.due_date
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Update error:', err.message);
      setError('Something went wrong during update.');
    } finally {
      setLoading(false);
    }
  };

  if (!goal) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Edit Goal</h2>

      {loading && <p className="text-blue-600 mb-4 text-center">🧠 Regenerating subgoals with AI...</p>}
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <h3 className="font-semibold text-lg mb-6 text-center">{goal.title}</h3>

      <div className="mb-6 text-left">
  <div className="flex items-start mb-2 space-x-3">
  <label htmlFor="description" className="font-medium flex-1 pr-2">
    Description / Details{" "}
    <span className="text-gray-500 text-sm">(what, why, constraints, timeframe, resources)</span>
  </label>

  <span
    className={`${tooShort ? 'text-orange-600' : 'text-gray-500'} whitespace-nowrap`}
    style={{ marginLeft: '3.5rem' }} // fallback in case global CSS nukes Tailwind spacing
  >
    {descLen}/{MAX_DESCRIPTION} characters
  </span>
</div>

  <textarea
    id="description"
    placeholder="Add details or make changes to your goal (what, why, constraints, timeframe, resources)..."
    className={`goal-textarea w-full border rounded p-3 min-h-[150px] ${atLimit ? 'border-orange-400' : ''}`}
    value={goal.description || ''}
    onChange={(e) => setGoal({ ...goal, description: e.target.value })}
    maxLength={MAX_DESCRIPTION}
  />

  {tooShort && (
    <div className="mt-1 text-sm text-orange-600">
      Add at least {MIN_DESCRIPTION - descLen} more characters for a useful breakdown.
    </div>
  )}
</div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Due Date:</label>
        <input
          type="date"
          className="w-full border border-gray-300 p-3 rounded text-base"
          value={goal.due_date || ''}
          onChange={(e) => setGoal({ ...goal, due_date: e.target.value })}
        />
      </div>

      <button
        className={`w-full py-3 text-white rounded text-lg font-semibold transition ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        onClick={handleUpdate}
        disabled={loading}
      >
        {loading ? '⏳ Regenerating...' : '🔁 Regenerate Subgoals'}
      </button>
    </div>
  );
};

export default EditGoal;