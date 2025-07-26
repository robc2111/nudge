//Dashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';

const Dashboard = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/users/${userId}/dashboard`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard:', err.message);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p>Loading dashboard...</p>;
  if (!data?.goal) return <p>No goals yet. Create one to get started!</p>;

  const { user, goal, subgoals, current } = data;

  return (
    <div>
      <h1>👋 Welcome, {user.name}</h1>
      <h2>🎯 {goal.title}</h2>
      <p>{goal.description}</p>
      <p>📊 Progress: {goal.percentage_complete}%</p>

      <h3>📌 Current Focus</h3>
      <p>
        Subgoal ID: {current.subgoalId} <br />
        Task ID: {current.taskId} <br />
        Microtask ID: {current.microtaskId}
      </p>

      <h3>📂 Subgoals</h3>
      {subgoals.map(subgoal => (
        <div key={subgoal.id} style={{ marginBottom: '1.5rem' }}>
          <h4>{subgoal.title}</h4>
          {subgoal.tasks.map(task => (
            <div key={task.id} style={{ paddingLeft: '1rem' }}>
              <strong>{task.title}</strong> — {task.status}
              <ul>
                {task.microtasks.map(mt => (
                  <li key={mt.id}>
                    [{mt.status === 'done' ? '✅' : '⬜'}] {mt.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Dashboard;