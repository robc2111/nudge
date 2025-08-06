//GoalSetup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const GoalSetup = () => {
  const [goalText, setGoalText] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // ✅ Fetch user ID on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/users/me');
        if (res.data?.id) {
          setUserId(res.data.id);
          console.log('✅ User ID fetched:', res.data.id);
        }
      } catch (err) {
        console.error('❌ Error fetching user:', err.response?.data || err.message);
        setError('Failed to fetch user. Please log in again.');
      }
    };

    fetchUser();
  }, []);

  // ✅ Generate breakdown
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    setBreakdown(null);

    try {
      const response = await axios.post('/ai/goal-breakdown', { goal: goalText });
      const data = response.data;

      setBreakdown({
        title: data.goal,
        tone: data.tone,
        subgoals: data.subgoals,
      });
    } catch (err) {
      console.error('❌ Breakdown error:', err);
      setError(err.response?.data?.error || 'Failed to generate breakdown');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save goal
  const handleSave = async () => {
    setSaved(false);
    setError('');

    if (!userId) {
      setError('User not loaded. Please log in again.');
      return;
    }

    if (!breakdown?.tone || !breakdown?.title) {
      setError('Missing tone or goal title.');
      return;
    }

    const payload = {
      user_id: userId,
      title: breakdown.title,
      tone: breakdown.tone,
      subgoals: breakdown.subgoals,
    };

    try {
      await axios.post('/goals', payload);
      setSaved(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      console.error('❌ Save error:', err);
      setError(err.response?.data?.error || 'Failed to save goal');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 p-4 bg-white rounded shadow text-center">
      <h2 className="text-2xl font-bold mb-4">🎯 Goal Setup</h2>

      <div className="flex flex-col items-center gap-4 mb-6">
        <textarea
          className="goal-textarea"
          placeholder="Describe your goal in natural language..."
          rows={5}
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
        />

        <button
          className="btn"
          style={{ width: '60%' }}
          onClick={handleGenerate}
          disabled={loading || !goalText.trim()}
        >
          {loading ? 'Generating...' : 'Generate Breakdown'}
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      {saved && <p className="text-green-600 mt-2">✅ Goal saved successfully</p>}

      {breakdown && (
        <div className="mt-6 text-left">
          <h3 className="font-semibold text-lg">AI Breakdown:</h3>
          <div className="text-left bg-gray-50 p-4 mt-4 rounded shadow-sm">
  <h4 className="text-lg font-bold mb-2">{breakdown.title}</h4>

  {breakdown.subgoals.map((subgoal, i) => (
    <div key={i} className="mb-4 pl-4 border-l-4 border-orange-300">
      <h5 className="text-md font-semibold text-orange-700 mb-1">🧩 {subgoal.title}</h5>

      {subgoal.tasks?.map((task, j) => (
        <div key={j} className="ml-4 mb-2">
          <p className="font-medium text-gray-800">🔹 {task.title}</p>
          <ul className="list-disc list-inside text-sm text-gray-700 ml-4">
            {task.microtasks?.map((micro, k) => (
              <li key={k}>🟠 {micro}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  ))}
</div>
<div className="goalsetup-container">
          <div className="mt-4">
            <label className="block mb-1 font-medium">Choose your coaching tone:</label>
            <select
              className="w-full border p-2 rounded"
              value={breakdown.tone || ''}
              onChange={(e) =>
                setBreakdown((prev) => ({ ...prev, tone: e.target.value }))
              }
            >
              <option value="" disabled>Select tone</option>
              <option value="friendly">😊 Friendly</option>
              <option value="strict">💼 Strict</option>
              <option value="motivational">💪 Motivational</option>
            </select>
          </div>

          <button
            className="btn bg-green-600 text-white mt-4 mb-4 px-4 py-2 rounded"
            onClick={handleSave}
          >
            Confirm & Save
          </button>
        </div>
        
        </div>
      )}
    </div>
  );
};

export default GoalSetup;