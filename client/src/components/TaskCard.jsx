// src/components/TaskCard.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import axios from '../api/axios';

const TaskCard = ({
  task,
  microtasks,
  selectedMicrotaskId,
  setSelectedMicrotaskId,
  selectedMicrotask,
  handleMicrotaskToggle,
  getStatusIcon,
  getStatusClass,   // ← use shared status styling (prevents “unused prop” warnings)
  getProgress,
  refreshData,
}) => {
  const [loading, setLoading] = useState(false);

  // Stable, user-friendly sort:
  // 1) numeric "order" if present
  // 2) created_at timestamp
  // 3) title (locale-aware)
  const sortedMicrotasks = useMemo(() => {
    const list = Array.isArray(microtasks) ? [...microtasks] : [];
    if (!list.length) return list;

    if (typeof list[0]?.order !== 'undefined') {
      return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (list[0]?.created_at) {
      return list.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }, [microtasks]);

  const selectMicrotask = useCallback((id) => {
    if (!id || loading) return; // don’t change selection while loading an action
    setSelectedMicrotaskId((curr) => (curr === id ? null : id));
  }, [setSelectedMicrotaskId, loading]);

  const onKeySelect = useCallback((evt, id) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      selectMicrotask(id);
    }
  }, [selectMicrotask]);

  const handleBreakdown = async () => {
    if (!selectedMicrotask?.id || !selectedMicrotask?.task_id) {
      console.warn('⚠️ Missing microtask id or task_id:', selectedMicrotask);
      return;
    }
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
      console.error('❌ Breakdown failed:', err.response?.data?.error || err.message);
      toast.error('Breakdown failed');
    } finally {
      setLoading(false);
    }
  };

  if (!task) {
    return (
      <div className="card">
        <img src="/crumbs.png" alt="Task" />
        <h3>No Task</h3>
        <p className="text-sm text-gray-500">Select a task to see its microtasks.</p>
      </div>
    );
  }

  const progress = getProgress(sortedMicrotasks);

  return (
    <div className="card">
      <img src="/crumbs.png" alt="Task" />
      <h3>{task?.title || 'No Task'}</h3>
      <p>📊 Progress: {progress}%</p>

      {sortedMicrotasks.length === 0 ? (
        <p className="text-sm text-gray-500 mt-2 italic">No microtasks yet for this task.</p>
      ) : (
        <ul role="listbox" aria-label="Microtasks">
          <AnimatePresence>
            {sortedMicrotasks.map((mt) => {
              const isSelected = selectedMicrotaskId === mt.id;
              const statusClass = getStatusClass
                ? getStatusClass(mt.status)
                : mt.status === 'done'
                ? 'status-done'
                : mt.status === 'in_progress'
                ? 'status-in-progress'
                : '';

              return (
                <Motion.li
                  key={mt.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => selectMicrotask(mt.id)}
                  onKeyDown={(e) => onKeySelect(e, mt.id)}
                  className={`cursor-pointer px-2 py-1 rounded outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 ease-in-out ${statusClass} ${isSelected ? 'ring-2 ring-green-500' : ''}`}
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
        <div className="mt-4 card-buttons">
  <button
    className={`cursor-pointer px-2 py-1 rounded ${getStatusClass ? getStatusClass(selectedMicrotask.status) : ''}`}
    onClick={() => {
      if (loading) return;
      handleMicrotaskToggle(selectedMicrotaskId, selectedMicrotask.status);
    }}
    disabled={loading}
    aria-busy={loading}
  >
    {selectedMicrotask.status === 'done'
      ? '⏪ Mark as In Progress'
      : '✅ Mark as Done'}
  </button>

  <button
    className="card-buttons text-blue-600 underline text-sm ml-4 bg-purple-600 hover:bg-purple-700"
    onClick={handleBreakdown}
    disabled={!selectedMicrotask?.task_id || loading}
    aria-busy={loading}
  >
    {loading ? '⏳ Breaking down...' : '🪄 Break Down'}
  </button>

</div>
      ) : (
        <p className="text-sm text-gray-500 mt-2 italic">
          Select a microtask to mark or break it down
        </p>
      )}
    </div>
  );
};

export default TaskCard;