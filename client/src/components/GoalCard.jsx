// GoalCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const GoalCard = ({ goal, onSelect, onDelete, selectedId, getProgress, getStatusIcon, refreshDashboard }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(goal.status);

  const handleStatusChange = async (e) => {
  const newStatus = e.target.value;
  setStatus(newStatus);

  try {
    await axios.put(`/goals/${goal.id}/status`, { status: newStatus });
    if (refreshDashboard) refreshDashboard();

    toast.success(`Goal marked as "${newStatus.replace('_', ' ')}"!`, {
      position: 'bottom-right',
    });
  } catch (err) {
    console.error('❌ Failed to update goal status:', err.message);
    toast.error("Failed to update goal status", { position: 'bottom-right' });
  }
};

  return (
    <div className="card">
      <img src="/cake.png" alt="Goal" />
      <h3>{goal.title}</h3>
      <p>📊 Progress: {getProgress(goal.subgoals || [])}%</p>

      <label>Status:</label>
      <select value={status} onChange={handleStatusChange}>
        <option value="not_started">Not Started</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <h4>Subgoals</h4>
      <ul>
        {(goal.subgoals || []).map(sg => (
          <li
            key={sg.id}
            onClick={() => onSelect(sg.id)}
            className={sg.id === selectedId ? 'selected' : ''}
          >
            {getStatusIcon(sg.status)} {sg.title}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <button
          className="card-buttons text-blue-600 underline text-sm mr-4"
          onClick={() => navigate(`/edit-goal/${goal.id}`)}
        >
          📝 Edit Goal
        </button>
        <button
          className="card-buttons text-red-600 underline text-sm"
          onClick={() => onDelete(goal.id)}
        >
          🗑️ Delete Goal
        </button>
      </div>
    </div>
  );
};

export default GoalCard;