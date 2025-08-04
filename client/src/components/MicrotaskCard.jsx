// MicrotaskCard.jsx
import React from 'react';
//import axios from '../../api/axios';

const MicrotaskCard = ({ microtask, refreshData }) => {
  const handleBreakdown = async () => {
    try {
    //   const res = await axios.post(`/api/gpt/breakdown`, {
    //     microtaskId: microtask.id,
    //     title: microtask.title,
    //     taskId: microtask.task_id,
    //   });
      refreshData(); // re-fetch updated goal data
    } catch (err) {
      console.error('Error breaking down microtask:', err.message);
    }
  };

  return (
    <div className="microtask-card">
      <p>{microtask.title}</p>
      <button onClick={handleBreakdown}>Break Down</button>
    </div>
  );
};

export default MicrotaskCard;