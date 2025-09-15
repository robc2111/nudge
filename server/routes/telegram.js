// server/routes/telegram.js
const express = require('express');
const { DateTime } = require('luxon');

const router = express.Router();

const pool = require('../db');
const {
  cascadeAfterMicrotaskDone,
  normalizeProgressByGoal,
} = require('../utils/progressUtils');
const {
  fetchNextAcrossGoals,
  renderChecklist,
} = require('../utils/goalHelpers');
const { sendTelegram } = require('../utils/telegram');

/* --------------------------------------------------------------------------------
 * In-memory session state
 * ------------------------------------------------------------------------------*/
const reflectionSessions = {}; // chatId -> boolean (awaiting freeform reflection)

/** Number-picker session for /done */
const donePickSessions = Object.create(null);
// shape: donePickSessions[chatId] = { items: [{id,title,goal,task}], createdAt: ts }
const DONE_PICK_TTL_MS = 10 * 60 * 1000; // 10 minutes
function clearDoneSession(chatId) {
  delete donePickSessions[chatId];
}

/* --------------------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------------------*/
function validZone(tz) {
  try {
    return tz && DateTime.local().setZone(tz).isValid;
  } catch {
    return false;
  }
}

function isUserWeeklyReflectionWindow(
  userTz,
  { hourStart = 18, hourEnd = 23, isoWeekday = 7 } = {}
) {
  const zone = validZone(userTz) ? userTz : 'Etc/UTC';
  const now = DateTime.now().setZone(zone);
  return (
    now.weekday === isoWeekday &&
    now.hour >= hourStart &&
    (now.hour < hourEnd || (now.hour === hourEnd && now.minute === 0))
  );
}

const sendMessage = (chatId, text, extra = {}) =>
  sendTelegram({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra });

/** Fetch a small list of "next" microtasks to present as a numbered picker */
async function fetchCandidateMicrotasks(userId, limit = 8) {
  const { rows } = await pool.query(
    `
    SELECT mt.id,
           mt.title,
           g.title  AS goal,
           t.title  AS task,
           mt.status,
           mt.created_at
      FROM microtasks mt
      JOIN tasks t      ON t.id  = mt.task_id
      JOIN subgoals sg  ON sg.id = t.subgoal_id
      JOIN goals g      ON g.id  = sg.goal_id
     WHERE g.user_id = $1
       AND (mt.status <> 'done' OR mt.status IS NULL)
     ORDER BY CASE WHEN mt.status = 'in_progress' THEN 0 ELSE 1 END,
              mt.created_at ASC NULLS LAST
     LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}

/** Parse "1" or "done 2" to a 1-based integer; returns null if no match */
function parsePickNumber(text) {
  const m = String(text || '')
    .trim()
    .match(/^(?:\/?done\s+)?(\d{1,2})$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/* --------------------------------------------------------------------------------
 * Mark-as-done helpers
 * ------------------------------------------------------------------------------*/
async function markMicrotaskDoneById(microtaskId, chatId) {
  const { rows: mtRows } = await pool.query(
    `SELECT id, title FROM microtasks WHERE id = $1`,
    [microtaskId]
  );
  const hit = mtRows[0];
  if (!hit) {
    await sendMessage(chatId, '⚠️ That microtask no longer exists.');
    return;
  }

  await pool.query(
    `UPDATE microtasks
        SET status = 'done',
            completed_at = COALESCE(completed_at, NOW())
      WHERE id = $1`,
    [hit.id]
  );

  const cascade = await cascadeAfterMicrotaskDone(hit.id);

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
    await sendMessage(
      chatId,
      '🎉 You’ve completed all microtasks for this goal. Great work!'
    );
  }
}

/** Original search-based 'done <words>' handler, now also aware of pick-number */
async function handleMarkDone({ text, user, chatId }) {
  // If the user typed a number (e.g. "done 2") and there's an active session, consume it.
  const pick = parsePickNumber(text);
  if (pick && donePickSessions[chatId]?.items) {
    const { items, createdAt } = donePickSessions[chatId];
    if (Date.now() - createdAt > DONE_PICK_TTL_MS) {
      clearDoneSession(chatId);
      await sendMessage(
        chatId,
        '⏰ That selection list expired. Send /done again to get a fresh list.'
      );
      return;
    }
    if (pick > items.length) {
      await sendMessage(
        chatId,
        `Please reply with a number between 1 and ${items.length}.`
      );
      return;
    }
    const chosen = items[pick - 1];
    clearDoneSession(chatId);
    await markMicrotaskDoneById(chosen.id, chatId);
    return;
  }

  // If no query text provided → start the picker flow instead of demanding words.
  const q = text.replace(/^\/?done/i, '').trim();
  if (!q) {
    await startDonePicker({ user, chatId });
    return;
  }

  // Search by words in the microtask title
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

  await markMicrotaskDoneById(hit.id, chatId);
}

/** Start number-picker flow for /done */
async function startDonePicker({ user, chatId }) {
  const items = await fetchCandidateMicrotasks(user.id, 8);
  if (!items.length) {
    await sendMessage(
      chatId,
      '🎉 No pending microtasks. You’re all caught up!'
    );
    return;
  }

  donePickSessions[chatId] = { items, createdAt: Date.now() };

  const lines = items.map((it, idx) => {
    const n = idx + 1;
    const ctx = it.goal ? ` — *${it.goal}* › ${it.task || ''}`.trim() : '';
    return `${n}. ${it.title}${ctx ? `\n   ${ctx}` : ''}`;
  });

  await sendMessage(
    chatId,
    `Which microtask did you finish?\n\n${lines.join(
      '\n\n'
    )}\n\nReply with a number (e.g. *1*) or type *cancel*.`
  );
}

/* --------------------------------------------------------------------------------
 * Webhook
 * ------------------------------------------------------------------------------*/
router.post('/webhook', async (req, res) => {
  try {
    const message = req.body?.message;
    console.log('📩 Webhook payload:', JSON.stringify(req.body, null, 2));
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = String(message.text || '').trim();
    const textLower = text.toLowerCase();

    // Identify user
    const { rows: urows } = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [chatId]
    );
    const user = urows[0];
    if (!user) {
      await sendMessage(
        chatId,
        `👋 Hi! It looks like you haven't registered yet.\n\nPlease [click here to register](https://goalcrumbs.com/signup) so GoalCrumbs can keep you on track!`
      );
      return res.sendStatus(200);
    }

    /* ---------- DONE picker: cancel / numeric replies ---------- */

    // Cancel active /done selection
    if (donePickSessions[chatId] && /^cancel$/i.test(textLower)) {
      clearDoneSession(chatId);
      await sendMessage(chatId, 'Cancelled. Nothing was marked done.');
      return res.sendStatus(200);
    }

    // Numeric reply while a selection is active
    if (donePickSessions[chatId]) {
      const pick = parsePickNumber(textLower);
      if (pick) {
        const { items, createdAt } = donePickSessions[chatId];
        if (Date.now() - createdAt > DONE_PICK_TTL_MS) {
          clearDoneSession(chatId);
          await sendMessage(
            chatId,
            '⏰ That selection list expired. Send /done again to get a fresh list.'
          );
          return res.sendStatus(200);
        }
        if (pick < 1 || pick > items.length) {
          await sendMessage(
            chatId,
            `Please reply with a number between 1 and ${items.length}.`
          );
          return res.sendStatus(200);
        }
        const chosen = items[pick - 1];
        clearDoneSession(chatId);
        await markMicrotaskDoneById(chosen.id, chatId);
        return res.sendStatus(200);
      }
    }

    // Mark-as-done high priority ("/done", "done", "done <words>", etc.)
    if (/^(?:\/)?(?:done|complete|✔)\b/i.test(textLower)) {
      await handleMarkDone({ text, user, chatId });
      return res.sendStatus(200);
    }

    /* ---------- Weekly prompt reply detection ---------- */
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

        await sendMessage(
          chatId,
          '✅ Saved your weekly reflection for this goal. Nice work!'
        );
        return res.sendStatus(200);
      }
    }

    /* ---------- /reflect (start capture) ---------- */
    if (textLower === '/reflect') {
      reflectionSessions[chatId] = true;
      await sendMessage(
        chatId,
        '🪞 Please reply with your reflection. What went well, what didn’t, and what did you learn?'
      );
      return res.sendStatus(200);
    }

    /* ---------- reflection reply (freeform) ---------- */
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

      await sendMessage(
        chatId,
        '✅ Your reflection has been saved. Keep up the great work!'
      );
      return res.sendStatus(200);
    }

    /* ---------- Weekly auto capture window ---------- */
    if (isUserWeeklyReflectionWindow(user.timezone)) {
      const { rows } = await pool.query(
        `SELECT id FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
        [user.id]
      );
      const goalId = rows[0]?.id || null;

      await pool.query(
        `INSERT INTO reflections (user_id, goal_id, content) VALUES ($1, $2, $3)`,
        [user.id, goalId, text]
      );

      await sendMessage(
        chatId,
        '✅ Got it! Your reflection has been logged. See you next week.'
      );
      return res.sendStatus(200);
    }

    /* ---------- /today ---------- */
    if (textLower === '/today') {
      const packs = await fetchNextAcrossGoals(user.id);

      if (packs.length === 0) {
        await sendMessage(
          chatId,
          '🎉 No pending microtasks. You’re all caught up across all goals!'
        );
        return res.sendStatus(200);
      }

      for (const p of packs) {
        await normalizeProgressByGoal(p.goal.id).catch(() => {});
      }

      const sections = packs
        .map(
          (p, i) => `*Goal ${i + 1}:* ${p.goal.title}
*Task:* ${p.task.title}

${renderChecklist(p.microtasks, p.nextIdx)}`
        )
        .join('\n\n— — —\n\n');

      const msg =
        `🗓️ *Today’s Focus Across Your Goals*\n\n${sections}\n\nReply with:` +
        `\n• \`done\` to pick one to check off (or \`done 2\` to pick #2)` +
        `\n• \`done [words]\` to search by title` +
        `\n• /reflect to log a quick reflection`;
      await sendMessage(chatId, msg);
      return res.sendStatus(200);
    }

    /* ---------- /goals ---------- */
    if (textLower === '/goals') {
      const { rows } = await pool.query(
        `SELECT title FROM goals WHERE user_id = $1 AND status = 'in_progress'`,
        [user.id]
      );
      if (!rows.length) {
        await sendMessage(
          chatId,
          "📭 You don't have any active goals right now."
        );
      } else {
        await sendMessage(
          chatId,
          `Here are your active goals:\n\n${rows
            .map((r) => `🎯 ${r.title}`)
            .join('\n')}`
        );
      }
      return res.sendStatus(200);
    }

    /* ---------- Tones ---------- */
    async function updateUserTone(userId, tone, chatId) {
      const updateRes = await pool.query(
        `UPDATE goals SET tone = $1
         WHERE user_id = $2 AND status = 'in_progress'
         RETURNING title`,
        [tone, userId]
      );

      if (updateRes.rowCount === 0) {
        await sendMessage(
          chatId,
          '⚠️ You don’t have an active goal to apply this tone to.'
        );
      } else {
        await sendMessage(
          chatId,
          `✅ Coach tone set to *${tone}* for your goal: *${updateRes.rows[0].title}*`
        );
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
        tone
          ? `🎙️ Your current coach tone is: *${tone}*`
          : '📭 You don’t have an active goal or a tone set.'
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

    /* ---------- /help ---------- */
    if (textLower === '/help') {
      await sendMessage(
        chatId,
        `🤖 *GoalCrumbs Bot Help*
Here’s what I can do:

🪞 */reflect* — Log a weekly reflection  
🎯 */goals* — View your active goals  
🎙️ */tone* — Change your coach's tone  
🎙️ */tone status* — Check your current tone  
💡 *Pro users* get tone-aware weekly coaching messages

✅ *done* — Show a numbered list of your next microtasks  
✅ *done 2* — Mark option #2 from the last list  
✅ *done [words]* — Search by title and mark it done  

❓ */help* — Show this message`
      );
      return res.sendStatus(200);
    }

    /* ---------- Fallback ---------- */
    await sendMessage(
      chatId,
      `Hi ${user.name}, I didn’t understand that command. 🤔

Try:
- *done*     (pick from a list)
- *done 2*   (mark #2)
- *done plan meals* (search)
- /reflect
- /goals
- /help`
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(
      '❌ Telegram webhook error:',
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

module.exports = router;
