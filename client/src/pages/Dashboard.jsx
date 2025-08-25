// src/pages/Dashboard.jsx
import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';
import GoalCard from '../components/GoalCard';
import SubgoalCard from '../components/SubgoalCard';
import TaskCard from '../components/TaskCard';

const REQ_TIMEOUT_MS = 12000;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedSubgoalId, setSelectedSubgoalId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedMicrotaskId, setSelectedMicrotaskId] = useState(null);

  const abortRef = useRef(null);

  const goalsList = useMemo(() => data?.goals ?? [], [data]);

  const selectedGoal = useMemo(
    () => goalsList.find(g => g.id === selectedGoalId) || null,
    [goalsList, selectedGoalId]
  );

  const refreshData = useCallback(async () => {
    setError('');
    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const me = await axios.get('/users/me', {
        signal: controller.signal,
        timeout: REQ_TIMEOUT_MS,
      });

      let payload;
      try {
        const res = await axios.get(`/users/${me.data.id}/dashboard`, {
          signal: controller.signal,
          timeout: REQ_TIMEOUT_MS,
        });
        payload = res.data ?? {};
      } catch {
        const res2 = await axios.get('/dashboard', {
          signal: controller.signal,
          timeout: REQ_TIMEOUT_MS,
        });
        payload = res2.data ?? {};
      }

      setData(payload);

      const goals = payload.goals ?? [];
      const defaultGoal = goals.find(g => g.status === 'in_progress') || goals[0] || null;
      setSelectedGoalId(defaultGoal?.id ?? null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return;
      }
      const msg =
        !navigator.onLine
          ? 'You appear to be offline.'
          : err.code === 'ECONNABORTED'
          ? 'Request timed out. Please try again.'
          : err.response?.data?.error ||
            err.response?.statusText ||
            err.message ||
            'Failed to load dashboard.';
      setError(msg);
      console.error('[Dashboard] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [refreshData]);

  // ---------- Filtering helpers ----------
  const filterByStatus = (arr = [], status) =>
    status === 'all' ? arr : arr.filter(x => x.status === status);

  // ---------- Derived lists (SUBGOALS) ----------
  const allSubgoals = useMemo(() => selectedGoal?.subgoals ?? [], [selectedGoal]);

  const filteredSubgoals = useMemo(
    () => filterByStatus(allSubgoals, statusFilter),
    [allSubgoals, statusFilter]
  );

  const effectiveSubgoal =
    filteredSubgoals.find(sg => sg.id === selectedSubgoalId) || filteredSubgoals[0] || null;

  useEffect(() => {
    if (!effectiveSubgoal) setSelectedSubgoalId(null);
    else if (effectiveSubgoal.id !== selectedSubgoalId) setSelectedSubgoalId(effectiveSubgoal.id);
  }, [effectiveSubgoal, selectedSubgoalId]);

  // ---------- Derived lists (TASKS) ----------
  const allTasks = useMemo(() => effectiveSubgoal?.tasks ?? [], [effectiveSubgoal]);

  const filteredTasks = useMemo(
    () => filterByStatus(allTasks, statusFilter),
    [allTasks, statusFilter]
  );

  const effectiveTask =
    filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0] || null;

  useEffect(() => {
    if (!effectiveTask) setSelectedTaskId(null);
    else if (effectiveTask.id !== selectedTaskId) setSelectedTaskId(effectiveTask.id);
  }, [effectiveTask, selectedTaskId]);

  // ---------- Derived lists (MICROTASKS) ----------
  const allMicrotasks = useMemo(() => effectiveTask?.microtasks ?? [], [effectiveTask]);

  const filteredMicrotasks = useMemo(
    () => filterByStatus(allMicrotasks, statusFilter),
    [allMicrotasks, statusFilter]
  );

  const selectedMicrotask =
    filteredMicrotasks.find(mt => mt.id === selectedMicrotaskId) || null;

  useEffect(() => {
    if (!selectedMicrotask && filteredMicrotasks.length > 0) {
      setSelectedMicrotaskId(filteredMicrotasks[0].id);
    }
    if (filteredMicrotasks.length === 0) {
      setSelectedMicrotaskId(null);
    }
  }, [filteredMicrotasks, selectedMicrotask]);

  // ---------- Helpers ----------
  const getStatusIcon = status =>
    ({ todo: '🕒', in_progress: '⚙️', done: '✅' }[status] ?? '❓');

  const getStatusClass = status =>
    status === 'done'
      ? 'bg-green-700 text-white'
      : status === 'in_progress'
      ? 'bg-green-100 text-green-900'
      : '';

  const getProgress = (items = []) => {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    return total ? Math.round((done / total) * 100) : 0;
    };

  // ---------- Actions ----------
  const handleMicrotaskToggle = async (microtaskId, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'in_progress' : 'done';

    try {
      const { data: resp } = await axios.patch(
        `/microtasks/${microtaskId}/status`,
        { status: nextStatus },
        { timeout: REQ_TIMEOUT_MS }
      );

      if (!resp || !resp.microtasks || !resp.impact) {
        throw new Error('Unexpected response shape from /microtasks/:id/status');
      }

      const { microtasks: freshMicros, impact } = resp;

      const newData = structuredClone(data ?? { goals: [] });

      let patchedGoal = null,
        patchedSubgoal = null,
        patchedTask = null;

      newData.goals = (newData.goals || []).map(g => {
        if (g.id !== impact.goal.id) return g;
        patchedGoal = {
          ...g,
          status: impact.goal.status,
          subgoals: (g.subgoals || []).map(sg => {
            if (sg.id !== impact.subgoal.id) return sg;
            const updatedSg = {
              ...sg,
              status: impact.subgoal.status,
              tasks: (sg.tasks || []).map(t => {
                if (t.id !== impact.task.id) return t;
                const updatedT = {
                  ...t,
                  status: impact.task.status,
                  microtasks: freshMicros,
                };
                patchedTask = updatedT;
                return updatedT;
              }),
            };
            patchedSubgoal = updatedSg;
            return updatedSg;
          }),
        };
        return patchedGoal;
      });

      const firstInProgress = arr => (arr || []).find(x => x.status === 'in_progress') || null;
      const firstNonDoneMicroId = (mts = []) => {
        const mt = mts.find(m => m.status === 'in_progress') || mts.find(m => m.status !== 'done');
        return mt?.id || null;
      };

      let nextGoalId = selectedGoalId;
      let nextSubgoalId = selectedSubgoalId;
      let nextTaskId = selectedTaskId;
      let nextMicroId = selectedMicrotaskId;

      if (patchedGoal && patchedGoal.status === 'done') {
        const gInProg = firstInProgress(newData.goals);
        nextGoalId = gInProg ? gInProg.id : newData.goals[0]?.id || null;
        nextSubgoalId = null;
        nextTaskId = null;
        nextMicroId = null;
      }

      if (patchedSubgoal && patchedSubgoal.status === 'done') {
        const goalNow = newData.goals.find(g => g.id === (patchedGoal?.id || selectedGoalId));
        const sgInProg = firstInProgress(goalNow?.subgoals || []);
        if (sgInProg) {
          nextSubgoalId = sgInProg.id;
          const tInProg = firstInProgress(sgInProg.tasks || []);
          nextTaskId = tInProg?.id || null;
          nextMicroId = firstNonDoneMicroId(tInProg?.microtasks || []);
        } else {
          nextTaskId = null;
          nextMicroId = null;
        }
      }

      if (patchedTask && patchedTask.status === 'done') {
        const goalNow = newData.goals.find(g => g.id === (patchedGoal?.id || selectedGoalId));
        const subNow = goalNow?.subgoals.find(sg => sg.id === (patchedSubgoal?.id || selectedSubgoalId));
        const tInProg = firstInProgress(subNow?.tasks || []);
        nextTaskId = tInProg?.id || null;
        nextMicroId = firstNonDoneMicroId(tInProg?.microtasks || []);
      } else if (patchedTask) {
        if (resp.impact?.activeMicroId) {
          nextMicroId = resp.impact.activeMicroId;
        } else {
          nextMicroId = firstNonDoneMicroId(patchedTask.microtasks || []);
        }
      }

      setData(newData);
      if (nextGoalId !== selectedGoalId) setSelectedGoalId(nextGoalId);
      if (nextSubgoalId !== selectedSubgoalId) setSelectedSubgoalId(nextSubgoalId);
      if (nextTaskId !== selectedTaskId) setSelectedTaskId(nextTaskId);
      setSelectedMicrotaskId(nextMicroId);

      refreshData();
    } catch (err) {
      console.error('❌ Error updating microtask:', err.response?.data?.error || err.message);
      refreshData();
    }
  };

  const handleDelete = async goalId => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await axios.delete(`/goals/${goalId}`, { timeout: REQ_TIMEOUT_MS });
      setData(prev => {
        if (!prev) return prev;
        const updatedGoals = prev.goals.filter(g => g.id !== goalId);
        const nextGoal =
          updatedGoals.find(g => g.status === 'in_progress') || updatedGoals[0] || null;
        setSelectedGoalId(nextGoal?.id ?? null);
        return { ...prev, goals: updatedGoals };
      });
    } catch (err) {
      console.error('❌ Failed to delete goal:', err.response?.data?.error || err.message);
    }
  };

  // ---------- Render ----------
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-700 font-semibold mb-2">Unable to load your dashboard.</p>
        <p className="text-sm text-gray-700 mb-4">{error}</p>
        <button className="btn" onClick={refreshData}>🔄 Try again</button>
      </div>
    );
  }

  if (loading || !data) {
    return <p style={{ padding: '2rem' }}>Loading…</p>;
  }

  if (!goalsList.length) {
    return (
      <div className="dashboard">
        <p>You don't have any goals yet.</p>
        <Link to="/goal-setup" className="btn">➕ Create Your First Goal</Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-controls">
        {/* Goal selector */}
        <div className="controls-group">
          <label htmlFor="goalSelect"><strong>Goal:</strong></label>
          <select
            id="goalSelect"
            className="form-input"
            value={selectedGoalId ?? ''}
            onChange={(evt) => setSelectedGoalId(evt.target.value)}
          >
            {goalsList.map(goal => (
              <option key={goal.id} value={goal.id}>
                {getStatusIcon(goal.status)} {goal.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="controls-group filter-group" role="group" aria-label="Status filter">
          <div className="filter-buttons">
            {['todo', 'in_progress', 'done', 'all'].map(status => (
              <button
                key={status}
                className={`filter-btn ${status === statusFilter ? 'active' : ''}`}
                aria-pressed={status === statusFilter}
                onClick={() => setStatusFilter(status)}
              >
                {{
                  todo: 'To-do',
                  in_progress: 'In Progress',
                  done: 'Done',
                  all: 'All',
                }[status]}
              </button>
            ))}
          </div>
        </div>

        <Link to="/goal-setup" className="btn">➕ Add New Goal</Link>
      </div>

      <div className="dashboard-cards">
        <GoalCard
  goal={{ ...selectedGoal, subgoals: filteredSubgoals }} // ← use filtered list here
  onSelect={setSelectedSubgoalId}
  onDelete={handleDelete}
  selectedId={selectedSubgoalId}
  getProgress={getProgress}
  getStatusIcon={getStatusIcon}
  getStatusClass={getStatusClass}
  refreshDashboard={refreshData}
/>

        <SubgoalCard
          subgoal={effectiveSubgoal}
          tasks={filteredTasks}
          selectedTaskId={effectiveTask?.id ?? null}
          setSelectedTaskId={setSelectedTaskId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
          getStatusClass={getStatusClass}
        />

        <TaskCard
          task={effectiveTask}
          microtasks={filteredMicrotasks}
          selectedMicrotaskId={selectedMicrotaskId}
          setSelectedMicrotaskId={setSelectedMicrotaskId}
          selectedMicrotask={selectedMicrotask}
          handleMicrotaskToggle={handleMicrotaskToggle}
          getStatusIcon={getStatusIcon}
          getStatusClass={getStatusClass}
          getProgress={getProgress}
          refreshData={refreshData}
        />
      </div>
    </div>
  );
};

export default Dashboard;