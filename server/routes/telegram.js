//telegram.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../db');
const reflectionSessions = {}; // Temporary in-memory storage for reflect mode
const { cascadeAfterMicrotaskDone, normalizeProgressByGoal } = require('../utils/progressUtils');

function isWeeklyReflectionWindow() {
  const now = new Date();
  const weekday = now.getDay(); // Sunday = 0
  const hour = now.getHours();
  return weekday === 0 && hour >= 18 && hour <= 23;
}

const sendMessage = async (chatId, text) => {
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  });
};

router.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const text = message.text.trim();

    console.log('✅ Incoming message:', JSON.stringify(message, null, 2));
    console.log('➡️ message.text:', text);

    // 1. Check DB for user
    const userCheck = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [chatId]);
    const user = userCheck.rows[0];

    if (!user) {
      const reply = `👋 Hi! It looks like you haven't registered yet.\n\nPlease [click here to register](https://goalcrumbs.com/signup) so Goalcrumbs can keep you on track!`;
      await sendMessage(chatId, reply);
      return res.sendStatus(200);
    }

    if (message.reply_to_message?.message_id) {
  const repliedId = message.reply_to_message.message_id;

  // Did we send a weekly prompt with that message_id?
  const { rows: pRows } = await pool.query(
    `SELECT id FROM weekly_prompts
      WHERE user_id = $1 AND telegram_message_id = $2
      ORDER BY sent_at DESC
      LIMIT 1`,
    [user.id, repliedId]
  );

  if (pRows[0]) {
    // attach to the latest in-progress goal if present
    const { rows: gRows } = await pool.query(
      `SELECT id FROM goals
         WHERE user_id = $1 AND status = 'in_progress'
         ORDER BY updated_at DESC NULLS LAST
         LIMIT 1`,
      [user.id]
    );
    const goalId = gRows[0]?.id || null;

    await pool.query(
      `INSERT INTO reflections (user_id, goal_id, content, created_at, source, weekly_prompt_id)
       VALUES ($1, $2, $3, NOW(), 'weekly_checkin', $4)`,
      [user.id, goalId, text, pRows[0].id]
    );

    await sendMessage(chatId, "✅ Saved your weekly reflection. Nice work!");
    return res.sendStatus(200);
  }
}

    // 2. If user just sent /reflect, prompt them
    if (text.toLowerCase() === '/reflect') {
      reflectionSessions[chatId] = true;
      await sendMessage(chatId, "🪞 Please reply with your reflection. What went well, what didn’t, and what did you learn?");
      return res.sendStatus(200);
    }

    // 3. Handle reflection response
    if (reflectionSessions[chatId]) {
      reflectionSessions[chatId] = false;

      const goalRes = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = goalRes.rows.length ? goalRes.rows[0].id : null;

      if (!goalId) {
        await sendMessage(chatId, "⚠️ You don’t have an active goal. Please create one in the app before submitting reflections.");
        return res.sendStatus(200);
      }

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content)
         VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(chatId, "✅ Your reflection has been saved. Keep up the great work!");
      return res.sendStatus(200);
    }

    // 4. Weekly auto-reflection window
    if (isWeeklyReflectionWindow()) {
      const goalRes = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = goalRes.rows[0]?.id || null;

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content) VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(chatId, "✅ Got it! Your reflection has been logged. See you next week.");
      return res.sendStatus(200);
    }

    // 4.5 On-demand "today" command (current task + checklist)
if (text.toLowerCase() === '/today') {
  // pick the first actionable task and also return goal_id
  const taskRes = await pool.query(`
    SELECT t.id AS task_id, t.title AS task_title, g.id AS goal_id, g.title AS goal_title
    FROM tasks t
    JOIN subgoals sg ON t.subgoal_id = sg.id
    JOIN goals g     ON sg.goal_id = g.id
    WHERE g.user_id = $1
      AND EXISTS (SELECT 1 FROM microtasks mt WHERE mt.task_id = t.id AND mt.status <> 'done')
    ORDER BY sg.id, t.id
    LIMIT 1
  `, [user.id]);

  if (!taskRes.rows.length) {
    await sendMessage(chatId, "🎉 No pending microtasks. You’re all caught up!");
    return res.sendStatus(200);
  }

  const { task_id, task_title, goal_id, goal_title } = taskRes.rows[0];

  // normalize so checklist reflects single active item
  await normalizeProgressByGoal(goal_id);

  const mtRes = await pool.query(`
    SELECT id, title, status
    FROM microtasks
    WHERE task_id = $1
    ORDER BY id
  `, [task_id]);

  const nextIdx = mtRes.rows.findIndex(m => m.status !== 'done');
  const checklist = mtRes.rows.map((m, i) => {
    const icon = m.status === 'done' ? '✅' : (i === nextIdx ? '🔸' : '⭕');
    return `${icon} ${m.title}`;
  }).join('\n');

  const msg =
`🗓️ *Today’s Focus*

*Goal:* ${goal_title}
*Task:* ${task_title}

*Microtasks:*
${checklist}

Reply with:
• \`done [microtask words]\` to check one off
• /reflect to log a quick reflection`;

  await sendMessage(chatId, msg);
  return res.sendStatus(200);
}

    // 5. Show active goals
    if (text.toLowerCase() === '/goals') {
      const activeGoals = await pool.query(
        `SELECT title FROM goals WHERE user_id = $1 AND status = 'in_progress'`,
        [user.id]
      );

      if (activeGoals.rows.length === 0) {
        await sendMessage(chatId, "📭 You don't have any active goals right now.");
      } else {
        const titles = activeGoals.rows.map(g => `🎯 ${g.title}`).join('\n');
        await sendMessage(chatId, `Here are your active goals:\n\n${titles}`);
      }

      return res.sendStatus(200);
    }

    // 6. Set tone via `/tone`
    async function updateUserTone(userId, tone, chatId) {
  const updateRes = await pool.query(`
    UPDATE goals SET tone = $1
    WHERE user_id = $2 AND status = 'in_progress'
    RETURNING title
  `, [tone, userId]);

  if (updateRes.rowCount === 0) {
    await sendMessage(chatId, "⚠️ You don’t have an active goal to apply this tone to.");
  } else {
    await sendMessage(chatId, `✅ Coach tone set to *${tone}* for your goal: *${updateRes.rows[0].title}*`);
  }
}

    if (text.toLowerCase() === '/tone status') {
  const toneRes = await pool.query(`
    SELECT tone FROM goals
    WHERE user_id = $1 AND status = 'in_progress'
    LIMIT 1
  `, [user.id]);

  const tone = toneRes.rows[0]?.tone;

  if (!tone) {
    await sendMessage(chatId, "📭 You don’t have an active goal or a tone set.");
  } else {
    await sendMessage(chatId, `🎙️ Your current coach tone is: *${tone}*`);
  }

  return res.sendStatus(200);
}

if (text.toLowerCase() === '/tone') {
  await sendMessage(chatId, `🎙️ Choose your coach tone:

🐭 *friendly* – Kind and encouraging  
🐜 *strict* – No-nonsense and focused  
🐦 *motivational* – Upbeat and energizing

Just reply with one of the keywords.`);
  return res.sendStatus(200);
}

// 7. Handle tone reply (if it matches valid tone)
const toneMatch = text.toLowerCase().match(/\b(friendly|strict|motivational)\b/);
if (toneMatch) {
  const tone = toneMatch[1];
  await updateUserTone(user.id, tone, chatId);
  return res.sendStatus(200);
}

// 8. Mark a microtask as done
if (text.toLowerCase().startsWith('done')) {
  const microtaskTitle = text.slice(4).trim();

  // Find the target microtask for THIS user
  const result = await pool.query(
    `SELECT mt.id, mt.title
     FROM microtasks mt
     JOIN tasks t     ON mt.task_id = t.id
     JOIN subgoals sg ON t.subgoal_id = sg.id
     JOIN goals g     ON sg.goal_id = g.id
     WHERE g.user_id = $1
       AND mt.title ILIKE '%' || $2 || '%'
     ORDER BY mt.id
     LIMIT 1`,
    [user.id, microtaskTitle]
  );

  const microtask = result.rows[0];
  if (!microtask) {
    await sendMessage(chatId, `⚠️ Microtask "${microtaskTitle}" not found.`);
    return res.sendStatus(200);
  }

  // 1) mark as done
  await pool.query(`UPDATE microtasks SET status = 'done' WHERE id = $1`, [microtask.id]);

  // 2) cascade normalization (ensures single in-progress at each level)
  const cascade = await cascadeAfterMicrotaskDone(microtask.id);

  // 3) messages
  await sendMessage(chatId, `✅ Marked *"${microtask.title}"* as done! 🎉`);

  if (cascade?.activeMicroId) {
    const next = await pool.query(`SELECT title FROM microtasks WHERE id = $1`, [cascade.activeMicroId]);
    const nextTitle = next.rows[0]?.title;
    if (nextTitle) await sendMessage(chatId, `👉 Next up: *${nextTitle}*`);
  } else {
    await sendMessage(chatId, `🎉 You’ve completed all microtasks for this goal. Great work!`);
  }

  return res.sendStatus(200);
}

    // 9. Help message
    if (text.toLowerCase() === '/help') {
      await sendMessage(chatId, `🤖 *Goalcrumbs Bot Help*
Here’s what I can do:

🪞 */reflect* – Log a weekly reflection  
🎯 */goals* – View your active goals  
🎙️ */tone* – Change your coach's tone  
🎙️ */tone status* – Check your current tone 
✅ *done [task]* – Mark a microtask as done  
❓ */help* – Show this message`);
      return res.sendStatus(200);
    }

    // 10. Fallback
    const fallback = `Hi ${user.name}, I didn’t understand that command. 🤔

Try:
- *done plan meals*
- /reflect
- /goals
- /help`;
    await sendMessage(chatId, fallback);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;