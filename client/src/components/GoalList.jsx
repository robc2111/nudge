import React, { useEffect, useState } from 'react';
import axios from '../api/axios';

const GoalList = () => {
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/goals')
      .then(res => setGoals(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to fetch goals');
      });
  }, []);

  return (
    <div>
      <h2>User Goals</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {goals.length === 0 ? (
        <p>No goals found.</p>
      ) : (
        <ul>
          {goals.map(goal => (
            <li key={goal.id}>
              <strong>{goal.title}</strong><br />
              {goal.description} <br />
              Due: {goal.due_date?.slice(0, 10)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GoalList;