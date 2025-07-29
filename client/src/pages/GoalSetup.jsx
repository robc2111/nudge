//GoalSetup.jsx
import React, { useState } from 'react';

const GoalSetup = () => {
  const [goalText, setGoalText] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

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
      setBreakdown(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaved(false);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // assumes session is stored via cookie
        body: JSON.stringify(breakdown),
      });

      if (!response.ok) throw new Error('Failed to save');

      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
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