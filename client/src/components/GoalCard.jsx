import React from 'react';
import { useNavigate } from 'react-router-dom';

const GoalCard = ({ goal, onSelect, onDelete, selectedId, getProgress, getStatusIcon }) => {
  const navigate = useNavigate();

  return (
    <div className="card">
      <img src="/cake.png" alt="Goal" />
      <h3>{goal.title}</h3>
      <p>📊 Progress: {getProgress(goal.subgoals || [])}%</p>
      <p><strong>Status:</strong> {goal.status}</p>

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
          className="text-blue-600 underline text-sm mr-4"
          onClick={() => navigate(`/edit-goal/${goal.id}`)}
        >
          Edit
        </button>
        <button
          className="text-red-600 underline text-sm"
          onClick={() => onDelete(goal.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default GoalCard;