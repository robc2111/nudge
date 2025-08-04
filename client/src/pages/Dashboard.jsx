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

  // Derived state
  const allGoals = data?.goals || [];
  const selectedGoal = allGoals.find(g => g.id === selectedGoalId);
  const subgoals = selectedGoal?.subgoals || [];
  const filteredSubgoals = statusFilter === 'all' ? subgoals : subgoals.filter(sg => sg.status === statusFilter);
  const selectedSubgoal = filteredSubgoals.find(sg => sg.id === selectedSubgoalId) || filteredSubgoals[0];
  const tasks = selectedSubgoal?.tasks || [];
  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  const selectedTask = filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0];
  const microtasks = selectedTask?.microtasks || [];
  const selectedMicrotask = microtasks.find(mt => mt.id === selectedMicrotaskId);

  // 1. Fetch data and set default goal
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

  // 2. Reset selectedSubgoal when goal changes
  useEffect(() => {
    setSelectedSubgoalId(null);
  }, [selectedGoalId]);

  // 3. Reset selectedTask when subgoal changes
  useEffect(() => {
    const task = filteredTasks.find(t => t.status === 'in_progress') || filteredTasks[0] || null;
    setSelectedTaskId(task?.id || null);
  }, [filteredTasks]);

  // 4. Reset selectedMicrotask when task changes
  useEffect(() => {
    setSelectedMicrotaskId(null);
  }, [selectedTaskId]);

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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error('Failed to update microtask');

      const updated = await res.json();

      // Update the local state to reflect the change
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
    const confirmed = window.confirm("Are you sure you want to delete this goal?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${import.meta.env.VITE_API_URL}/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Delete failed");

      // Update local state and select next goal
      setData((prev) => {
        const updatedGoals = prev.goals.filter((g) => g.id !== goalId);
        const nextGoal = updatedGoals.find(g => g.status === 'in_progress') || updatedGoals[0] || null;
        setSelectedGoalId(nextGoal?.id || null);
        return {
          ...prev,
          goals: updatedGoals,
        };
      });

    } catch (err) {
      console.error("❌ Failed to delete goal:", err.message);
    }
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

        <Link
          to="/goal-setup"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
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