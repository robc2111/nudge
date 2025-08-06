// TaskCard.jsx
// TaskCard.jsx
import React, { useState } from 'react';
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
  getProgress,
  refreshData
}) => {
  const [loading, setLoading] = useState(false);
  const sortedMicrotasks = [...microtasks].sort((a, b) => a.id - b.id);

  const handleBreakdown = async () => {
    if (!selectedMicrotask?.task_id) {
      console.warn("⚠️ Microtask is missing task_id:", selectedMicrotask);
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
      refreshData();
      setSelectedMicrotaskId(null);
    } catch (err) {
      console.error('❌ Breakdown failed:', err.response?.data?.error || err.message);
      toast.error('Breakdown failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <img src="/crumbs.png" alt="Task" />
      <h3>{task?.title || 'No Task'}</h3>
      <p>📊 Progress: {getProgress(microtasks)}%</p>

      <ul>
        <AnimatePresence>
          {sortedMicrotasks.map(mt => (
            <Motion.li
              key={mt.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              onClick={() =>
                setSelectedMicrotaskId(selectedMicrotaskId === mt.id ? null : mt.id)
              }
              className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ease-in-out ${
                mt.status === 'done'
                  ? 'status-done'
                  : mt.status === 'in_progress'
                  ? 'status-in-progress'
                  : ''
              } ${selectedMicrotaskId === mt.id ? 'ring-2 ring-green-500' : ''}`}
            >
              {getStatusIcon(mt.status)} {mt.title}
            </Motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {selectedMicrotask ? (
        <div className="mt-4">
          <button
            className={`cursor-pointer px-2 py-1 rounded ${
              selectedMicrotask.status === 'done'
                ? 'status-done'
                : selectedMicrotask.status === 'in_progress'
                ? 'status-in-progress'
                : ''
            }`}
            onClick={() => {
              handleMicrotaskToggle(selectedMicrotaskId, selectedMicrotask.status);
              setSelectedMicrotaskId(null);
            }}
          >
            {selectedMicrotask.status === 'done'
              ? '⏪ Mark as In Progress'
              : '✅ Mark as Done'}
          </button>

          <button
            className={`card-buttons text-blue-600 underline text-sm ml-4 ${
              selectedMicrotask?.task_id && !loading
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={handleBreakdown}
            disabled={!selectedMicrotask?.task_id || loading}
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