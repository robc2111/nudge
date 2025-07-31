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

  // Get user ID from /users/me
  useEffect(() => {
    axios.get('/users/me')
      .then(res => {
        console.log('📌 User ID for reflections:', res.data.id);
        setUserId(res.data.id);
      })
      .catch(err => console.error('Error fetching user ID:', err));
  }, []);

  // Fetch reflections and goals once we have the userId
  useEffect(() => {
    if (!userId) return;

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

    fetchReflections();
    fetchGoals();
  }, [userId, JSON.stringify(filters)]); // prevents endless re-renders

  const handleChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!userId) return <p className="text-center mt-10">Loading reflections...</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🪞 Your Reflections</h1>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          name="goal_id"
          value={filters.goal_id}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        >
          <option value="">All Goals</option>
          {goals.map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>

        <input
          type="date"
          name="start_date"
          value={filters.start_date}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          name="end_date"
          value={filters.end_date}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />

        <select
          name="sort"
          value={filters.sort}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {reflections.length === 0 ? (
        <p className="text-gray-500">No reflections found for these filters.</p>
      ) : (
        <div className="space-y-4">
          {reflections.map(ref => (
            <div key={ref.id} className="border p-4 rounded shadow-sm">
              <div className="text-sm text-gray-500">{new Date(ref.created_at).toLocaleString()}</div>
              <div className="text-sm text-gray-600 italic">Goal: {ref.goal_name || 'N/A'}</div>
              <div className="mt-2 text-base whitespace-pre-wrap">
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