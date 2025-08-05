// EditGoal.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios'; // ✅ axios instance with baseURL and token

const EditGoal = () => {
  const { id } = useParams(); // Goal ID
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

  const handleUpdate = async () => {
  setError('');
  setLoading(true); // 🔄 Start loading
  try {
    // 🔁 1. Regenerate breakdown via AI
    await axios.post(`/ai/goals/${id}/regenerate`, {
      description: goal.description
    });

    // 🔁 2. Update goal details
    await axios.put(`/goals/${id}`, {
      title: goal.title,
      description: goal.description,
      due_date: goal.due_date
    });

    navigate('/dashboard');
  } catch (err) {
    console.error('❌ Update error:', err.message);
    setError('Something went wrong during update.');
  } finally {
    setLoading(false); // ✅ Stop loading
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
  
  <textarea
    id="description"
    placeholder="Add details or make changes to your goal..."
    className="goal-textarea w-full border rounded p-3 min-h-[150px]"
    value={goal.description || ''}
    onChange={(e) => setGoal({ ...goal, description: e.target.value })}
  />
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