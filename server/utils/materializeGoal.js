// server/utils/materializeGoal.js
/**
 * Materialize a goal hierarchy in one place.
 * Accepts either:
 *   - breakdown: [{ title, tasks:[{ title, microtasks:[string] }] }]
 *   - subgoals:  [{ title, tasks:[{ title, microtasks:[string] }] }]
 * Positions start at 1. Status defaults are set explicitly for safety.
 */
async function materializeFromBreakdown(client, { userId, goalId, breakdown }) {
  for (const [sgIdx, sg] of (breakdown || []).entries()) {
    const { rows: sgRows } = await client.query(
      `INSERT INTO subgoals (user_id, goal_id, title, position, status)
       VALUES ($1,$2,$3,$4,'in_progress')
       RETURNING id`,
      [userId, goalId, String(sg.title || 'Subgoal'), sgIdx + 1]
    );
    const subgoalId = sgRows[0].id;

    for (const [tIdx, t] of (sg.tasks || []).entries()) {
      const { rows: tRows } = await client.query(
        `INSERT INTO tasks (user_id, subgoal_id, title, position, status)
         VALUES ($1,$2,$3,$4,'in_progress')
         RETURNING id`,
        [userId, subgoalId, String(t.title || 'Task'), tIdx + 1]
      );
      const taskId = tRows[0].id;

      for (const [mIdx, mt] of (t.microtasks || []).entries()) {
        await client.query(
          `INSERT INTO microtasks (user_id, task_id, title, position, status)
           VALUES ($1,$2,$3,$4,'todo')`,
          [userId, taskId, String(mt || 'Microtask'), mIdx + 1]
        );
      }
    }
  }
}

/** Minimal, safe scaffold if no breakdown was provided */
async function scaffoldGoal(client, { userId, goalId }) {
  const subTitle = 'Week 1: Kickoff';
  const taskTitle = 'Set your plan and first steps';
  const microtitles = [
    'Write your success definition for this goal',
    'List 3 concrete actions for this week',
    'Schedule the first action in your calendar',
  ];

  const { rows: subRows } = await client.query(
    `INSERT INTO subgoals (user_id, goal_id, title, position, status)
     VALUES ($1,$2,$3,1,'in_progress') RETURNING id`,
    [userId, goalId, subTitle]
  );
  const subgoalId = subRows[0].id;

  const { rows: taskRows } = await client.query(
    `INSERT INTO tasks (user_id, subgoal_id, title, position, status)
     VALUES ($1,$2,$3,1,'in_progress') RETURNING id`,
    [userId, subgoalId, taskTitle]
  );
  const taskId = taskRows[0].id;

  for (const [i, mtTitle] of microtitles.entries()) {
    await client.query(
      `INSERT INTO microtasks (user_id, task_id, title, position, status)
       VALUES ($1,$2,$3,$4,'todo')`,
      [userId, taskId, mtTitle, i + 1]
    );
  }
}

/**
 * Public entry: figures out which payload is present and inserts rows.
 * If neither present or arrays are empty, creates a scaffold.
 */
async function materializeGoal(
  client,
  { userId, goalId, breakdown, subgoals }
) {
  const candidate =
    Array.isArray(breakdown) && breakdown.length
      ? breakdown
      : Array.isArray(subgoals) && subgoals.length
        ? subgoals
        : null;

  if (candidate) {
    await materializeFromBreakdown(client, {
      userId,
      goalId,
      breakdown: candidate,
    });
  } else {
    await scaffoldGoal(client, { userId, goalId });
  }
}

module.exports = { materializeGoal, scaffoldGoal };
