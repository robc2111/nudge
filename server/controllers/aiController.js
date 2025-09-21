// server/controllers/aiController.js
const pool = require('../db');
const systemPrompts = require('../prompts');
const { extractJsonObject } = require('../utils/jsonUtils');
const { getClient, projectHeaders, defaultModels } = require('../utils/openai');

const editGoalCfg = systemPrompts.editGoal; // { model, temperature, prompt }

async function callGPT(prompt) {
  const client = getClient();

  const res = await client.chat.completions.create(
    {
      model: editGoalCfg?.model || defaultModels.chat,
      messages: [
        {
          role: 'system',
          content:
            'You are a planner. Return ONLY valid JSON matching this shape: ' +
            '{"goal":string?, "title":string?, "tone":string?, "subgoals":[{"title":string,"tasks":[{"title":string,"microtasks":string[]}]}]}',
        },
        { role: 'user', content: prompt },
      ],
      temperature: Number.isFinite(editGoalCfg?.temperature)
        ? editGoalCfg.temperature
        : 0.2,
      response_format: { type: 'json_object' }, // ask for structured JSON
    },
    { headers: projectHeaders() }
  );

  const text = res.choices?.[0]?.message?.content || '';

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    const parsed = extractJsonObject(text);
    if (!parsed) {
      console.error('🛑 callGPT parse error:', { preview: text.slice(0, 400) });
      throw new Error('AI response was not valid JSON');
    }
    return parsed;
  }
}

exports.regenerateBreakdown = async (req, res) => {
  const goalId = req.params.id;
  const { description } = req.body || {};
  if (!description || description.trim().length < 40) {
    return res
      .status(400)
      .json({ error: 'Description too short to regenerate.' });
  }

  const client = await pool.connect();
  try {
    // 1) get goal + user
    const { rows: gRows } = await client.query(
      'SELECT id, user_id FROM goals WHERE id=$1 LIMIT 1',
      [goalId]
    );
    if (!gRows.length) return res.status(404).json({ error: 'Goal not found' });
    const userId = gRows[0].user_id;

    // 2) Build prompt with existing helpers
    const { getGoalData, extractDoneItems } = require('../utils/goalUtils');
    const goalData = await getGoalData(goalId);
    const doneItems = extractDoneItems(goalData);
    const prompt = editGoalCfg.prompt(description, doneItems);

    // 3) Call model
    const aiResponse = await callGPT(prompt);

    await client.query('BEGIN');

    // 4) Delete only NON-DONE nodes (explicit enum casts)
    await client.query(
      `
      DELETE FROM microtasks WHERE task_id IN (
        SELECT id FROM tasks
         WHERE subgoal_id IN (
           SELECT id FROM subgoals
            WHERE goal_id=$1
              AND status IN ('not_started'::status_enum,'in_progress'::status_enum)
         )
           AND status IN ('not_started'::status_enum,'in_progress'::status_enum)
      );`,
      [goalId]
    );

    await client.query(
      `
      DELETE FROM tasks WHERE subgoal_id IN (
        SELECT id FROM subgoals
         WHERE goal_id=$1
           AND status IN ('not_started'::status_enum,'in_progress'::status_enum)
      )
      AND status IN ('not_started'::status_enum,'in_progress'::status_enum);`,
      [goalId]
    );

    await client.query(
      `
      DELETE FROM subgoals
       WHERE goal_id=$1
         AND status IN ('not_started'::status_enum,'in_progress'::status_enum);`,
      [goalId]
    );

    // 5) Insert new tree with explicit position (1-based) and enum status
    let sgCount = 0,
      tCount = 0,
      mCount = 0;

    for (const [sgIdx, sub] of (aiResponse.subgoals || []).entries()) {
      const {
        rows: [sg],
      } = await client.query(
        `INSERT INTO subgoals (user_id, goal_id, title, status, position)
         VALUES ($1,$2,$3,'not_started'::status_enum,$4)
         RETURNING id`,
        [userId, goalId, sub.title, sgIdx + 1]
      );
      sgCount++;

      for (const [tIdx, task] of (sub.tasks || []).entries()) {
        const {
          rows: [t],
        } = await client.query(
          `INSERT INTO tasks (user_id, subgoal_id, title, status, position)
           VALUES ($1,$2,$3,'not_started'::status_enum,$4)
           RETURNING id`,
          [userId, sg.id, task.title, tIdx + 1]
        );
        tCount++;

        for (const [mIdx, micro] of (task.microtasks || []).entries()) {
          await client.query(
            `INSERT INTO microtasks (user_id, task_id, title, status, position)
             VALUES ($1,$2,$3,'not_started'::status_enum,$4)`,
            [userId, t.id, micro, mIdx + 1]
          );
          mCount++;
        }
      }
    }

    await client.query('COMMIT');

    const { normalizeProgressByGoal } = require('../utils/progressUtils');
    await normalizeProgressByGoal(goalId);

    return res
      .status(200)
      .json({
        ok: true,
        inserted: { subgoals: sgCount, tasks: tCount, microtasks: mCount },
      });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Regeneration failed:', err);
    return res
      .status(500)
      .json({ error: 'Failed to regenerate goal breakdown.' });
  } finally {
    client.release();
  }
};
