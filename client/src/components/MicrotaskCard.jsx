// MicrotaskCard.jsx
import React, { useState } from 'react';
import axios from '../../api/axios'; // ✅ keep imports at the top

const MicrotaskCard = ({ microtask, refreshData }) => {
  const [loading, setLoading] = useState(false);

  const handleBreakdown = async () => {
    setLoading(true);
    try {
      await axios.post('/api/gpt/breakdown', {
        microtaskId: microtask.id,
        title: microtask.title,
        taskId: microtask.task_id,
      });
      refreshData();
    } catch (err) {
      console.error('❌ Breakdown failed:', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="microtask-card">
      <p>{microtask.title}</p>
      <button onClick={handleBreakdown} disabled={loading}>
        {loading ? 'Breaking down...' : 'Break Down'}
      </button>
    </div>
  );
};

export default MicrotaskCard;