// aiController.js
// controllers/aiController.js
const { getGoalData, extractDoneItems } = require('../utils/goalUtils');
const { OpenAI } = require('openai');
const pool = require('../db');
const editGoalPrompt = require('../prompts/editGoal'); // ✅ import

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callGPT(prompt) {
  const res = await openai.chat.completions.create({
    model: editGoalPrompt.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: editGoalPrompt.temperature
  });

  return JSON.parse(res.choices[0].message.content);
}

const regenerateBreakdown = async (req, res) => {
  try {
    const goalId = req.params.id;
    const { description } = req.body;

    const goalData = await getGoalData(goalId);
    const doneItems = extractDoneItems(goalData);
    const prompt = editGoalPrompt.prompt(description, doneItems); // ✅ use prompt function

    console.log("🧠 Prompt to GPT:\n", prompt);

    const aiResponse = await callGPT(prompt);

    // (unchanged) DB cleanup
    await pool.query(`
      DELETE FROM microtasks WHERE task_id IN (
        SELECT id FROM tasks WHERE subgoal_id IN (
          SELECT id FROM subgoals WHERE goal_id = $1 AND status IN ('not_started', 'in_progress')
        ) AND status IN ('not_started', 'in_progress')
      );
    `, [goalId]);

    await pool.query(`
      DELETE FROM tasks WHERE subgoal_id IN (
        SELECT id FROM subgoals WHERE goal_id = $1 AND status IN ('not_started', 'in_progress')
      ) AND status IN ('not_started', 'in_progress');
    `, [goalId]);

    await pool.query(`
      DELETE FROM subgoals WHERE goal_id = $1 AND status IN ('not_started', 'in_progress');
    `, [goalId]);

    await replaceTodoBreakdown(goalId, aiResponse);

    res.status(200).json({ message: 'Goal regenerated with updated breakdown.' });
  } catch (err) {
    console.error('❌ Regeneration failed:', err.message);
    res.status(500).json({ error: 'Failed to regenerate goal breakdown.' });
  }
};

async function replaceTodoBreakdown(goalId, aiResponse) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const sub of aiResponse.subgoals || []) {
      const subRes = await client.query(
        `INSERT INTO subgoals (goal_id, title, status)
         VALUES ($1, $2, 'not_started') RETURNING id`,
        [goalId, sub.title]
      );

      const subgoalId = subRes.rows[0].id;

      for (const task of sub.tasks || []) {
        const taskRes = await client.query(
          `INSERT INTO tasks (subgoal_id, title, status)
           VALUES ($1, $2, 'not_started') RETURNING id`,
          [subgoalId, task.title]
        );

        const taskId = taskRes.rows[0].id;

        for (const micro of task.microtasks || []) {
          await client.query(
            `INSERT INTO microtasks (task_id, title, status)
             VALUES ($1, $2, 'not_started')`,
            [taskId, micro]
          );
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { regenerateBreakdown };