// utils/goalUtils.js
const pool = require('../db');

async function getGoalData(goalId) {
  const goalRes = await pool.query('SELECT * FROM goals WHERE id = $1', [goalId]);
  const goal = goalRes.rows[0];
  if (!goal) throw new Error('Goal not found');

  const subgoalsRes = await pool.query(
    `SELECT * FROM subgoals WHERE goal_id = $1 ORDER BY position ASC, id ASC`,
    [goalId]
  );

  const subgoals = [];
  for (const sg of subgoalsRes.rows) {
    const tasksRes = await pool.query(
      `SELECT * FROM tasks WHERE subgoal_id = $1 ORDER BY position ASC, id ASC`,
      [sg.id]
    );

    const tasks = [];
    for (const t of tasksRes.rows) {
      const microtasksRes = await pool.query(
        `SELECT * FROM microtasks WHERE task_id = $1 ORDER BY position ASC, id ASC`,
        [t.id]
      );

      tasks.push({
        ...t,
        microtasks: microtasksRes.rows,
      });
    }

    subgoals.push({ ...sg, tasks });
  }

  return { goal, subgoals };
}

function extractDoneItems(goalData) {
  const summary = [];

  for (const sg of goalData.subgoals) {
    const doneTasks = (sg.tasks || []).filter(t =>
      (t.microtasks || []).length > 0 &&
      t.microtasks.every(m => m.status === 'done')
    );

    if (doneTasks.length > 0) {
      summary.push({
        subgoal: sg.title,
        tasks: doneTasks.map(t => t.title),
      });
    }
  }

  return summary;
}

function generatePrompt(description, doneItems) {
  let context = 'The user has already completed the following:\n';

  for (const item of doneItems) {
    context += `\n- Subgoal: ${item.subgoal}`;
    for (const task of item.tasks) {
      context += `\n  - Task: ${task}`;
    }
  }

  return `
${context}

Now regenerate the remaining structure for the goal based on the updated description:
"${description}"

Return only JSON:
{
  "subgoals": [
    {
      "title": "",
      "tasks": [
        {
          "title": "",
          "microtasks": ["", ""]
        }
      ]
    }
  ]
}`;
}

module.exports = {
  getGoalData,
  extractDoneItems,
  generatePrompt,
};