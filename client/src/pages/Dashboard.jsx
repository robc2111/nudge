// src/pages/Dashboard.jsx
import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import axios from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import GoalCard from '../components/GoalCard';
import SubgoalCard from '../components/SubgoalCard';
import TaskCard from '../components/TaskCard';
import { toast } from 'react-toastify';
import { setSEO, seoPresets } from '../lib/seo';
import { atActiveGoalLimit, isPro as isProPlan } from '../utils/planGuard';

const REQ_TIMEOUT_MS = 12000;

// ---------- LocalStorage helpers ----------
const LS_USER_KEY = 'gc:user';
const LS_DASHBOARD_KEY = (userId) => `gc:dashboard:${userId}`;

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function loadUserCache() {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    return raw ? safeParse(raw) : null;
  } catch {
    return null;
  }
}
function loadDashboardCache(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(LS_DASHBOARD_KEY(userId));
    return raw ? safeParse(raw) : null;
  } catch {
    return null;
  }
}
function saveDashboardCache(userId, payload) {
  if (!userId || !payload) return;
  try {
    localStorage.setItem(
      LS_DASHBOARD_KEY(userId),
      JSON.stringify({ ...payload, __cachedAt: Date.now() })
    );
  } catch {
    // ignore quota errors
  }
}

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'strict', label: 'Strict' },
  { value: 'motivational', label: 'Motivational' },
];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedSubgoalId, setSelectedSubgoalId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedMicrotaskId, setSelectedMicrotaskId] = useState(null);

  const [savingTone, setSavingTone] = useState(false);

  const abortRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setSEO({
      title: 'Dashboard – GoalCrumbs',
      description:
        'See your goals, subgoals, tasks, and microtasks at a glance.',
      url: `${seoPresets.baseUrl}/dashboard`,
      image: '/og/dashboard.png',
      noindex: true,
      type: 'website',
    });
  }, []);

  const getStatusIcon = (status) =>
    ({ todo: '🕒', in_progress: '⚙️', done: '✅' })[status] ?? '❓';

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

  // Prime from cache
  useEffect(() => {
    const cachedUser = loadUserCache();
    if (cachedUser) {
      setMe(cachedUser);
      const cachedDash = loadDashboardCache(cachedUser.id);
      if (cachedDash) {
        setData(cachedDash);
        setCachedAt(cachedDash.__cachedAt || null);
        const goals = cachedDash.goals ?? [];
        const defaultGoal = firstInProgressOrFirst(goals);
        setSelectedGoalId(defaultGoal?.id ?? null);
        setLoading(false);
      }
    }
  }, []);

  // Refresh from network
  const refreshData = useCallback(async () => {
    setError('');
    setLoading(data ? false : true);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await axios.post('/payments/sync-plan').catch(() => {});

      const meRes = await axios.get('/users/me', {
        signal: controller.signal,
        timeout: REQ_TIMEOUT_MS,
      });
      setMe(meRes.data);

      const { data: payload } = await axios.get('/users/me/dashboard', {
        signal: controller.signal,
        timeout: REQ_TIMEOUT_MS,
      });

      setData(payload);
      saveDashboardCache(meRes.data.id, payload);
      setCachedAt(Date.now());

      const goals = payload.goals ?? [];
      let nextGoalId = selectedGoalId;
      if (!nextGoalId || !goals.find((g) => g.id === nextGoalId)) {
        const defaultGoal = firstInProgressOrFirst(goals);
        nextGoalId = defaultGoal?.id ?? null;
      }
      setSelectedGoalId(nextGoalId);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      const msg = !navigator.onLine
        ? 'You appear to be offline.'
        : err.code === 'ECONNABORTED'
          ? 'Request timed out. Please try again.'
          : err.response?.data?.error ||
            err.response?.statusText ||
            err.message ||
            'Failed to load dashboard.';
      setError(data ? `Sync failed — showing cached dashboard. (${msg})` : msg);
      console.error('[Dashboard] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [data, selectedGoalId]);

  useEffect(() => {
    refreshData();
    return () => abortRef.current?.abort();
  }, [refreshData]);

  const goalsList = useMemo(() => data?.goals ?? [], [data]);
  const selectedGoal = useMemo(
    () => goalsList.find((g) => g.id === selectedGoalId) || null,
    [goalsList, selectedGoalId]
  );

  const allSubgoals = useMemo(
    () => selectedGoal?.subgoals ?? [],
    [selectedGoal]
  );
  const effectiveSubgoal =
    allSubgoals.find((sg) => sg.id === selectedSubgoalId) ||
    firstInProgressOrFirst(allSubgoals);

  useEffect(() => {
    if (!effectiveSubgoal) setSelectedSubgoalId(null);
    else if (effectiveSubgoal.id !== selectedSubgoalId)
      setSelectedSubgoalId(effectiveSubgoal.id);
  }, [effectiveSubgoal, selectedSubgoalId]);

  const allTasks = useMemo(
    () => effectiveSubgoal?.tasks ?? [],
    [effectiveSubgoal]
  );
  const effectiveTask =
    allTasks.find((t) => t.id === selectedTaskId) ||
    firstInProgressOrFirst(allTasks);

  useEffect(() => {
    if (!effectiveTask) setSelectedTaskId(null);
    else if (effectiveTask.id !== selectedTaskId)
      setSelectedTaskId(effectiveTask.id);
  }, [effectiveTask, selectedTaskId]);

  const allMicrotasks = useMemo(
    () => effectiveTask?.microtasks ?? [],
    [effectiveTask]
  );
  const selectedMicrotask =
    allMicrotasks.find((mt) => mt.id === selectedMicrotaskId) || null;

  useEffect(() => {
    if (!selectedMicrotask && allMicrotasks.length > 0) {
      const firstPick =
        allMicrotasks.find((m) => m.status === 'in_progress') ||
        allMicrotasks[0];
      setSelectedMicrotaskId(firstPick.id);
    }
    if (allMicrotasks.length === 0) setSelectedMicrotaskId(null);
  }, [allMicrotasks, selectedMicrotask]);

  const handleMicrotaskToggle = async (microtaskId, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'in_progress' : 'done';

    try {
      const { data: resp } = await axios.patch(
        `/microtasks/${microtaskId}/status`,
        { status: nextStatus },
        { timeout: REQ_TIMEOUT_MS }
      );

      if (!resp || !resp.microtasks || !resp.impact) {
        throw new Error(
          'Unexpected response shape from /microtasks/:id/status'
        );
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

      const firstInProg = (arr) =>
        (arr || []).find((x) => x.status === 'in_progress') || null;
      const firstNonDoneMicroId = (mts = []) => {
        const mt =
          mts.find((m) => m.status === 'in_progress') ||
          mts.find((m) => m.status !== 'done');
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
        const goalNow = newData.goals.find(
          (g) => g.id === (patchedGoal?.id || selectedGoalId)
        );
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
        const goalNow = newData.goals.find(
          (g) => g.id === (patchedGoal?.id || selectedGoalId)
        );
        const subNow = goalNow?.subgoals.find(
          (sg) => sg.id === (patchedSubgoal?.id || selectedSubgoalId)
        );
        const tInProg = firstInProg(subNow?.tasks || []);
        nextTaskId = tInProg?.id || null;
        nextMicroId = firstNonDoneMicroId(tInProg?.microtasks || []);
      } else if (patchedTask) {
        nextMicroId =
          resp.impact?.activeMicroId ||
          firstNonDoneMicroId(patchedTask.microtasks);
      }

      setData(newData);
      if (me?.id) saveDashboardCache(me.id, newData);

      if (nextGoalId !== selectedGoalId) setSelectedGoalId(nextGoalId);
      if (nextSubgoalId !== selectedSubgoalId)
        setSelectedSubgoalId(nextSubgoalId);
      if (nextTaskId !== selectedTaskId) setSelectedTaskId(nextTaskId);
      setSelectedMicrotaskId(nextMicroId);

      refreshData();
    } catch (err) {
      console.error(
        '❌ Error updating microtask:',
        err.response?.data?.error || err.message
      );
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
        const patched = { ...prev, goals: updatedGoals };
        if (me?.id) saveDashboardCache(me.id, patched);
        return patched;
      });
    } catch (err) {
      console.error(
        '❌ Failed to delete goal:',
        err.response?.data?.error || err.message
      );
    }
  };

  // ---------- Plan/limits (single source) ----------
  const plan = me?.plan || 'free';
  const planStatus = me?.plan_status || 'inactive';
  const derivedActiveCount =
    data?.goals?.filter((g) => g.status !== 'done').length ?? 0;
  const activeGoalCount =
    typeof me?.activeGoalCount === 'number'
      ? me.activeGoalCount
      : derivedActiveCount;

  const pro = isProPlan(plan, planStatus);
  const atLimit = atActiveGoalLimit(activeGoalCount, plan, planStatus, 1);

  async function saveTone(goalId, tone) {
    if (!goalId || !tone) return;
    setSavingTone(true);
    try {
      await axios.put(
        `/goals/${goalId}`,
        { tone },
        { timeout: REQ_TIMEOUT_MS }
      );
      toast.success('Tone updated');
      setData((prev) => {
        if (!prev) return prev;
        const copy = structuredClone(prev);
        copy.goals = (copy.goals || []).map((g) =>
          g.id === goalId ? { ...g, tone } : g
        );
        if (me?.id) saveDashboardCache(me.id, copy);
        return copy;
      });
    } catch (e) {
      const msg =
        e?.response?.status === 403
          ? 'Tone customization is a Pro feature.'
          : e?.response?.data?.error || 'Failed to update tone';
      toast.error(msg);
    } finally {
      setSavingTone(false);
    }
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-700 font-semibold mb-2">
          Unable to load your dashboard.
        </p>
        <p className="text-sm text-gray-700 mb-4">{error}</p>
        <button className="btn" onClick={refreshData}>
          🔄 Try again
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return <p style={{ padding: '2rem' }}>Loading…</p>;
  }

  if (!goalsList.length) {
    return (
      <div className="dashboard">
        {cachedAt && (
          <p className="text-sm" style={{ marginBottom: 10, color: '#666' }}>
            Last synced:{' '}
            {new Date(cachedAt).toLocaleString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: 'short',
            })}
          </p>
        )}
        <p>You don&apos;t have any goals yet.</p>
        <button
          className="btn"
          disabled={atLimit}
          onClick={() => !atLimit && navigate('/goal-setup')}
          title={atLimit ? 'Upgrade to create more goals' : ''}
        >
          ➕ Create Your First Goal
        </button>
        {atLimit && (
          <p className="auth-error" style={{ marginTop: 8 }}>
            You’re on the Free plan (1 active goal).{' '}
            <Link to="/profile#billing" className="brand-link-dark">
              Upgrade
            </Link>{' '}
            to add more.
          </p>
        )}
      </div>
    );
  }

  const selectedGoalTone = selectedGoal?.tone || 'friendly';

  return (
    <div className="dashboard">
      <div className="dashboard-controls" style={{ gap: '1rem' }}>
        {cachedAt && (
          <div
            className="text-sm"
            style={{ color: '#666', alignSelf: 'center' }}
            aria-live="polite"
          >
            Last synced:{' '}
            {new Date(cachedAt).toLocaleString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: 'short',
            })}
          </div>
        )}

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

        {/* Tone selector (Pro only) */}
        {!!selectedGoal && (
          <div
            className="controls-group"
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <label htmlFor="toneSelect">
              <strong>Coach tone:</strong>
            </label>
            <select
              id="toneSelect"
              className="form-input"
              value={selectedGoalTone}
              onChange={(e) =>
                pro ? saveTone(selectedGoal.id, e.target.value) : null
              }
              disabled={!pro || savingTone}
              title={!pro ? 'Upgrade to Pro to customize tone' : ''}
              style={{ minWidth: 200 }}
            >
              {TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!pro && (
              <Link to="/profile#billing" className="brand-link-dark">
                Upgrade
              </Link>
            )}
          </div>
        )}

        <button
          className={`btn ${atLimit ? 'btn-disabled' : ''}`}
          disabled={atLimit}
          onClick={() => !atLimit && navigate('/goal-setup')}
          title={atLimit ? 'Upgrade to create more goals' : ''}
        >
          ➕ Add New Goal
        </button>
      </div>

      {/* Free-plan banner */}
      {atLimit && (
        <div className="plan-banner">
          <span style={{ fontWeight: 700 }}>Free plan</span> allows 1 active
          goal.{' '}
          <Link
            to="/profile#billing"
            className="brand-link-dark"
            style={{ fontWeight: 700, textDecoration: 'underline' }}
          >
            Upgrade →
          </Link>{' '}
          to add more.
        </div>
      )}

      <div className="dashboard-cards">
        <GoalCard
          goal={selectedGoal}
          onSelect={setSelectedSubgoalId}
          onDelete={handleDelete}
          selectedId={selectedSubgoalId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
          getStatusClass={getStatusClass}
          canDelete={plan !== 'free'}
        />

        <SubgoalCard
          subgoal={effectiveSubgoal}
          tasks={allTasks}
          selectedTaskId={effectiveTask?.id ?? null}
          setSelectedTaskId={setSelectedTaskId}
          getProgress={getProgress}
          getStatusIcon={getStatusIcon}
          getStatusClass={getStatusClass}
        />

        <TaskCard
          task={effectiveTask}
          microtasks={allMicrotasks}
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
