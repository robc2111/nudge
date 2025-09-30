// src/components/SubgoalCard.jsx
import React, { memo, useCallback } from 'react';
import { sortByPosition } from '../utils/sorters';

const SubgoalCard = ({
  subgoal,
  tasks,
  selectedTaskId,
  setSelectedTaskId,
  getProgress,
  getStatusIcon,
  getStatusClass,
}) => {
  const safeTasks = Array.isArray(tasks) ? sortByPosition(tasks) : [];

  const handleSelect = useCallback(
    (id) => {
      if (!id) return;
      setSelectedTaskId(id);
    },
    [setSelectedTaskId]
  );

  if (!subgoal) {
    return (
      <div className="card">
        <picture>
          <source
            srcSet="/images/slice-240.avif 2x, /images/slice-120.avif 1x"
            type="image/avif"
          />
          <source
            srcSet="/images/slice-240.webp 2x, /images/slice-120.webp 1x"
            type="image/webp"
          />
          <img
            src="/images/slice-120.webp"
            alt="Subgoal"
            width="120"
            height="120"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <h3>No Subgoal</h3>
        <p className="text-sm text-gray-500">
          Select a subgoal to see its tasks.
        </p>
      </div>
    );
  }

  const onKeySelect = (evt, id) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      handleSelect(id);
    }
  };

  return (
    <div className="card">
      <picture>
        <source
          srcSet="/images/slice-240.avif 2x, /images/slice-120.avif 1x"
          type="image/avif"
        />
        <source
          srcSet="/images/slice-240.webp 2x, /images/slice-120.webp 1x"
          type="image/webp"
        />
        <img
          src="/images/slice-120.webp"
          alt="Subgoal"
          width="120"
          height="120"
          loading="lazy"
          decoding="async"
        />
      </picture>
      <h3
        className={`font-semibold px-2 py-1 rounded ${getStatusClass(subgoal.status)}`}
      >
        Current Subgoal: {subgoal.title}
      </h3>

      <p>📊 Progress: {getProgress(subgoal.tasks || [])}%</p>

      {safeTasks.length === 0 ? (
        <p className="text-sm text-gray-500 mt-2 italic">
          No tasks yet for this subgoal.
        </p>
      ) : (
        <ul role="listbox" aria-label="Tasks">
          {safeTasks.map((task) => {
            const isSelected = task.id === selectedTaskId;
            const statusClass =
              task.status === 'done'
                ? 'status-done'
                : task.status === 'in_progress'
                  ? 'status-in-progress'
                  : '';

            return (
              <li
                key={task.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(task.id)}
                onKeyDown={(e) => onKeySelect(e, task.id)}
                className={`cursor-pointer px-2 py-1 rounded outline-none focus:ring-2 focus:ring-green-500 ${statusClass} ${
                  isSelected ? 'selected' : ''
                }`}
                title={task.title}
              >
                {getStatusIcon(task.status)} {task.title}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default memo(SubgoalCard);
