//GoalSetup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoalSetup = () => {
  const [goalText, setGoalText] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // Fetch user ID from /users/me on mount
  useEffect(() => {
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn("⚠️ No token found in localStorage.");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);

      const data = await res.json();

      if (data?.id) {
        setUserId(data.id);
        console.log("✅ User ID fetched and set:", data.id);
      } else {
        console.warn("⚠️ /users/me response missing id:", data);
      }
    } catch (err) {
      console.error("❌ Error fetching user from /me:", err.message);
    }
  };

  fetchUser();
}, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    setBreakdown(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/goal-breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText }),
      });

      if (!response.ok) throw new Error('Failed to generate breakdown');

      const data = await response.json();

      setBreakdown({
        title: data.goal,
        tone: data.tone,
        subgoals: data.subgoals,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log("🟢 Save button clicked");
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

    console.log("📤 Payload:", payload);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to save goal');

      console.log('✅ Goal saved:', result);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
    
setSaved(true);

setTimeout(() => {
  navigate('/dashboard');
}, 1000); // Optional delay for "Goal saved" message
  };

  return (
    <div className="max-w-xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">🎯 Goal Setup</h2>

      <textarea
        className="w-full border p-2 rounded mb-2"
        placeholder="Describe your goal in natural language..."
        rows={4}
        value={goalText}
        onChange={(e) => setGoalText(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleGenerate}
        disabled={loading || !goalText.trim()}
      >
        {loading ? 'Generating...' : 'Generate Breakdown'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      {saved && <p className="text-green-600 mt-2">✅ Goal saved successfully</p>}

      {breakdown && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg">AI Breakdown:</h3>
          <pre className="bg-gray-100 p-3 mt-2 rounded text-sm overflow-auto">
            {JSON.stringify(breakdown, null, 2)}
          </pre>

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
            className="bg-green-600 text-white mt-4 px-4 py-2 rounded"
            onClick={handleSave}
          >
            Confirm & Save
          </button>
        </div>
      )}
    </div>
  );
};

export default GoalSetup;