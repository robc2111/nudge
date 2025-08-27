// server/routes/telegram.js
const express = require('express');
const router = express.Router();

const pool = require('../db');
const { cascadeAfterMicrotaskDone, normalizeProgressByGoal } = require('../utils/progressUtils');
const { fetchNextAcrossGoals, renderChecklist } = require('../utils/goalHelpers');
const { sendTelegram } = require('../utils/telegram');

const reflectionSessions = {}; // in-memory

function isWeeklyReflectionWindow() {
  const now = new Date();
  const weekday = now.getDay(); // 0 = Sun
  const hour = now.getHours();
  return weekday === 0 && hour >= 18 && hour <= 23;
}

const sendMessage = (chatId, text, extra = {}) =>
  sendTelegram({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra });

/** Mark a microtask as done (acknowledges + suggests next) */
async function handleMarkDone({ text, user, chatId }) {
  const q = text.slice(4).trim(); // after 'done'
  if (!q) {
    await sendMessage(chatId, 'Please write `done <some words from the microtask title>`');
    return;
  }

  const { rows } = await pool.query(
    `SELECT mt.id, mt.title
       FROM microtasks mt
       JOIN tasks t     ON mt.task_id = t.id
       JOIN subgoals sg ON t.subgoal_id = sg.id
       JOIN goals g     ON sg.goal_id = g.id
      WHERE g.user_id = $1
        AND mt.title ILIKE '%' || $2 || '%'
      ORDER BY mt.id
      LIMIT 1`,
    [user.id, q]
  );

  const hit = rows[0];
  if (!hit) {
    await sendMessage(chatId, `⚠️ Couldn't find a microtask matching: *${q}*`);
    return;
  }

  // 1) mark as done
  await pool.query(
  `UPDATE microtasks
      SET status = 'done',
          completed_at = COALESCE(completed_at, NOW())
    WHERE id = $1`,
  [hit.id]
);

  // 2) cascade normalization
  const cascade = await cascadeAfterMicrotaskDone(hit.id);

  // 3) ack + next-up
  await sendMessage(chatId, `✅ Marked *${hit.title}* as done! 🎉`);

  if (cascade?.activeMicroId) {
    const { rows: nxt } = await pool.query(
      `SELECT title FROM microtasks WHERE id = $1`,
      [cascade.activeMicroId]
    );
    if (nxt[0]?.title) {
      await sendMessage(chatId, `👉 Next up: *${nxt[0].title}*`);
    }
  } else {
    await sendMessage(chatId, '🎉 You’ve completed all microtasks for this goal. Great work!');
  }
}

router.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
     console.log('📩 Webhook payload:', JSON.stringify(req.body, null, 2));
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = String(message.text || '').trim();
    const textLower = text.toLowerCase();

    // 1) Identify user
    const { rows: urows } = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [chatId]
    );
    const user = urows[0];
    if (!user) {
      await sendMessage(
        chatId,
        `👋 Hi! It looks like you haven't registered yet.\n\nPlease [click here to register](https://goalcrumbs.com/signup) so Goalcrumbs can keep you on track!`
      );
      return res.sendStatus(200);
    }

    // 🚨 PRIORITY: mark-as-done should work even when replying to any message (incl. weekly)
    if (/^(done|complete|✔)\s/i.test(textLower)) {
      await handleMarkDone({ text, user, chatId });
      return res.sendStatus(200);
    }

    // 1.5) Handle replies to weekly prompts (only if not a done-command)
   // server/routes/telegram.js  (in the section that handles reply_to_message)
if (message.reply_to_message?.message_id) {
  const repliedId = message.reply_to_message.message_id;

  const { rows: pRows } = await pool.query(
    `SELECT id, goal_id
       FROM weekly_prompts
      WHERE user_id = $1 AND telegram_message_id = $2
      ORDER BY sent_at DESC
      LIMIT 1`,
    [user.id, repliedId]
  );

  if (pRows[0]) {
    const goalId = pRows[0].goal_id || null;

    await pool.query(
      `INSERT INTO reflections (user_id, goal_id, content, created_at, source, weekly_prompt_id)
       VALUES ($1, $2, $3, NOW(), 'weekly_checkin', $4)`,
      [user.id, goalId, text, pRows[0].id]
    );

    await sendMessage(chatId, '✅ Saved your weekly reflection for this goal. Nice work!');
    return res.sendStatus(200);
  }
}

    // 2) /reflect
    if (textLower === '/reflect') {
      reflectionSessions[chatId] = true;
      await sendMessage(
        chatId,
        '🪞 Please reply with your reflection. What went well, what didn’t, and what did you learn?'
      );
      return res.sendStatus(200);
    }

    // 3) reflection reply
    if (reflectionSessions[chatId]) {
      reflectionSessions[chatId] = false;

      const { rows } = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = rows[0]?.id || null;

      if (!goalId) {
        await sendMessage(
          chatId,
          '⚠️ You don’t have an active goal. Please create one in the app before submitting reflections.'
        );
        return res.sendStatus(200);
      }

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content)
         VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(chatId, '✅ Your reflection has been saved. Keep up the great work!');
      return res.sendStatus(200);
    }

    // 4) weekly auto capture window
    if (isWeeklyReflectionWindow()) {
      const { rows } = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = rows[0]?.id || null;

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content) VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(chatId, '✅ Got it! Your reflection has been logged. See you next week.');
      return res.sendStatus(200);
    }

    // 4.5) /today → show the next task for each goal with remaining microtasks
    if (textLower === '/today') {
      const packs = await fetchNextAcrossGoals(user.id); // uses in-progress/has-work criteria

      if (packs.length === 0) {
        await sendMessage(chatId, '🎉 No pending microtasks. You’re all caught up across all goals!');
        return res.sendStatus(200);
      }

      for (const p of packs) {
        await normalizeProgressByGoal(p.goal.id).catch(() => {});
      }

      const sections = packs
        .map((p, i) => `*Goal ${i + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${renderChecklist(p.microtasks, p.nextIdx)}`)
        .join('\n\n— — —\n\n');

      const msg =
        `🗓️ *Today’s Focus Across Your Goals*\n\n${sections}\n\nReply with:` +
        `\n• \`done [microtask words]\` to check one off` +
        `\n• /reflect to log a quick reflection`;
      await sendMessage(chatId, msg);
      return res.sendStatus(200);
    }

    // 5) /goals
    if (textLower === '/goals') {
      const { rows } = await pool.query(
        `SELECT title FROM goals WHERE user_id = $1 AND status = 'in_progress'`,
        [user.id]
      );
      if (!rows.length) {
        await sendMessage(chatId, "📭 You don't have any active goals right now.");
      } else {
        await sendMessage(chatId, `Here are your active goals:\n\n${rows.map(r => `🎯 ${r.title}`).join('\n')}`);
      }
      return res.sendStatus(200);
    }

    // 6) tones
    async function updateUserTone(userId, tone, chatId) {
      const updateRes = await pool.query(
        `UPDATE goals SET tone = $1
         WHERE user_id = $2 AND status = 'in_progress'
         RETURNING title`,
        [tone, userId]
      );

      if (updateRes.rowCount === 0) {
        await sendMessage(chatId, '⚠️ You don’t have an active goal to apply this tone to.');
      } else {
        await sendMessage(chatId, `✅ Coach tone set to *${tone}* for your goal: *${updateRes.rows[0].title}*`);
      }
    }

    if (textLower === '/tone status') {
      const { rows } = await pool.query(
        `SELECT tone FROM goals
         WHERE user_id = $1 AND status = 'in_progress'
         LIMIT 1`,
        [user.id]
      );
      const tone = rows[0]?.tone;
      await sendMessage(
        chatId,
        tone ? `🎙️ Your current coach tone is: *${tone}*` : '📭 You don’t have an active goal or a tone set.'
      );
      return res.sendStatus(200);
    }

    if (textLower === '/tone') {
      await sendMessage(
        chatId,
        `🎙️ Choose your coach tone:

🐭 *friendly* – Kind and encouraging  
🐜 *strict* – No-nonsense and focused  
🐦 *motivational* – Upbeat and energizing

Just reply with one of the keywords.`
      );
      return res.sendStatus(200);
    }

    const toneMatch = textLower.match(/\b(friendly|strict|motivational)\b/);
    if (toneMatch) {
      await updateUserTone(user.id, toneMatch[1], chatId);
      return res.sendStatus(200);
    }

    // 9) help
    if (textLower === '/help') {
      await sendMessage(
        chatId,
        `🤖 *Goalcrumbs Bot Help*
Here’s what I can do:

🪞 */reflect* – Log a weekly reflection  
🎯 */goals* – View your active goals  
🎙️ */tone* – Change your coach's tone  
🎙️ */tone status* – Check your current tone 
✅ *done [task]* – Mark a microtask as done  
❓ */help* – Show this message`
      );
      return res.sendStatus(200);
    }

    // 10) fallback
    await sendMessage(
      chatId,
      `Hi ${user.name}, I didn’t understand that command. 🤔

Try:
- *done plan meals*
- /reflect
- /goals
- /help`
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Telegram webhook error:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;