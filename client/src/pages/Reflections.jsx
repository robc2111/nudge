//Reflections.jsx
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';

const Reflections = () => {
  const [reflections, setReflections] = useState([]);
  const [goals, setGoals] = useState([]);
  const [filters, setFilters] = useState({
    goal_id: '',
    start_date: '',
    end_date: '',
    sort: 'desc'
  });
  const [userId, setUserId] = useState(null);

  // New state for adding a reflection
  const [newReflection, setNewReflection] = useState({
    goal_id: '',
    content: ''
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  // Fetch user ID
  useEffect(() => {
    axios.get('/users/me')
      .then(res => {
        setUserId(res.data.id);
      })
      .catch(err => console.error('Error fetching user ID:', err));
  }, []);

  // Fetch reflections & goals
  const fetchReflections = async () => {
    try {
      const params = {
        user_id: userId,
        goal_id: filters.goal_id || undefined,
        start_date: filters.start_date?.trim() || undefined,
        end_date: filters.end_date?.trim() || undefined,
        sort: filters.sort || 'desc'
      };
      const res = await axios.get('/reflections', { params });
      setReflections(res.data);
    } catch (err) {
      console.error('Error fetching reflections:', err.message);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await axios.get(`/goals?user_id=${userId}`);
      setGoals(res.data);
    } catch (err) {
      console.error('Error fetching goals:', err.message);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchReflections();
      fetchGoals();
    }
  }, [userId, JSON.stringify(filters)]);

  // Handle adding a reflection
  const handleAddReflection = async (e) => {
  e.preventDefault();
  setError('');

  if (!newReflection.content.trim()) {
    setError('Please enter your reflection.');
    return;
  }

  try {
    setAdding(true);
    await axios.post('/reflections', {
      user_id: userId,
      goal_id: newReflection.goal_id || null, // ✅ Allow null for N/A
      content: newReflection.content
    });

    // Clear form
    setNewReflection({ goal_id: '', content: '' });

    // Refresh reflections
    fetchReflections();
  } catch (err) {
    console.error('Error adding reflection:', err.message);
    setError('Failed to add reflection.');
  } finally {
    setAdding(false);
  }
};

  if (!userId) return <p className="text-center mt-10">Loading reflections...</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🪞 Your Reflections</h1>

      {/* Add Reflection Form */}
      <form onSubmit={handleAddReflection} className="add-reflection-form">
        <select
          value={newReflection.goal_id}
          onChange={(e) => setNewReflection(prev => ({ ...prev, goal_id: e.target.value }))}
        >
          <option value="">Select Goal</option>
          {goals.map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>

        <textarea
  placeholder="Write your reflection..."
  value={newReflection.content}
  onChange={(e) => setNewReflection(prev => ({ ...prev, content: e.target.value }))}
  maxLength={500} // ✅ Prevents typing past limit
/>
<div style={{ fontSize: '0.85rem', color: '#666', textAlign: 'right' }}>
  {newReflection.content.length} / 500 characters
</div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={adding}>
          {adding ? 'Saving...' : 'Add Reflection'}
        </button>
      </form>

      {/* Filters */}
      <div className="controls-group">
        <select name="goal_id" value={filters.goal_id} onChange={(e) => setFilters(prev => ({ ...prev, goal_id: e.target.value }))}>
          <option value="">All Goals</option>
          {goals.map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
        <input type="date" name="start_date" value={filters.start_date} onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))} />
        <input type="date" name="end_date" value={filters.end_date} onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))} />
        <select name="sort" value={filters.sort} onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}>
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Reflections Grid */}
      {reflections.length === 0 ? (
        <p>No reflections found for these filters.</p>
      ) : (
        <div className="reflections-grid">
          {reflections.map(ref => (
            <div key={ref.id} className="reflection-card">
              <div className="reflection-date">
                {new Date(ref.created_at).toLocaleString()}
              </div>
              <div className="reflection-goal">
                Goal: {ref.goal_name || 'N/A'}
              </div>
              <div className="reflection-content">
                {ref.content || 'No content'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reflections;