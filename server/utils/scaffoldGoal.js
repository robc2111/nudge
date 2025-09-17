// server/utils/scaffoldGoal.js

/**
 * Minimal, safe DB-backed breakdown to seed a goal when AI couldn't provide one.
 * Creates:
 *   Subgoal:  "Week 1: Kickoff"   (in_progress)
 *   Task:     "Set your plan..."  (in_progress)
 *   Microtasks: three TODO items
 *
 * @param {import('pg').Pool} pool
 * @param {string} goalId
 * @returns {Promise<{ subgoalId: string, taskId: string }>}
 */
async function scaffoldGoal(pool, goalId) {
  const subTitle = 'Week 1: Kickoff';
  const taskTitle = 'Set your plan and first steps';
  const microtitles = [
    'Write your success definition for this goal',
    'List 3 concrete actions for this week',
    'Schedule the first action in your calendar',
  ];

  const { rows: subRows } = await pool.query(
    `INSERT INTO subgoals (goal_id, title, status, position)
     VALUES ($1, $2, 'in_progress', 1) RETURNING id`,
    [goalId, subTitle]
  );
  const subgoalId = subRows[0].id;

  const { rows: taskRows } = await pool.query(
    `INSERT INTO tasks (subgoal_id, title, status, position)
     VALUES ($1, $2, 'in_progress', 1) RETURNING id`,
    [subgoalId, taskTitle]
  );
  const taskId = taskRows[0].id;

  let pos = 1;
  for (const mtTitle of microtitles) {
    await pool.query(
      `INSERT INTO microtasks (task_id, title, status, position)
       VALUES ($1, $2, 'todo', $3)`,
      [taskId, mtTitle, pos++]
    );
  }

  return { subgoalId, taskId };
}

module.exports = { scaffoldGoal };
