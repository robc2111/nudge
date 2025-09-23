// server/routes/telegram.js
const express = require('express');
const { DateTime } = require('luxon');
const router = express.Router();

const {
  sendTelegram,
  editTelegramMessage,
  answerCallbackQuery,
  toneKeyboard,
  escapeTgMarkdown,
  sendGoalCompleted,
} = require('../utils/telegram');

const pool = require('../db');
const _auth = require('../middleware/auth');
const requireAuth =
  typeof _auth === 'function'
    ? _auth
    : typeof _auth?.requireAuth === 'function'
      ? _auth.requireAuth
      : null;

if (!requireAuth) {
  throw new Error('middleware/auth must export a function or { requireAuth }');
}

const {
  cascadeAfterMicrotaskDone,
  normalizeProgressByGoal,
} = require('../utils/progressUtils');

const {
  fetchNextAcrossGoals,
  renderChecklist, // NOTE: ensure this escapes microtask titles inside (recommended)
} = require('../utils/goalHelpers');

const { assertPro } = require('../utils/plan');

router.get('/health', (req, res) => res.json({ ok: true }));

/* --------------------------------------------------------------------------------
 * In-memory session state
 * ------------------------------------------------------------------------------*/
const reflectionSessions = {}; // chatId -> boolean (awaiting freeform reflection)

/** Number-picker session for /done */
const donePickSessions = Object.create(null);
/** Number-picker session for /today */
const todayPickSessions = Object.create(null);

// shape: { items: [{id,title,goal,task}], createdAt: ts }
const DONE_PICK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TODAY_PICK_TTL_MS = 10 * 60 * 1000;

function clearDoneSession(chatId) {
  delete donePickSessions[chatId];
}
function clearTodaySession(chatId) {
  delete todayPickSessions[chatId];
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
    SELECT
      mt.id,
      mt.title,
      g.title  AS goal,
      t.title  AS task,
      mt.status,
      mt.created_at,
      sg.position AS sg_pos,
      t.position  AS task_pos,
      mt.position AS micro_pos
    FROM microtasks mt
    JOIN tasks t      ON t.id  = mt.task_id
    JOIN subgoals sg  ON sg.id = t.subgoal_id
    JOIN goals g      ON g.id  = sg.goal_id
    WHERE g.user_id = $1
      AND COALESCE(mt.status, 'todo') <> 'done'
    ORDER BY
      CASE WHEN mt.status = 'in_progress' THEN 0 ELSE 1 END,
      sg.position ASC,
      t.position  ASC,
      mt.position ASC,
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
 * Tone helpers
 * ------------------------------------------------------------------------------*/
async function getActiveGoal(userId) {
  const { rows } = await pool.query(
    `SELECT id, title, tone
       FROM goals
      WHERE user_id = $1
        AND status = 'in_progress'
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function setActiveGoalTone(userId, tone) {
  const goal = await getActiveGoal(userId);
  if (!goal) {
    return {
      updated: false,
      msg: '⚠️ You don’t have an active goal to apply this tone to.',
      goal: null,
    };
  }
  const { rowCount } = await pool.query(
    `UPDATE goals SET tone = $1, updated_at = NOW() WHERE id = $2`,
    [String(tone), goal.id]
  );
  if (!rowCount) {
    return { updated: false, msg: '⚠️ Could not update tone.', goal };
  }
  return {
    updated: true,
    msg: `✅ Coach tone set to *${escapeTgMarkdown(tone)}* for *${escapeTgMarkdown(
      goal.title
    )}*`,
    goal: { ...goal, tone },
  };
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
  if (cascade?.impact?.goal?.status === 'done') {
    // fetch minimal goal data to include title
    const { rows: g } = await pool.query(
      `SELECT id, title FROM goals WHERE id = $1`,
      [cascade.impact.goal.id]
    );
    try {
      // You need the user to DM; we have chatId here, but not always user object.
      const { rows: u } = await pool.query(
        `SELECT id, name, telegram_id, telegram_enabled FROM users WHERE id = (
         SELECT user_id FROM goals WHERE id = $1
       )`,
        [cascade.impact.goal.id]
      );
      if (u[0]) {
        await sendGoalCompleted(
          u[0],
          g[0] || { id: cascade.impact.goal.id, title: '' }
        );
      }
    } catch (e) {
      console.warn('[tg] goal-completed send failed:', e.message);
    }
  }

  await sendMessage(
    chatId,
    `✅ Marked *${escapeTgMarkdown(hit.title)}* as done! 🎉`
  );

  const goalJustCompleted = cascade?.impact?.goal?.status === 'done';

  if (cascade?.activeMicroId && !goalJustCompleted) {
    const { rows: nxt } = await pool.query(
      `SELECT title FROM microtasks WHERE id = $1`,
      [cascade.activeMicroId]
    );
    if (nxt[0]?.title) {
      await sendMessage(
        chatId,
        `👉 Next up: *${escapeTgMarkdown(nxt[0].title)}*`
      );
    }
  } else if (!goalJustCompleted) {
    await sendMessage(
      chatId,
      '🎉 You’ve completed all microtasks for this goal. Great work!'
    );
  }
}

/** Original search-based 'done <words>' handler, now also aware of pick-number */
async function handleMarkDone({ text, user, chatId }) {
  const pick = parsePickNumber(text);

  // Prefer active /today picker first
  if (pick && todayPickSessions[chatId]?.items) {
    const { items, createdAt } = todayPickSessions[chatId];
    if (Date.now() - createdAt > TODAY_PICK_TTL_MS) {
      clearTodaySession(chatId);
      await sendMessage(
        chatId,
        '⏰ That list from /today expired. Send /today again to get a fresh list.'
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
    clearTodaySession(chatId);
    await markMicrotaskDoneById(chosen.id, chatId);
    return;
  }

  // Then prefer active /done picker
  if (pick && donePickSessions[chatId]?.items) {
    const { items, createdAt } = donePickSessions[chatId];
    if (Date.now() - createdAt > DONE_PICK_TTL_MS) {
      clearDoneSession(chatId);
      await sendMessage(
        chatId,
        '⏰ That selection list expired. Send `done` again to get a fresh list.'
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

  // If a number was given but no list is active, guide the user
  if (
    pick &&
    !donePickSessions[chatId]?.items &&
    !todayPickSessions[chatId]?.items
  ) {
    await sendMessage(
      chatId,
      'I don’t have a numbered list to use. Send /today for a cross-goal list or type *done* to get a picker.'
    );
    return;
  }

  // Fallback: fuzzy search "done <words>"
  const q = text.replace(/^\/?done/i, '').trim();
  if (!q) {
    await startDonePicker({ user, chatId });
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
    await sendMessage(
      chatId,
      `⚠️ Couldn't find a microtask matching: *${escapeTgMarkdown(q)}*`
    );
    return;
  }

  await markMicrotaskDoneById(hit.id, chatId);
}

/** Start number-picker flow for /done (goal-focused suggestions) */
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
    const title = escapeTgMarkdown(it.title);
    const goal = it.goal ? escapeTgMarkdown(it.goal) : '';
    const task = it.task ? escapeTgMarkdown(it.task) : '';
    const ctx = goal
      ? `— *${goal}*${task ? ` › ${task}` : ''}`
      : task
        ? `— ${task}`
        : '';
    return `${n}. ${title}\n   ${ctx}`;
  });

  await sendMessage(
    chatId,
    `Which microtask did you finish?\n\n${lines.join(
      '\n\n'
    )}\n\nReply with the number (e.g. *1*) or type *cancel*.\nNumbers refer to this list.`
  );
}

/* --------------------------------------------------------------------------------
 * Account ↔ Telegram link management
 * ------------------------------------------------------------------------------*/

/**
 * Link the current authenticated user to a Telegram chat id.
 * Body: { telegram_id: number/string }
 * Enforces uniqueness (handles Postgres 23505 from partial unique index).
 */
router.post('/link', requireAuth, async (req, res) => {
  const telegramId = String(req.body.telegram_id || '').trim();
  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  try {
    await pool.query(
      `UPDATE users
          SET telegram_id = $1,
              telegram_enabled = true
        WHERE id = $2`,
      [telegramId, req.user.id]
    );
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') {
      // Unique violation from partial unique index (WHERE telegram_id IS NOT NULL)
      return res.status(409).json({
        error:
          'That Telegram account is already linked to another user. Unlink it there first or contact support.',
        code: 'TELEGRAM_ID_TAKEN',
      });
    }
    console.error('[telegram link] failed:', e.message);
    return res.status(500).json({ error: 'Failed to link Telegram' });
  }
});

/**
 * Unlink the authenticated user’s Telegram id.
 */
router.post('/unlink', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users
          SET telegram_id = NULL,
              telegram_enabled = false
        WHERE id = $1`,
      [req.user.id]
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('[telegram unlink] failed:', e.message);
    return res.status(500).json({ error: 'Failed to unlink Telegram' });
  }
});

/* --------------------------------------------------------------------------------
 * Webhook
 * ------------------------------------------------------------------------------*/
router.post('/webhook', async (req, res) => {
  try {
    // 1) Handle inline button taps first
    const cq = req.body?.callback_query;
    if (cq) {
      const chatId = cq.message?.chat?.id;
      const userChatId = cq.from?.id;
      const data = String(cq.data || '');

      // Identify user by telegram_id (same as chat id)
      const { rows: urows } = await pool.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [userChatId]
      );
      const user = urows[0];

      if (!user) {
        await answerCallbackQuery({
          callback_query_id: cq.id,
          text: 'Please sign up in the app first.',
          show_alert: true,
        });
        return res.sendStatus(200);
      }

      if (data.startsWith('tone:')) {
        const tone = data.split(':')[1];
        try {
          await assertPro(user.id);
        } catch {
          await answerCallbackQuery({
            callback_query_id: cq.id,
            text: 'Tone customization is Pro only.',
            show_alert: true,
          });
          return res.sendStatus(200);
        }

        const result = await setActiveGoalTone(user.id, tone);

        // ephemeral toast on the button tap
        await answerCallbackQuery({
          callback_query_id: cq.id,
          text: result.updated ? `Tone set to ${tone}` : 'Could not set tone',
          show_alert: false,
        });

        // edit the original tone message to reflect the selection (✅)
        if (chatId && cq.message?.message_id) {
          const currentGoal = await getActiveGoal(user.id); // fetch to get latest tone/title
          const currentTone = currentGoal?.tone || tone;

          const header =
            '🎙️ *Coach tone* (Pro)\n\n' +
            'Tap a style below to change how your coach speaks:';
          await editTelegramMessage({
            chat_id: chatId,
            message_id: cq.message.message_id,
            text: header,
            parse_mode: 'Markdown',
            reply_markup: toneKeyboard(currentTone),
          });

          // Optional extra confirmation line (separate message)
          if (result.updated && currentGoal?.title) {
            await sendMessage(
              chatId,
              `✅ Coach tone set to *${escapeTgMarkdown(
                currentTone
              )}* for *${escapeTgMarkdown(currentGoal.title)}*`
            );
          } else if (!result.updated) {
            await sendMessage(chatId, result.msg);
          }
        }

        return res.sendStatus(200);
      }

      // Unknown callback types: just ACK to avoid spinner
      await answerCallbackQuery({ callback_query_id: cq.id });
      return res.sendStatus(200);
    }

    // 2) Then handle normal text messages
    const message = req.body?.message;
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

    /* ---------- Helper: present a multi-goal numbered list (/list and /done) ---------- */
    async function presentNumberedList() {
      const items = await fetchCandidateMicrotasks(user.id, 12);
      if (!items.length) {
        await sendMessage(
          chatId,
          '🎉 No pending microtasks. You’re all caught up!'
        );
        return null;
      }

      // Save session BEFORE sending message so replies map correctly.
      donePickSessions[chatId] = { items, createdAt: Date.now() };

      // Group by goal for clarity, but keep a single global counter
      const byGoal = new Map();
      for (const it of items) {
        if (!byGoal.has(it.goal)) byGoal.set(it.goal, []);
        byGoal.get(it.goal).push(it);
      }

      const lines = [];
      let n = 1;
      for (const [goalTitle, arr] of byGoal.entries()) {
        const g = goalTitle ? `*${escapeTgMarkdown(goalTitle)}*` : '*Unsorted*';
        lines.push(`🎯 ${g}`);
        for (const it of arr) {
          const t = it.task ? ` › ${escapeTgMarkdown(it.task)}` : '';
          const mt = escapeTgMarkdown(it.title);
          lines.push(`${n}. ${mt}${t}`);
          n += 1;
        }
        lines.push(''); // blank line between goals
      }

      const msg =
        `Here are your next microtasks (grouped by goal):\n\n` +
        lines.join('\n') +
        `\nReply with a number (e.g. *1*) or type *cancel*.\n` +
        `Tip: You can also send \`done 2\` directly to pick #2.`;

      await sendMessage(chatId, msg);
      return items;
    }

    /* ---------- DONE picker: cancel / numeric replies ---------- */

    // If a user typed "done <n>" without a current list, generate one first.
    const doneNumMatch = textLower.match(/^\/?done\s+(\d{1,2})$/);
    if (doneNumMatch && !donePickSessions[chatId]?.items) {
      const created = await presentNumberedList();
      if (created) {
        // Try immediately to honor their original selection
        const pick = Number(doneNumMatch[1]);
        if (pick >= 1 && pick <= created.length) {
          const chosen = created[pick - 1];
          clearDoneSession(chatId);
          await markMicrotaskDoneById(chosen.id, chatId);
          return res.sendStatus(200);
        }
      }
      // If we can't fulfill immediately, just return after showing list
      return res.sendStatus(200);
    }

    if (donePickSessions[chatId] && /^cancel$/i.test(textLower)) {
      clearDoneSession(chatId);
      await sendMessage(chatId, 'Cancelled. Nothing was marked done.');
      return res.sendStatus(200);
    }

    if (donePickSessions[chatId]) {
      const pick = parsePickNumber(textLower);
      if (pick) {
        const { items, createdAt } = donePickSessions[chatId];
        if (Date.now() - createdAt > DONE_PICK_TTL_MS) {
          clearDoneSession(chatId);
          await sendMessage(
            chatId,
            '⏰ That selection list expired. Send /list (or /done) to get a fresh list.'
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

    // Mark-as-done priority
    if (/^(?:\/)?(?:done|complete|✔)\b/i.test(textLower)) {
      const q = text.replace(/^\/?done/i, '').trim();
      if (!q) {
        // No query => show numbered list first (clear for multi-goal)
        await presentNumberedList();
        return res.sendStatus(200);
      }
      // With query => original search flow
      await handleMarkDone({ text, user, chatId });
      return res.sendStatus(200);
    }

    /* ---------- /list: explicit numbered list across goals ---------- */
    if (textLower === '/list') {
      await presentNumberedList();
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

    /* ---------- /reflect ---------- */
    if (textLower === '/reflect') {
      reflectionSessions[chatId] = true;
      await sendMessage(
        chatId,
        '🪞 Please reply with your reflection. What went well, what didn’t, and what did you learn?'
      );
      return res.sendStatus(200);
    }

    /* ---------- reflection reply ---------- */
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
        .map((p, i) => {
          const goalTitle = escapeTgMarkdown(p.goal.title);
          const taskTitle = escapeTgMarkdown(p.task.title);
          // Ensure renderChecklist escapes microtask titles internally
          return `*Goal ${i + 1}:* ${goalTitle}
*Task:* ${taskTitle}

${renderChecklist(p.microtasks, p.nextIdx)}`;
        })
        .join('\n\n— — —\n\n');

      const msg =
        `🗓️ *Today’s Focus Across Your Goals*\n\n${sections}\n\nReply with:` +
        `\n• \`/list\` to get a numbered picker you can reply to` +
        `\n• \`done\` to pick from a numbered list (or \`done 2\` to pick #2)` +
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
            .map((r) => `🎯 ${escapeTgMarkdown(r.title)}`)
            .join('\n')}`
        );
      }
      return res.sendStatus(200);
    }

    /* ---------- Tones (Pro-only) ---------- */
    if (textLower === '/tone status') {
      const goal = await getActiveGoal(user.id);
      const tone = goal?.tone;
      await sendMessage(
        chatId,
        tone
          ? `🎙️ Your current coach tone is: *${escapeTgMarkdown(tone)}*`
          : '📭 You don’t have an active goal or a tone set.'
      );
      return res.sendStatus(200);
    }

    if (textLower === '/tone') {
      const goal = await getActiveGoal(user.id);
      const currentTone = goal?.tone || null;
      const header =
        '🎙️ *Coach tone* (Pro)\n\n' +
        '*friendly* – Kind and encouraging\n' +
        '*strict* – No-nonsense and focused\n' +
        '*motivational* – Upbeat and energizing\n\n' +
        'Tap a button below:';
      await sendTelegram({
        chat_id: chatId,
        parse_mode: 'Markdown',
        text: header,
        reply_markup: toneKeyboard(currentTone),
      });
      return res.sendStatus(200);
    }

    const toneMatch = textLower.match(/\b(friendly|strict|motivational)\b/);
    if (toneMatch) {
      try {
        await assertPro(user.id);
      } catch {
        await sendMessage(
          chatId,
          '🔒 Tone customization is a *Pro* feature. Open Profile → Billing to upgrade.'
        );
        return res.sendStatus(200);
      }
      const r = await setActiveGoalTone(user.id, toneMatch[1]);
      await sendMessage(chatId, r.msg);
      return res.sendStatus(200);
    }

    /* ---------- /help ---------- */
    if (textLower === '/help') {
      await sendMessage(
        chatId,
        `🤖 *GoalCrumbs Bot Help*
Here’s what I can do:

🪞 \`/reflect\` — Log a weekly reflection  
🎯 \`/goals\` — View your active goals  
📝 \`/list\` — Show a numbered list across all goals  
🎙️ \`/tone\` — Change your coach's tone (Pro)  
🎙️ \`/tone status\` — Check your current tone  
💡 Pro users get tone-aware weekly coaching messages

✅ \`done\` — Show a numbered list you can reply to  
✅ \`done 2\` — Mark option #2 from the last list  
✅ \`done [words]\` — Search by title and mark it done  

❓ \`/help\` — Show this message`
      );
      return res.sendStatus(200);
    }

    /* ---------- Fallback ---------- */
    await sendMessage(
      chatId,
      `Hi ${escapeTgMarkdown(user.name)}, I didn’t understand that command. 🤔

Try:
- /list       (numbered picker across goals)
- done 2      (mark #2 from the last list)
- done meals  (search by title)
- /today
- /reflect
- /goals
- /tone
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
