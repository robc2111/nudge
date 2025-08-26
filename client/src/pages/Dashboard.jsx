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

  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedSubgoalId, setSelectedSubgoalId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedMicrotaskId, setSelectedMicrotaskId] = useState(null);

  const abortRef = useRef(null);

  // ---------- helpers ----------
  const getStatusIcon = (status) =>
    ({ todo: '🕒', in_progress: '⚙️', done: '✅' }[status] ?? '❓');

  const getStatusClass = (status) =>
    status === 'done'
      ? 'bg-green-700 text-white'
      : status === 'in_progress'
      ? 'bg-green-100 text-green-900'
      : '';

  const getProgress = (items = []) => {
    const total = items.length;
    const done = items.filter((i) => i.status === 'done').length;
    return total ? Math.round((done / total) * 100) : 0;
  };

  const firstInProgressOrFirst = (arr = []) =>
    arr.find((x) => x.status === 'in_progress') || arr[0] || null;

  // ---------- data fetch ----------
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
      const defaultGoal = firstInProgressOrFirst(goals);
      setSelectedGoalId(defaultGoal?.id ?? null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
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
    return () => abortRef.current?.abort();
  }, [refreshData]);

  // ---------- memoized picks ----------
  const goalsList = useMemo(() => data?.goals ?? [], [data]);

  const selectedGoal = useMemo(
    () => goalsList.find((g) => g.id === selectedGoalId) || null,
    [goalsList, selectedGoalId]
  );

  const allSubgoals = useMemo(() => selectedGoal?.subgoals ?? [], [selectedGoal]);
  const effectiveSubgoal =
    allSubgoals.find((sg) => sg.id === selectedSubgoalId) ||
    firstInProgressOrFirst(allSubgoals);

  useEffect(() => {
    if (!effectiveSubgoal) setSelectedSubgoalId(null);
    else if (effectiveSubgoal.id !== selectedSubgoalId)
      setSelectedSubgoalId(effectiveSubgoal.id);
  }, [effectiveSubgoal, selectedSubgoalId]);

  const allTasks = useMemo(() => effectiveSubgoal?.tasks ?? [], [effectiveSubgoal]);
  const effectiveTask =
    allTasks.find((t) => t.id === selectedTaskId) || firstInProgressOrFirst(allTasks);

  useEffect(() => {
    if (!effectiveTask) setSelectedTaskId(null);
    else if (effectiveTask.id !== selectedTaskId) setSelectedTaskId(effectiveTask.id);
  }, [effectiveTask, selectedTaskId]);

  const allMicrotasks = useMemo(() => effectiveTask?.microtasks ?? [], [effectiveTask]);
  const selectedMicrotask =
    allMicrotasks.find((mt) => mt.id === selectedMicrotaskId) || null;

  useEffect(() => {
    if (!selectedMicrotask && allMicrotasks.length > 0) {
      // prefer in_progress micro, else first
      const firstPick =
        allMicrotasks.find((m) => m.status === 'in_progress') || allMicrotasks[0];
      setSelectedMicrotaskId(firstPick.id);
    }
    if (allMicrotasks.length === 0) setSelectedMicrotaskId(null);
  }, [allMicrotasks, selectedMicrotask]);

  // ---------- actions ----------
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

      let patchedGoal = null;
      let patchedSubgoal = null;
      let patchedTask = null;

      newData.goals = (newData.goals || []).map((g) => {
        if (g.id !== impact.goal.id) return g;
        patchedGoal = {
          ...g,
          status: impact.goal.status,
          subgoals: (g.subgoals || []).map((sg) => {
            if (sg.id !== impact.subgoal.id) return sg;
            const updatedSg = {
              ...sg,
              status: impact.subgoal.status,
              tasks: (sg.tasks || []).map((t) => {
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

      // keep selection sensible after toggles
      const firstInProg = (arr) => (arr || []).find((x) => x.status === 'in_progress') || null;
      const firstNonDoneMicroId = (mts = []) => {
        const mt =
          mts.find((m) => m.status === 'in_progress') || mts.find((m) => m.status !== 'done');
        return mt?.id || null;
      };

      let nextGoalId = selectedGoalId;
      let nextSubgoalId = selectedSubgoalId;
      let nextTaskId = selectedTaskId;
      let nextMicroId = selectedMicrotaskId;

      if (patchedGoal && patchedGoal.status === 'done') {
        const gInProg = firstInProg(newData.goals);
        nextGoalId = gInProg ? gInProg.id : newData.goals[0]?.id || null;
        nextSubgoalId = null;
        nextTaskId = null;
        nextMicroId = null;
      }

      if (patchedSubgoal && patchedSubgoal.status === 'done') {
        const goalNow = newData.goals.find((g) => g.id === (patchedGoal?.id || selectedGoalId));
        const sgInProg = firstInProg(goalNow?.subgoals || []);
        if (sgInProg) {
          nextSubgoalId = sgInProg.id;
          const tInProg = firstInProg(sgInProg.tasks || []);
          nextTaskId = tInProg?.id || null;
          nextMicroId = firstNonDoneMicroId(tInProg?.microtasks || []);
        } else {
          nextTaskId = null;
          nextMicroId = null;
        }
      }

      if (patchedTask && patchedTask.status === 'done') {
        const goalNow = newData.goals.find((g) => g.id === (patchedGoal?.id || selectedGoalId));
        const subNow = goalNow?.subgoals.find(
          (sg) => sg.id === (patchedSubgoal?.id || selectedSubgoalId)
        );
        const tInProg = firstInProg(subNow?.tasks || []);
        nextTaskId = tInProg?.id || null;
        nextMicroId = firstNonDoneMicroId(tInProg?.microtasks || []);
      } else if (patchedTask) {
        nextMicroId = resp.impact?.activeMicroId || firstNonDoneMicroId(patchedTask.microtasks);
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

  const handleDelete = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await axios.delete(`/goals/${goalId}`, { timeout: REQ_TIMEOUT_MS });
      setData((prev) => {
        if (!prev) return prev;
        const updatedGoals = prev.goals.filter((g) => g.id !== goalId);
        const nextGoal = firstInProgressOrFirst(updatedGoals);
        setSelectedGoalId(nextGoal?.id ?? null);
        return { ...prev, goals: updatedGoals };
      });
    } catch (err) {
      console.error('❌ Failed to delete goal:', err.response?.data?.error || err.message);
    }
  };

  // ---------- render ----------
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-700 font-semibold mb-2">Unable to load your dashboard.</p>
        <p className="text-sm text-gray-700 mb-4">{error}</p>
        <button className="btn" onClick={refreshData}>
          🔄 Try again
        </button>
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
        <Link to="/goal-setup" className="btn">
          ➕ Create Your First Goal
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-controls">
        {/* Goal selector */}
        <div className="controls-group">
          <label htmlFor="goalSelect">
            <strong>Goal:</strong>
          </label>
          <select
            id="goalSelect"
            className="form-input"
            value={selectedGoalId ?? ''}
            onChange={(evt) => setSelectedGoalId(evt.target.value)}
          >
            {goalsList.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {getStatusIcon(goal.status)} {goal.title}
              </option>
            ))}
          </select>
        </div>

        <Link to="/goal-setup" className="btn">
          ➕ Add New Goal
        </Link>
      </div>

      <div className="dashboard-cards">
        <GoalCard
          goal={selectedGoal}               // ✅ all subgoals (no filtering)
          onSelect={setSelectedSubgoalId}
          onDelete={handleDelete}
          selectedId={selectedSubgoalId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
          getStatusClass={getStatusClass}
        />

        <SubgoalCard
          subgoal={effectiveSubgoal}
          tasks={allTasks}                  // ✅ all tasks
          selectedTaskId={effectiveTask?.id ?? null}
          setSelectedTaskId={setSelectedTaskId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
          getStatusClass={getStatusClass}
        />

        <TaskCard
          task={effectiveTask}
          microtasks={allMicrotasks}        // ✅ all microtasks
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