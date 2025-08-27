// src/components/GoalCard.jsx
import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const GoalCard = ({
  goal,
  onSelect,
  onDelete,
  selectedId,
  getProgress,
  getStatusIcon,
  canDelete = true,   // ✅ new prop to control visibility
}) => {
  const navigate = useNavigate();

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

  const onKeySelect = useCallback(
    (evt, id) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        handleSelect(id);
      }
    },
    [handleSelect]
  );

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
              className={`cursor-pointer px-2 py-1 rounded ${statusClass} ${
                isSelected ? 'selected' : ''
              }`}
              title={sg.title}
            >
              {getStatusIcon?.(sg.status)} {sg.title}
            </li>
          );
        })}
      </ul>

      <div>
        <button className="card-buttons" onClick={() => navigate(`/edit-goal/${goal.id}`)}>
          📝 Edit Goal
        </button>

        {/* ✅ Only render delete if allowed */}
        {canDelete && (
          <button
            className="card-buttons"
            onClick={() => onDelete?.(goal.id)}
            style={{ backgroundColor: '#a43d0e' }}
          >
            🗑️ Delete Goal
          </button>
        )}
      </div>
    </div>
  );
};

export default GoalCard;