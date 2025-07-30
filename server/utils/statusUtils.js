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

      const doneMicros = task.microtasks.filter(m => m.status === 'done').length;
      const totalMicros = task.microtasks.length;

      if (doneMicros === totalMicros) {
        task.status = 'done';
      } else if (!hasSetInProgressTask) {
        task.status = 'in_progress';
        hasSetInProgressTask = true;
      } else {
        task.status = 'todo';
      }
    }

    const doneTasks = subgoal.tasks.filter(t => t.status === 'done').length;
    const totalTasks = subgoal.tasks.length;

    if (doneTasks === totalTasks) {
      subgoal.status = 'done';
    } else if (!hasSetInProgressSubgoal) {
      subgoal.status = 'in_progress';
      hasSetInProgressSubgoal = true;
    } else {
      subgoal.status = 'todo';
    }
  }

  const doneSubs = goal.subgoals.filter(sg => sg.status === 'done').length;
  const totalSubs = goal.subgoals.length;

  if (doneSubs === totalSubs) {
    goal.status = 'done';
  } else if (hasSetInProgressSubgoal) {
    goal.status = 'in_progress';
  } else {
    goal.status = 'todo';
  }

  return goal;
}

module.exports = { assignStatuses };