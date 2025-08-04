//TaskCard.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { AnimatePresence, motion as Motion } from 'framer-motion';

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

  const handleBreakdown = async () => {
    if (!selectedMicrotask?.task_id) {
      console.warn("⚠️ Microtask is missing task_id:", selectedMicrotask);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/gpt/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microtaskId: selectedMicrotask.id,
          title: selectedMicrotask.title,
          taskId: selectedMicrotask.task_id
        })
      });

      if (!response.ok) throw new Error('Breakdown request failed');

      toast.success('✅ Microtask broken down!');
      refreshData();
      setSelectedMicrotaskId(null);
    } catch (err) {
      console.error('❌ Breakdown failed:', err.message);
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
          {microtasks.map(mt => (
            <Motion.li
              key={mt.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedMicrotaskId(selectedMicrotaskId === mt.id ? null : mt.id)}
              className={`cursor-pointer px-2 py-1 rounded ${
                selectedMicrotaskId === mt.id ? 'bg-green-100 font-semibold' : ''
              }`}
            >
              {getStatusIcon(mt.status)} {mt.title}
            </Motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {selectedMicrotask && (
        <>
          <button
            className={`mt-2 ${
              selectedMicrotask.status === 'done' ? 'bg-yellow-500' : 'bg-green-600'
            } text-white px-3 py-1 rounded`}
            onClick={() => {
              handleMicrotaskToggle(selectedMicrotaskId, selectedMicrotask.status);
              setSelectedMicrotaskId(null);
            }}
          >
            {selectedMicrotask.status === 'done' ? '⏪ Mark as In Progress' : '✅ Mark as Done'}
          </button>

          <button
            className={`mt-2 ml-2 px-3 py-1 rounded text-white ${
              selectedMicrotask?.task_id && !loading ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={handleBreakdown}
            disabled={!selectedMicrotask?.task_id || loading}
          >
            {loading ? '⏳ Breaking down...' : '🪄 Break Down'}
          </button>
        </>
      )}
    </div>
  );
};

export default TaskCard;