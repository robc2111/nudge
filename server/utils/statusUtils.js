// utils/statusUtils.js
function assignStatuses(goal) {
  let hasSetInProgressSubgoal = false;

  for (const subgoal of goal.subgoals) {
    let hasSetInProgressTask = false;

    for (const task of subgoal.tasks) {
      let hasSetInProgressMicro = false;

      for (const micro of task.microtasks) {
        if (micro.status === 'done') continue;

        if (!hasSetInProgressMicro) {
          micro.status = 'in_progress';
          hasSetInProgressMicro = true;
        } else {
          micro.status = 'todo';
        }
      }

      const totalMicros = task.microtasks.length;
      const doneMicros = task.microtasks.filter(m => m.status === 'done').length;

      if (totalMicros > 0 && doneMicros === totalMicros) {
        task.status = 'done';
      } else if (!hasSetInProgressTask) {
        task.status = 'in_progress';
        hasSetInProgressTask = true;
      } else {
        task.status = 'todo';
      }
    }

    const totalTasks = subgoal.tasks.length;
    const doneTasks = subgoal.tasks.filter(t => t.status === 'done').length;

    if (totalTasks > 0 && doneTasks === totalTasks) {
      subgoal.status = 'done';
    } else if (!hasSetInProgressSubgoal) {
      subgoal.status = 'in_progress';
      hasSetInProgressSubgoal = true;
    } else {
      subgoal.status = 'todo';
    }
  }

  const totalSubs = goal.subgoals.length;
  const doneSubs = goal.subgoals.filter(sg => sg.status === 'done').length;

  if (totalSubs > 0 && doneSubs === totalSubs) {
    goal.status = 'done';
  } else if (hasSetInProgressSubgoal) {
    goal.status = 'in_progress';
  } else {
    goal.status = 'todo';
  }

  return goal;
}

module.exports = { assignStatuses };