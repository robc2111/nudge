// src/pages/FAQ.jsx
import React, { useEffect } from 'react';
import { setSEO, seoPresets } from '../lib/seo';

const updated = '2025-09-18';

// You can use plain apostrophes inside these strings.
// For answers that need links, set `jsx: true` and provide a React node in `a`.
const faqs = [
  {
    q: 'What is GoalCrumbs?',
    a: 'GoalCrumbs is your AI-powered accountability partner. It breaks big goals into small, actionable “crumbs” — subgoals, tasks, and microtasks — and keeps you on track with daily reminders and weekly reflections.',
  },
  {
    q: 'How does it work?',
    a: '1) You set a goal. 2) GoalCrumbs helps break it into smaller, more manageable subgoals, tasks, and microtasks. 3) You get reminders (via Telegram) and track progress on your dashboard. 4) Weekly reflections keep momentum and reveal insights.',
  },
  {
    q: 'What do Cake / Slice / Crumbs mean?',
    a: "Cake = the big goal, Slice = a subgoal, Crumbs = tasks & microtasks. It's a playful mental model to keep things simple.",
  },
  {
    q: 'Do I need Telegram?',
    jsx: true,
    a: (
      <>
        Yes — Telegram is currently the primary channel for reminders,
        tone-based coaching, and quick commands like /reflect or marking
        microtasks as done. If you don&apos;t have it yet, you can download it
        from{' '}
        <a
          className="legal-link"
          href="https://telegram.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          telegram.org
        </a>{' '}
        (desktop and mobile).
      </>
    ),
  },
  {
    q: 'How do I find my Telegram ID?',
    a: 'Open Telegram and search for @userinfobot. Tap “Start” and it will reply with your numeric user ID (e.g., 123456789). Copy that number and paste it into GoalCrumbs during signup (or view it later on your Profile page). If you prefer, any similar “user info” bot works too — the key is the numeric ID.',
  },
  {
    q: 'Is GoalCrumbs free?',
    a: 'The first goal and core features are free. The Pro Plan allows multiple goals and extra features for £8.99 a month.',
  },
  {
    q: 'Can I change the tone of reminders?',
    a: 'Yep! Choose between friendly, strict, or motivational tones. You can select the tone on the dashboard or via Telegram.',
  },
  {
    q: 'What happens if I stop responding?',
    a: "We'll keep sending you daily reminders and weekly check-ins. You can mute or pause reminders anytime on the profile page. Weekly reflections still help you reset even if you miss some days.",
  },
  {
    q: 'Is my data safe?',
    a: "We use a managed Postgres database and token-based authentication. Your personal data isn't sold to third parties.",
  },
  {
    q: 'Who is it for?',
    a: 'Freelancers, solopreneurs, students, and anyone who wants playful, lightweight accountability for personal, fitness, learning, or career goals.',
  },
  {
    q: 'How can I share feedback or suggestions?',
    a: 'We love hearing from users! Send suggestions via email at support@goalcrumbs.com. Your feedback helps shape new features.',
  },
  {
    q: 'Where can I get updates on new features?',
    a: 'Follow us on social media for product updates, tips, and roadmap announcements. Links can be found at the bottom of the page.',
  },
  {
    q: 'What is included in the Pro plan?',
    a: 'Pro unlocks unlimited goals, flexible reminders, and more. You can upgrade anytime; your existing data stays intact.',
  },
];

export default function FAQ() {
  useEffect(() => {
    setSEO({
      title: 'FAQs – GoalCrumbs',
      description:
        'Common questions about reminders, Telegram, pricing, and more.',
      url: `${seoPresets.baseUrl}/faqs`,
      image: '/og/faqs.png',
    });
  }, []);

  return (
    <main className="page--legal">
      <div className="legal-card">
        <h1 className="legal-title">Frequently Asked Questions</h1>
        <p className="legal-updated">Last updated: {updated}</p>

        <h2 className="legal-section-title">General</h2>
        <ul className="legal-list">
          {faqs.map((item, idx) => (
            <li key={idx}>
              <strong>{item.q}</strong>
              <p>{item.jsx ? item.a : item.a}</p>
            </li>
          ))}
        </ul>

        <h2 className="legal-section-title">Didn’t find what you need?</h2>
        <p>
          Message us via email — we usually respond within a day. <br />
          <a className="legal-link" href="mailto:support@goalcrumbs.com">
            support@goalcrumbs.com
          </a>
          <br />
          Don&apos;t have Telegram?{' '}
          <a
            className="legal-link"
            href="https://telegram.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Telegram
          </a>
          .
        </p>
      </div>
    </main>
  );
}
