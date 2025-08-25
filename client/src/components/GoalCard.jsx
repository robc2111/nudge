// src/components/GoalCard.jsx
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const GoalCard = ({
  goal,
  onSelect,
  onDelete,
  selectedId,
  getProgress,
  getStatusIcon,
  refreshDashboard,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(goal?.status ?? 'not_started');

  // keep local status in sync
  useEffect(() => {
    setStatus(goal?.status ?? 'not_started');
  }, [goal?.status]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    try {
      await axios.put(`/goals/${goal.id}/status`, { status: newStatus });
      refreshDashboard?.();
      toast.success(`Goal marked as "${newStatus.replace('_', ' ')}"!`, {
        position: 'bottom-right',
      });
    } catch (err) {
      console.error('❌ Failed to update goal status:', err.message);
      toast.error('Failed to update goal status', { position: 'bottom-right' });
      setStatus(goal?.status ?? 'not_started'); // rollback
    }
  };

  // ---------- sorting helpers & hooks (must be before any return) ----------
  // const tieBreakSort = (a, b) => {
  //  // prefer order_index, and keep 0
  //  const ai = Number(a?.order_index ?? Number.MAX_SAFE_INTEGER);
  //  const bi = Number(b?.order_index ?? Number.MAX_SAFE_INTEGER);
  //  if (ai !== bi) return ai - bi;
  //   if (a?.created_at && b?.created_at) {
  //     return new Date(a.created_at) - new Date(b.created_at);
  //   }
  //   return String(a?.title || '').localeCompare(String(b?.title || ''));
  // };

  const sortedSubgoals = useMemo(() => {
    const list = Array.isArray(goal?.subgoals) ? [...goal.subgoals] : [];
    return list.sort((a, b) => {
      const ai = Number(a?.order_index ?? Number.MAX_SAFE_INTEGER);
      const bi = Number(b?.order_index ?? Number.MAX_SAFE_INTEGER);
      if (ai !== bi) return ai - bi;
     if (a?.created_at && b?.created_at) return new Date(a.created_at) - new Date(b.created_at);
     return String(a?.title || '').localeCompare(String(b?.title || ''));
   });
 }, [goal?.subgoals]);

  const progress = useMemo(
    () => getProgress?.(goal?.subgoals || []) ?? 0,
    [goal?.subgoals, getProgress]
  );

  const handleSelect = useCallback(
    (id) => onSelect?.(id),
    [onSelect]
  );

  const onKeySelect = useCallback((evt, id) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      handleSelect(id);
    }
  }, [handleSelect]);

  // ---------- early render for empty goal (hooks already executed above) ----------
  if (!goal) {
    return (
      <div className="card">
        <img src="/cake.png" alt="Goal" />
        <h3>No goal selected</h3>
      </div>
    );
  }

  return (
    <div className="card">
      <img src="/cake.png" alt="Goal" />
      <h3>Goal: {goal.title}</h3>
      <p>📊 Progress: {progress}%</p>

      <label htmlFor={`goal-status-${goal.id}`} style={{ marginRight: 6 }}>
        <strong>Status:</strong>
      </label>
      <select
        id={`goal-status-${goal.id}`}
        value={status}
        onChange={handleStatusChange}
        className="form-input"
        style={{ maxWidth: 220 }}
      >
        <option value="not_started">Not Started</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <h4 style={{ marginTop: '0.75rem' }}>Subgoals</h4>
      <ul role="listbox" aria-label="Subgoals">
        {sortedSubgoals.map((sg) => {
          const isSelected = sg.id === selectedId;
          const statusClass =
            sg.status === 'done'
              ? 'status-done'
              : sg.status === 'in_progress'
              ? 'status-in-progress'
              : '';
          return (
            <li
              key={sg.id}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => handleSelect(sg.id)}
              onKeyDown={(e) => onKeySelect(e, sg.id)}
              className={`cursor-pointer px-2 py-1 rounded ${statusClass} ${isSelected ? 'selected' : ''}`}
              title={sg.title}
            >
              {getStatusIcon?.(sg.status)} {sg.title}
            </li>
          );
        })}
      </ul>

      <div  >
        <button className="card-buttons" onClick={() => navigate(`/edit-goal/${goal.id}`)}>
          📝 Edit Goal
        </button>
        <button
          className="card-buttons"
          onClick={() => onDelete?.(goal.id)}
          style={{ backgroundColor: '#a43d0e' }}
        >
          🗑️ Delete Goal
        </button>
      </div>
    </div>
  );
};

export default GoalCard;