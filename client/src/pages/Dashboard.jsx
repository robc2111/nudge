//Dashboard.jsx
import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedSubgoalId, setSelectedSubgoalId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    axios.get('/users/me')
      .then(userRes => axios.get(`/users/${userRes.data.id}/dashboard`))
      .then(res => {
        setData(res.data);
        const goals = res.data.goals || [];
        const defaultGoal = goals.find(g => g.status === 'in_progress') || goals[0];
        setSelectedGoalId(defaultGoal?.id || null);
      })
      .catch(err => console.error('Dashboard error:', err));
  }, []);

  useEffect(() => {
    setSelectedSubgoalId(null);
  }, [selectedGoalId]);

  useEffect(() => {
    setSelectedTaskId(null);
  }, [selectedSubgoalId]);

  const allGoals = data?.goals || [];
  const selectedGoal = allGoals.find(g => g.id === selectedGoalId);
  const subgoals = selectedGoal?.subgoals || [];
  const filteredSubgoals = statusFilter === 'all' ? subgoals : subgoals.filter(sg => sg.status === statusFilter);
  const selectedSubgoal = filteredSubgoals.find(sg => sg.id === selectedSubgoalId) || filteredSubgoals[0];
  const tasks = selectedSubgoal?.tasks || [];
  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  const selectedTask = filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0];
  const microtasks = selectedTask?.microtasks || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'todo': return '🕒';
      case 'in_progress': return '⚙️';
      case 'done': return '✅';
      default: return '❓';
    }
  };

  const getGoalMicrotasks = (goal) =>
    goal?.subgoals?.flatMap(sg => sg.tasks?.flatMap(t => t.microtasks || []) || []) || [];

  const getSubgoalMicrotasks = (subgoal) =>
    subgoal?.tasks?.flatMap(t => t.microtasks || []) || [];

  const getProgress = (items = []) => {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  if (!data) return <p>Loading...</p>;

  return (
    <div className="dashboard">
      <div className="dashboard-controls">
        <div className="goal-selector">
          <label><strong>Goal:</strong></label>
          <select value={selectedGoalId || ''} onChange={e => setSelectedGoalId(parseInt(e.target.value))}>
            {allGoals.map(goal => (
              <option key={goal.id} value={goal.id}>
                {getStatusIcon(goal.status)} {goal.title}
              </option>
            ))}
          </select>
        </div>

        <div className="status-filter">
          <label><strong>Filter:</strong></label>
          {['todo', 'in_progress', 'done', 'all'].map(status => (
            <button
              key={status}
              className={status === statusFilter ? 'active' : ''}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="tone-selector">
          <label><strong>Tone:</strong></label>
          <select onChange={(e) => console.log('Tone selected:', e.target.value)}>
            <option value="mouse">🐭 Mouse</option>
            <option value="sparrow">🐦 Sparrow</option>
            <option value="ant">🐜 Ant</option>
            <option value="owl">🦉 Owl</option>
            <option value="frog">🐸 Frog</option>
          </select>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <img src="/cake.png" alt="Goal" />
          <h3>{selectedGoal?.title || 'No Goal'}</h3>
          <p>📊 Progress: {getProgress(getGoalMicrotasks(selectedGoal))}%</p>
          <p><strong>Status:</strong> {selectedGoal?.status}</p>
          <h4>Subgoals</h4>
          <ul>
            {(selectedGoal?.subgoals || []).map(sg => (
              <li
                key={sg.id}
                onClick={() => setSelectedSubgoalId(sg.id)}
                className={sg.id === selectedSubgoalId ? 'selected' : ''}
              >
                {getStatusIcon(sg.status)} {sg.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <img src="/slice.png" alt="Subgoal" />
          <h3>{selectedSubgoal?.title || 'No Subgoal'}</h3>
          <p>📊 Progress: {getProgress(getSubgoalMicrotasks(selectedSubgoal))}%</p>
          <ul>
            {filteredTasks.map(task => (
              <li
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={task.id === selectedTask?.id ? 'selected' : ''}
              >
                {getStatusIcon(task.status)} {task.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <img src="/crumbs.png" alt="Task" />
          <h3>{selectedTask?.title || 'No Task'}</h3>
          <p>📊 Progress: {getProgress(microtasks)}%</p>
          <ul>
            {microtasks.map(mt => (
              <li key={mt.id}>
                {getStatusIcon(mt.status)} {mt.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;