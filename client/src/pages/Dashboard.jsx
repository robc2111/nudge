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

  if (!data) return <p>Loading...</p>;

  const allGoals = data.goals || [];
  const selectedGoal = allGoals.find(g => g.id === selectedGoalId);

  const subgoals = selectedGoal?.subgoals || [];
  const filteredSubgoals = statusFilter === 'all'
    ? subgoals
    : subgoals.filter(sg => sg.status === statusFilter);

  const selectedSubgoal = filteredSubgoals.find(sg => sg.id === selectedSubgoalId) || filteredSubgoals[0];

  const tasks = selectedSubgoal?.tasks || [];
  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  const selectedTask = filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0];
  const microtasks = selectedTask?.microtasks || [];

  const getStatusIcon = (status) => {
  switch (status) {
    case 'todo':
      return '🕒';
    case 'in_progress':
      return '⚙️';
    case 'done':
      return '✅';
    default:
      return '❓';
  }
};

const getGoalMicrotasks = (goal) => {
  if (!goal?.subgoals) return [];
  return goal.subgoals.flatMap(sg =>
    sg.tasks?.flatMap(t => t.microtasks || []) || []
  );
};

const getSubgoalMicrotasks = (subgoal) => {
  return subgoal?.tasks?.flatMap(t => t.microtasks || []) || [];
};

const getProgress = (items = []) => {
  const total = items.length;
  const done = items.filter(i => i.status === 'done').length;
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
};

console.log('GOAL SUBGOALS:', selectedGoal?.subgoals);
console.log('SUBGOAL TASKS:', selectedSubgoal?.tasks);
console.log('TASK MICROTASKS:', selectedTask?.microtasks);
  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      {/* Status Filter */}
      <div className="status-filter" style={{ marginBottom: '1rem' }}>
        <label><strong>Filter:</strong> </label>
        {['todo', 'in_progress', 'done', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              margin: '0 0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: status === statusFilter ? '#bd661d' : '#fef0dd',
              color: status === statusFilter ? '#fff' : '#000',
              border: '1px solid #ccc'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* === 3 Cards === */}
      <div className="dashboard-cards" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>

        {/* 🎯 Card 1: Selected Goal + Subgoal List */}
<div className="card" style={cardStyle}>
  <img src="/cake.png" alt="Goal" width="50" />
  <h3>{selectedGoal?.title || 'No Goal'}</h3>
  <p>📊 Progress: {getProgress(getGoalMicrotasks(selectedGoal))}%</p>
  <p><strong>Status:</strong> {selectedGoal?.status}</p>

  <h4>Subgoals</h4>
  <ul>
  {(selectedGoal?.subgoals || []).map(sg => (
    <li
      key={sg.id}
      onClick={() => setSelectedSubgoalId(sg.id)}
      style={{
        cursor: 'pointer',
        fontWeight: sg.id === selectedSubgoalId ? 'bold' : 'normal',
        backgroundColor: sg.id === selectedSubgoalId ? '#fef0dd' : 'transparent',
        padding: '0.3rem 0.5rem',
        borderRadius: '6px',
        marginBottom: '0.25rem'
      }}
    >
      {getStatusIcon(sg.status)} {sg.title}
    </li>
  ))}
</ul>
</div>

        {/* 🥧 Card 2: Subgoal + Tasks */}
<div className="card" style={cardStyle}>
  <img src="/slice.png" alt="Subgoal" width="50" />
  <h3>{selectedSubgoal?.title || 'No Subgoal'}</h3>
  <p>📊 Progress: {getProgress(getSubgoalMicrotasks(selectedSubgoal))}%</p>
  <ul>
  {filteredTasks.map(task => (
    <li
      key={task.id}
      onClick={() => setSelectedTaskId(task.id)}
      style={{
        cursor: 'pointer',
        fontWeight: task.id === selectedTask?.id ? 'bold' : 'normal',
        padding: '0.3rem 0.5rem',
        backgroundColor: task.id === selectedTask?.id ? '#fef0dd' : 'transparent',
        borderRadius: '6px',
        marginBottom: '0.25rem'
      }}
    >
      {getStatusIcon(task.status)} {task.title}
    </li>
  ))}
</ul>
</div>

        {/* 🍞 Card 3: Tasks + Microtasks */}
        <div className="card" style={cardStyle}>
          <img src="/crumbs.png" alt="Task" width="50" />
          <h3>{selectedTask?.title || 'No Task'}</h3>
          <p>📊 Progress: {getProgress(selectedTask?.microtasks || [])}%</p>
          <ul style={{ marginTop: '1rem' }}>
  {microtasks.map(mt => (
    <li key={mt.id}>
      {getStatusIcon(mt.status)} {mt.title}
    </li>
  ))}
</ul>
          <ul style={{ marginTop: '1rem' }}>
            {microtasks.map(mt => (
              <li key={mt.id}>{mt.title}</li>
            ))}
          </ul>
        </div>

      </div>

      {/* 🧭 Goal Selector Below Cards */}
      <div className="goal-selector" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h4>Select Goal:</h4>
        {allGoals.map(goal => (
  <button
    key={goal.id}
    onClick={() => setSelectedGoalId(goal.id)}
    style={{
      margin: '0.25rem',
      padding: '0.4rem 1rem',
      borderRadius: '6px',
      backgroundColor: goal.id === selectedGoalId ? '#bd661d' : '#fff',
      color: goal.id === selectedGoalId ? '#fff' : '#000',
      border: '1px solid #ccc',
      cursor: 'pointer'
    }}
  >
    {getStatusIcon(goal.status)} {goal.title}
  </button>
))}
      </div>
    </div>
  );
};

const cardStyle = {
  width: '300px',
  background: '#fff',
  padding: '1rem',
  borderRadius: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

export default Dashboard;