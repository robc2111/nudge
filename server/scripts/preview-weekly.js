#!/usr/bin/env node
require('dotenv').config();

const path = require('path');
const axios = require('axios');
const { parseArgs } = require('node:util');
const { DateTime } = require('luxon');

// Reuse your existing modules (script inside /server/scripts)
const pool = require(path.resolve(__dirname, '../db'));
const systemPrompts = require(path.resolve(__dirname, '../prompts'));

function validZone(tz) {
  try { return tz && DateTime.local().setZone(tz).isValid; } catch { return false; }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function listUsers(limit = 10) {
  const { rows } = await pool.query(
    `SELECT id, name, email, telegram_id, timezone
       FROM users
      ORDER BY created_at DESC NULLS LAST
      LIMIT $1`, [limit]
  );
  return rows;
}

async function getUser({ userId, telegram, email, name }) {
  if (userId) {
    if (UUID_RE.test(userId)) {
      const { rows } = await pool.query(
        `SELECT id, name, email, telegram_id, timezone
           FROM users
          WHERE id = $1`, [userId]
      );
      if (rows[0]) return rows[0];
    }
    // Partial UUID match (avoid uuid cast error)
    const { rows } = await pool.query(
      `SELECT id, name, email, telegram_id, timezone
         FROM users
        WHERE id::text ILIKE '%' || $1 || '%'
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1`, [userId]
    );
    if (rows[0]) return rows[0];
  }

  if (telegram) {
    const { rows } = await pool.query(
      `SELECT id, name, email, telegram_id, timezone
         FROM users
        WHERE telegram_id = $1
        LIMIT 1`, [telegram]
    );
    if (rows[0]) return rows[0];
  }

  if (email) {
    const { rows } = await pool.query(
      `SELECT id, name, email, telegram_id, timezone
         FROM users
        WHERE email ILIKE $1
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1`, [email]
    );
    if (rows[0]) return rows[0];
  }

  if (name) {
    const { rows } = await pool.query(
      `SELECT id, name, email, telegram_id, timezone
         FROM users
        WHERE name ILIKE '%' || $1 || '%'
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1`, [name]
    );
    if (rows[0]) return rows[0];
  }

  return null;
}

async function getToneForUser(userId) {
  const { rows } = await pool.query(
    `SELECT tone FROM goals WHERE user_id = $1 AND status = 'in_progress' LIMIT 1`,
    [userId]
  );
  return rows[0]?.tone || 'friendly';
}

async function getReflectionsForWindow(user, days = 7) {
  const zone = validZone(user.timezone) ? user.timezone : 'Etc/UTC';
  const endLocal = DateTime.now().setZone(zone).endOf('day');
  const startLocal = endLocal.minus({ days: Math.max(1, days - 1) }).startOf('day');
  const startUtc = startLocal.toUTC().toISO();
  const endUtc = endLocal.toUTC().toISO();

  const { rows } = await pool.query(
    `SELECT r.content, r.created_at, g.title AS goal_title
       FROM reflections r
       LEFT JOIN goals g ON g.id = r.goal_id
      WHERE r.user_id = $1
        AND r.created_at >= $2
        AND r.created_at <= $3
      ORDER BY r.created_at ASC`,
    [user.id, startUtc, endUtc]
  );
  return rows;
}

async function generateWeekly({ tone, reflections }) {
  const messages = systemPrompts.weeklyCheckins.buildChat({ tone, reflections });

  const res = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: systemPrompts.weeklyCheckins.model,
    messages,
    max_tokens: 260,
    temperature: systemPrompts.weeklyCheckins.temperature,
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });

  const text = res.data?.choices?.[0]?.message?.content?.trim();
  return text || '🪞 **Weekly Reflection**\n\n1) Biggest win this week?\n2) Biggest challenge?\n3) One lesson + next step.\n\nReply here with your answers.';
}

(async function main() {
  try {
    const { values } = parseArgs({
      options: {
        user:     { type: 'string' },
        u:        { type: 'string' },
        telegram: { type: 'string' },
        tg:       { type: 'string' },
        email:    { type: 'string' },
        name:     { type: 'string' },
        tone:     { type: 'string' },
        days:     { type: 'string' },
        list:     { type: 'boolean' },
      }
    });

    // args
    const userId   = values.user || values.u;
    const telegram = values.telegram || values.tg;
    const email    = values.email;
    const name     = values.name;
    const toneOverride = values.tone;
    const days     = Number(values.days || 7);

    if (values.list) {
      const rows = await listUsers(15);
      console.log('Recent users:');
      rows.forEach(r => {
        console.log(`- ${r.id} | ${r.name || 'N/A'} | ${r.email || 'no-email'} | tg:${r.telegram_id || '—'} | ${r.timezone || 'Etc/UTC'}`);
      });
      process.exit(0);
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY in environment.');
      process.exit(1);
    }
    if (!userId && !telegram && !email && !name) {
      console.error('Usage: node scripts/preview-weekly.js --user <uuid or partial> | --telegram <chat_id> | --email <addr> | --name <substr> [--tone ...] [--days N] [--list]');
      process.exit(1);
    }

    const user = await getUser({ userId, telegram, email, name });
    if (!user) {
      console.error('User not found.');
      process.exit(1);
    }

    const tone = toneOverride || await getToneForUser(user.id);
    const reflections = await getReflectionsForWindow(user, days);

    console.log(`User: ${user.id} (${user.name || 'N/A'}) | TZ: ${user.timezone || 'Etc/UTC'}`);
    console.log(`Tone: ${tone} | Reflections in last ${days}d: ${reflections.length}`);
    console.log('---');

    const message = await generateWeekly({ tone, reflections });
    console.log(message);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    try { await pool.end?.(); } catch {}
  }
})();