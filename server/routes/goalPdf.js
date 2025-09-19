// server/routes/goalPdf.js
const express = require('express');
const PDFDocument = require('pdfkit');
const { DateTime } = require('luxon');

const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

function pct(done, total) {
  if (!total) return '0%';
  return `${Math.round((done / total) * 100)}%`;
}

function drawHRule(doc, yOffset = 8) {
  const y = doc.y + yOffset;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor('#dddddd')
    .lineWidth(1)
    .stroke()
    .moveDown(0.6);
}

function drawKeyValue(doc, key, value) {
  doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
  doc.font('Helvetica').text(value ?? '—');
}

function checkbox(status) {
  return status === 'done' ? '[x]' : '[ ]';
}

/** Load a full goal tree (ownership enforced). */
async function fetchGoalTree({ userId, goalId }) {
  // 1) Verify goal belongs to user
  const { rows: goalRows } = await pool.query(
    `SELECT id, user_id, title, description, status, tone, due_date, created_at, updated_at
       FROM goals
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
    [goalId, userId]
  );
  const goal = goalRows[0];
  if (!goal) return null;

  // 2) Subgoals
  const { rows: subgoals } = await pool.query(
    `SELECT id, title, description, position, status
       FROM subgoals
      WHERE goal_id = $1
      ORDER BY position NULLS LAST, created_at ASC, id ASC`,
    [goalId]
  );

  // 3) Tasks
  const { rows: tasks } = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.subgoal_id, t.position
       FROM tasks t
       JOIN subgoals sg ON sg.id = t.subgoal_id
      WHERE sg.goal_id = $1
      ORDER BY t.subgoal_id, t.position NULLS LAST, t.created_at ASC, t.id ASC`,
    [goalId]
  );

  // 4) Microtasks
  const { rows: microtasks } = await pool.query(
    `SELECT m.id, m.title, m.status, m.task_id, m.position, m.completed_at
       FROM microtasks m
       JOIN tasks t ON t.id = m.task_id
       JOIN subgoals sg ON sg.id = t.subgoal_id
      WHERE sg.goal_id = $1
      ORDER BY m.task_id, m.position NULLS LAST, m.created_at ASC, m.id ASC`,
    [goalId]
  );

  // Grouping
  const tasksBySub = new Map();
  for (const t of tasks) {
    if (!tasksBySub.has(t.subgoal_id)) tasksBySub.set(t.subgoal_id, []);
    tasksBySub.get(t.subgoal_id).push(t);
  }

  const microsByTask = new Map();
  for (const m of microtasks) {
    if (!microsByTask.has(m.task_id)) microsByTask.set(m.task_id, []);
    microsByTask.get(m.task_id).push(m);
  }

  // Build tree with progress counts
  let goalDone = 0,
    goalTotal = 0;

  const subTrees = subgoals.map((sg) => {
    const tList = tasksBySub.get(sg.id) || [];
    let sgDone = 0,
      sgTotal = 0;

    const tNodes = tList.map((t) => {
      const mList = microsByTask.get(t.id) || [];
      const tTotal = mList.length || 0;
      const tDone = mList.filter((x) => x.status === 'done').length;
      sgTotal += tTotal;
      sgDone += tDone;

      return { ...t, microtasks: mList, mtDone: tDone, mtTotal: tTotal };
    });

    goalTotal += sgTotal;
    goalDone += sgDone;

    return { ...sg, tasks: tNodes, done: sgDone, total: sgTotal };
  });

  return {
    goal: {
      ...goal,
      done: goalDone,
      total: goalTotal,
      percent: pct(goalDone, goalTotal),
    },
    subgoals: subTrees,
  };
}

/* ────────────────────────────────────────────────────────────
   GET /api/goals/:id/pdf  → returns a PDF download
   ──────────────────────────────────────────────────────────── */

router.get('/goals/:id/pdf', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    const tree = await fetchGoalTree({ userId, goalId });
    if (!tree) return res.status(404).json({ error: 'Goal not found' });

    const { goal, subgoals } = tree;

    // Set headers first (so client gets a download)
    const safeName =
      goal.title?.replace(/[^\w\s-]+/g, '').replace(/\s+/g, '_') || 'goal';
    const filename = `GoalCrumbs_${safeName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create PDF
    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);

    // Title
    doc.font('Helvetica-Bold').fontSize(20).text(`Goal: ${goal.title}`);
    doc.moveDown(0.5);
    drawHRule(doc, 6);

    // Meta line
    const created = goal.created_at
      ? DateTime.fromJSDate(goal.created_at).toFormat('dd LLL yyyy')
      : '—';
    const due = goal.due_date
      ? DateTime.fromJSDate(goal.due_date).toFormat('dd LLL yyyy')
      : '—';

    drawKeyValue(doc, 'Status', (goal.status || '—').replace(/_/g, ' '));
    drawKeyValue(doc, 'Tone', goal.tone || 'friendly');
    drawKeyValue(doc, 'Created', created);
    drawKeyValue(doc, 'Due', due);

    // Progress summary
    doc.moveDown(0.6);
    drawKeyValue(
      doc,
      'Progress',
      `${goal.done}/${goal.total} microtasks (${goal.percent})`
    );

    // Description
    if (goal.description) {
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').text('Description');
      doc.moveDown(0.2);
      doc.font('Helvetica').text(goal.description);
    }

    // Breakdown
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(16).text('Breakdown');
    doc.font('Helvetica').fontSize(12);
    drawHRule(doc, 6);

    if (!subgoals.length) {
      doc.text('No subgoals yet.');
    }

    subgoals.forEach((sg, i) => {
      // Start each subgoal with a little spacing
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').text(`Subgoal ${i + 1}: ${sg.title}`);
      const sgPct = pct(sg.done, sg.total);
      doc
        .font('Helvetica')
        .text(
          `Status: ${(sg.status || '—').replace(/_/g, ' ')}   Progress: ${
            sg.done
          }/${sg.total} (${sgPct})`
        );
      if (sg.description) {
        doc.moveDown(0.1);
        doc.text(sg.description);
      }

      // Tasks
      if (!sg.tasks.length) {
        doc.moveDown(0.2);
        doc.text('— No tasks yet');
      } else {
        sg.tasks.forEach((t, ti) => {
          doc.moveDown(0.25);
          doc.font('Helvetica-Bold').text(`  ${i + 1}.${ti + 1}  ${t.title}`);
          const tPct = pct(t.mtDone, t.mtTotal);
          doc
            .font('Helvetica')
            .text(
              `  Status: ${(t.status || '—').replace(
                /_/g,
                ' '
              )}   Progress: ${t.mtDone}/${t.mtTotal} (${tPct})`
            );
          if (t.description) {
            doc.text(`  ${t.description}`);
          }

          if (!t.microtasks.length) {
            doc.text('   • (no microtasks)').moveDown(0.05);
          } else {
            t.microtasks.forEach((m) => {
              const mark = checkbox(m.status);
              const when = m.completed_at
                ? DateTime.fromJSDate(m.completed_at).toFormat('dd LLL')
                : '';
              doc.text(`   • ${mark} ${m.title}${when ? `  (${when})` : ''}`);
            });
          }
        });
      }

      // Page break if close to bottom
      if (
        doc.y > doc.page.height - doc.page.margins.bottom - 100 &&
        i !== subgoals.length - 1
      ) {
        doc.addPage();
      } else {
        drawHRule(doc, 8);
      }
    });

    // Footer
    doc
      .moveDown(1)
      .fontSize(10)
      .fillColor('#777777')
      .text(
        `Generated by GoalCrumbs on ${DateTime.now().toFormat(
          'dd LLL yyyy, HH:mm'
        )}`,
        {
          align: 'right',
        }
      );

    doc.end(); // piping ends the HTTP response
  } catch (e) {
    console.error('[goal pdf] error:', e);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
