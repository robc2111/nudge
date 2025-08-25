// controllers/aiController.js
const pool = require('../db');
const editGoalPrompt = require('../prompts/editGoal');
const { OpenAI } = require('openai');
const { extractJsonObject } = require('../utils/jsonUtils');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callGPT(prompt) {
  const res = await openai.chat.completions.create({
    model: editGoalPrompt.model,
    messages: [
      {
        role: 'system',
        content:
          'You are a planner. Return ONLY valid JSON matching this shape: ' +
          '{"goal":string?, "title":string?, "tone":string?, "subgoals":[{"title":string,"tasks":[{"title":string,"microtasks":string[]}]}]}'
      },
      { role: 'user', content: prompt }
    ],
    temperature: editGoalPrompt.temperature,
    // Ask the API to give us proper JSON
    response_format: { type: 'json_object' },
  });

  const text = res.choices?.[0]?.message?.content || '';
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: try to extract JSON from any wrapper text
    const parsed = extractJsonObject(text);
    if (!parsed) {
      const msg = 'AI response was not valid JSON';
      console.error('🛑 callGPT parse error:', { preview: text.slice(0, 400) });
      throw new Error(msg);
    }
    return parsed;
  }
}

exports.regenerateBreakdown = async (req, res) => {
  const goalId = req.params.id;
  const { description } = req.body || {};
  if (!description || description.trim().length < 40) {
    return res.status(400).json({ error: 'Description too short to regenerate.' });
  }

  const client = await pool.connect();
  try {
    // 1) get goal + user
    const { rows: gRows } = await client.query(
      'SELECT id, user_id FROM goals WHERE id=$1 LIMIT 1', [goalId]
    );
    if (!gRows.length) return res.status(404).json({ error: 'Goal not found' });
    const userId = gRows[0].user_id;

    // 2) GPT call (existing)
    const { getGoalData, extractDoneItems } = require('../utils/goalUtils');
    const goalData = await getGoalData(goalId);
    const doneItems = extractDoneItems(goalData);
    const prompt = editGoalPrompt.prompt(description, doneItems);
    const aiResponse = await callGPT(prompt);

    await client.query('BEGIN');

    // 3) Delete only NON-DONE nodes (cast to enum)
    await client.query(`
      DELETE FROM microtasks WHERE task_id IN (
        SELECT id FROM tasks
        WHERE subgoal_id IN (
          SELECT id FROM subgoals WHERE goal_id=$1 AND status IN ('not_started'::status_enum,'in_progress'::status_enum)
        )
        AND status IN ('not_started'::status_enum,'in_progress'::status_enum)
      );
    `, [goalId]);

    await client.query(`
      DELETE FROM tasks WHERE subgoal_id IN (
        SELECT id FROM subgoals WHERE goal_id=$1 AND status IN ('not_started'::status_enum,'in_progress'::status_enum)
      )
      AND status IN ('not_started'::status_enum,'in_progress'::status_enum);
    `, [goalId]);

    await client.query(`
      DELETE FROM subgoals
      WHERE goal_id=$1 AND status IN ('not_started'::status_enum,'in_progress'::status_enum);
    `, [goalId]);

    // 4) Insert new tree with explicit position (1-based) and enum status
    let sgCount = 0, tCount = 0, mCount = 0;

    for (const [sgIdx, sub] of (aiResponse.subgoals || []).entries()) {
      const { rows: [sg] } = await client.query(
        `INSERT INTO subgoals (user_id, goal_id, title, status, position)
         VALUES ($1,$2,$3,'not_started'::status_enum,$4,$5)
         RETURNING id`,
        [userId, goalId, sub.title, sgIdx, sgIdx + 1]
      );
      sgCount++;

      for (const [tIdx, task] of (sub.tasks || []).entries()) {
        const { rows: [t] } = await client.query(
          `INSERT INTO tasks (user_id, subgoal_id, title, status, position)
           VALUES ($1,$2,$3,'not_started'::status_enum,$4,$5)
           RETURNING id`,
          [userId, sg.id, task.title, tIdx, tIdx + 1]
        );
        tCount++;

        for (const [mIdx, micro] of (task.microtasks || []).entries()) {
          await client.query(
            `INSERT INTO microtasks (user_id, task_id, title, status, position)
             VALUES ($1,$2,$3,'not_started'::status_enum,$4,$5)`,
            [userId, t.id, micro, mIdx, mIdx + 1]
          );
          mCount++;
        }
      }
    }

    await client.query('COMMIT');
 const { normalizeProgressByGoal } = require('../utils/progressUtils');
 await normalizeProgressByGoal(goalId);
 return res.status(200).json({
   ok: true,
   inserted: { subgoals: sgCount, tasks: tCount, microtasks: mCount }
 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Regeneration failed:', err);
    return res.status(500).json({ error: 'Failed to regenerate goal breakdown.' });
  } finally {
    client.release();
  }
};