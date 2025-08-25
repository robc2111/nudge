// src/components/TaskCard.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import { sortByPosition } from '../utils/sorters';

const TaskCard = ({
  task,
  microtasks,
  selectedMicrotaskId,
  setSelectedMicrotaskId,
  selectedMicrotask,
  handleMicrotaskToggle,
  getStatusIcon,
  getStatusClass,   // used to keep status styling consistent across cards
  getProgress,
  refreshData,
}) => {
  const [loading, setLoading] = useState(false);

  // Sort microtasks so in_progress → todo → done, then apply tie-breakers
  const orderedMicros = useMemo(() => sortByPosition(Array.isArray(microtasks) ? microtasks : []), [microtasks]);

  const progress = getProgress(orderedMicros);

  const selectMicrotask = useCallback(
    (id) => {
      if (!id || loading) return;
      setSelectedMicrotaskId(id);
    },
    [loading, setSelectedMicrotaskId]
  );

  const onKeySelect = useCallback(
    (evt, id) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        selectMicrotask(id);
      }
    },
    [selectMicrotask]
  );

  

  const handleBreakdown = async () => {
    if (!selectedMicrotask?.id || !selectedMicrotask?.task_id) return;
    setLoading(true);
    try {
      await axios.post('/gpt/breakdown', {
        microtaskId: selectedMicrotask.id,
        title: selectedMicrotask.title,
        taskId: selectedMicrotask.task_id,
      });
      toast.success('✅ Microtask broken down!');
      refreshData?.();
      setSelectedMicrotaskId(null);
    } catch (err) {
      console.error('Breakdown failed:', err.response?.data?.error || err.message);
      toast.error('Breakdown failed');
    } finally {
      setLoading(false);
    }
  };

  if (!task) {
    return (
      <div className="card">
        <img src="/crumbs.png" alt="Task" />
        <h3>Current Task</h3>
        <p className="text-sm text-gray-500">Pick a subgoal to see its tasks.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <img src="/crumbs.png" alt="Task" />
      <h3>Current Task: {task.title}</h3>
      <p>📊 Progress: {progress}%</p>

      {orderedMicros.length === 0 ? (
        <p className="text-sm text-gray-500 mt-2 italic">No microtasks yet.</p>
      ) : (
        <ul role="listbox" aria-label="Microtasks">
          <AnimatePresence>
            {orderedMicros.map((mt) => {
              const isSelected = selectedMicrotaskId === mt.id;
              const statusClass =
                getStatusClass?.(mt.status) ||
                (mt.status === 'done'
                  ? 'status-done'
                  : mt.status === 'in_progress'
                  ? 'status-in-progress'
                  : '');

              return (
                <Motion.li
                  key={mt.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => selectMicrotask(mt.id)}
                  onKeyDown={(e) => onKeySelect(e, mt.id)}
                  className={`cursor-pointer px-2 py-1 rounded ${statusClass} ${
                    isSelected ? 'selected' : ''
                  }`}
                  title={mt.title}
                >
                  {getStatusIcon(mt.status)} {mt.title}
                </Motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {selectedMicrotask ? (
        <div >
          <button
            className="card-buttons"
            onClick={() =>
              !loading &&
              handleMicrotaskToggle(selectedMicrotaskId, selectedMicrotask.status)
            }
            disabled={loading}
            aria-busy={loading}
          >
            {selectedMicrotask.status === 'done'
              ? '↩︎ Mark In Progress'
              : '✅ Mark as Done'}
          </button>

          <button
            className="card-buttons"
            onClick={handleBreakdown}
            disabled={!selectedMicrotask?.task_id || loading}
            aria-busy={loading}
          >
            {loading ? '⏳ Breaking down…' : '🪄 Break Down'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-2 italic">
          Select a microtask to mark or break it down.
        </p>
      )}
    </div>
  );
};

export default TaskCard;