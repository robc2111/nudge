//Dashboard.jsx
import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';
import GoalCard from '../components/GoalCard';
import SubgoalCard from '../components/SubgoalCard';
import TaskCard from '../components/TaskCard';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedSubgoalId, setSelectedSubgoalId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedMicrotaskId, setSelectedMicrotaskId] = useState(null);

  const allGoals = data?.goals || [];
  const selectedGoal = allGoals.find(g => g.id === selectedGoalId);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    axios.get('/users/me')
      .then(userRes => axios.get(`/users/${userRes.data.id}/dashboard`))
      .then(res => {
        setData(res.data);
        const goals = res.data.goals || [];
        const defaultGoal = goals.find(g => g.status === 'in_progress') || goals[0];
        setSelectedGoalId(defaultGoal?.id || null);
      })
      .catch(err => console.error('Dashboard error:', err));
  };

  useEffect(() => setSelectedSubgoalId(null), [selectedGoalId]);
  useEffect(() => setSelectedTaskId(null), [selectedSubgoalId]);
  useEffect(() => setSelectedMicrotaskId(null), [selectedTaskId]);

  if (!data) return <p>Loading...</p>;

  if (!allGoals.length) {
    return (
      <div className="dashboard">
        <p>You don't have any goals yet.</p>
        <Link to="/goal-setup" className="cta-button">➕ Create Your First Goal</Link>
      </div>
    );
  }

  const subgoals = selectedGoal?.subgoals || [];
  const filteredSubgoals = statusFilter === 'all' ? subgoals : subgoals.filter(sg => sg.status === statusFilter);
  const selectedSubgoal = filteredSubgoals.find(sg => sg.id === selectedSubgoalId) || filteredSubgoals[0];
  const tasks = selectedSubgoal?.tasks || [];
  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  const selectedTask = filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0];
  const microtasks = selectedTask?.microtasks || [];
  const selectedMicrotask = microtasks.find(mt => String(mt.id) === String(selectedMicrotaskId));

  const getStatusIcon = (status) => {
    switch (status) {
      case 'todo': return '🕒';
      case 'in_progress': return '⚙️';
      case 'done': return '✅';
      default: return '❓';
    }
  };

  const getProgress = (items = []) => {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  const handleMicrotaskToggle = async (microtaskId, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'in_progress' : 'done';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/microtasks/${microtaskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Failed to update microtask');
      const updated = await res.json();

      setData(prev => {
        const newData = { ...prev };
        for (const goal of newData.goals) {
          for (const subgoal of goal.subgoals) {
            for (const task of subgoal.tasks) {
              const microtask = task.microtasks.find(m => m.id === microtaskId);
              if (microtask) microtask.status = updated.status;
            }
          }
        }
        return newData;
      });
    } catch (err) {
      console.error('❌ Error updating microtask:', err.message);
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Delete failed");

      setData(prev => {
        const updatedGoals = prev.goals.filter(g => g.id !== goalId);
        const nextGoal = updatedGoals.find(g => g.status === 'in_progress') || updatedGoals[0] || null;
        setSelectedGoalId(nextGoal?.id || null);
        return { ...prev, goals: updatedGoals };
      });
    } catch (err) {
      console.error("❌ Failed to delete goal:", err.message);
    }
  };

  return (
    <div className="dashboard">
      {/* ✅ Styled control bar */}
      <div className="dashboard-controls">
  <div className="controls-group">
    <label><strong>Goal:</strong></label>
    <select value={selectedGoalId || ''} onChange={e => setSelectedGoalId(e.target.value)}>
      {allGoals.map(goal => (
        <option key={goal.id} value={goal.id}>
          {getStatusIcon(goal.status)} {goal.title}
        </option>
      ))}
    </select>
  </div>

  <div className="controls-group filter-group">
    <label><strong>Filter:</strong></label>
    <div className="filter-buttons">
      {['todo', 'in_progress', 'done', 'all'].map(status => (
        <button
          key={status}
          className={`filter-btn ${status === statusFilter ? 'active' : ''}`}
          onClick={() => setStatusFilter(status)}
        >
          {{
            todo: 'To-do',
            in_progress: 'In Progress',
            done: 'Done',
            all: 'All'
          }[status]}
        </button>
      ))}
    </div>
  </div>

  <Link to="/goal-setup" className="add-goal-btn">
    ➕ Add New Goal
  </Link>
</div>

      <div className="dashboard-cards">
        <GoalCard
          goal={selectedGoal}
          onSelect={setSelectedSubgoalId}
          onDelete={handleDelete}
          selectedId={selectedSubgoalId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
          refreshDashboard={refreshData}
        />

        <SubgoalCard
          subgoal={selectedSubgoal}
          tasks={filteredTasks}
          selectedTaskId={selectedTask?.id}
          setSelectedTaskId={setSelectedTaskId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
        />

        <TaskCard
          task={selectedTask}
          microtasks={microtasks}
          selectedMicrotaskId={selectedMicrotaskId}
          setSelectedMicrotaskId={setSelectedMicrotaskId}
          selectedMicrotask={selectedMicrotask}
          handleMicrotaskToggle={handleMicrotaskToggle}
          getStatusIcon={getStatusIcon}
          getProgress={getProgress}
          refreshData={refreshData}
        />
      </div>
    </div>
  );
};

export default Dashboard;