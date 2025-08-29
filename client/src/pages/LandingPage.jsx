import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setSEO } from '../lib/seo';

export default function LandingPage() {
  useEffect(() => {
    setSEO({
      title: 'GoalCrumbs - Break Big Goals Into Tiny Crumbs',
      description:
        'Your AI-powered accountability partner — break big goals into steps, get Telegram nudges, and track progress.',
      ogImage: '/dashboard.png',
      url: 'https://goalcrumbs.com/',
    });
  }, []);

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-left">
          <img className="hero-image" src="/logo.png" alt="GoalCrumbs Logo" />
        </div>
        <div className="hero-right">
          <h1>Break Big Goals Into Tiny Crumbs</h1>
          <p>Your AI-powered accountability partner — stay on track, stay motivated.</p>
          <p>
            <Link className="cta-button" to="/signup">Get Started</Link>
            {' '}or{' '}
            <Link className="cta-button secondary" to="/login">Sign In</Link>
          </p>
        </div>
      </section>

      <section className="about-section">
        <h2>Why GoalCrumbs Works</h2>
        <ul className="benefits-list">
          <li>✅ Layered structure: goals → subgoals → tasks → microtasks</li>
          <li>✅ Daily nudges + weekly reviews to build consistency</li>
          <li>✅ Smart defaults and progress tracking that reduce decision fatigue</li>
          <li>✅ Telegram integration for frictionless check-ins</li>
        </ul>
      </section>

      <section className="side-by-side-sections">
        <div className="how-it-works-section">
          <h2>How It Works 🍰</h2>
          <div>
            <img src="/cake.png" alt="Goal" />
            <p><strong>Goal:</strong> Describe your mission. We set smart defaults.</p>
          </div>
          <div>
            <img src="/slice.png" alt="Subgoal" />
            <p><strong>Subgoal:</strong> We slice your goal into weekly milestones.</p>
          </div>
          <div>
            <img src="/crumbs.png" alt="Tasks" />
            <p><strong>Tasks → Microtasks:</strong> Tiny steps with daily nudges and weekly check-ins.</p>
          </div>
          <div>
            <img src="/ant.png" alt="Daily Reminders" />
            <p>
              <strong>Daily Reminders:</strong> Your next microtask sent over Telegram —
              like an ant carrying crumbs, tiny consistent actions add up.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-screen-xl px-6 md:px-10 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">See Your Progress at a Glance</h2>
          <img
            className="mx-auto mt-6 rounded-2xl shadow-md w-full max-w-5xl"
            src="/dashboard.png"
            alt="GoalCrumbs dashboard preview"
            loading="lazy"
            width={500}
            height={350}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      </section>

      <section id="plans" className="about-section">
        <h2>Choose Your Plan</h2>
        <div className="side-by-side-sections">
          <div className="pricing-card">
            <h3>Free</h3>
            <p className="tagline">Your first goal, end-to-end.</p>
            <ul className="benefits-list">
              <li>✅ 1 active goal (full breakdown)</li>
              <li>✅ Tasks & microtasks with progress</li>
              <li>✅ Daily nudges + weekly check-ins (Telegram)</li>
              <li>✅ Basic dashboard</li>
            </ul>
            <Link to="/signup" className="cta-button">Start Free</Link>
          </div>

          <div className="pricing-card">
            <h3>Pro</h3>
            <p className="tagline">Unlimited goals + quality-of-life boosts.</p>
            <ul className="benefits-list">
              <li>✅ <strong>Unlimited goals</strong></li>
              <li>✅ <strong>Flexible reminders</strong></li>
              <li>✅ <strong>Streaks & analytics</strong></li>
              <li>✅ <strong>CSV export</strong></li>
              <li>✅ <strong>Themes</strong></li>
            </ul>
            <div style={{ marginTop: '1rem' }}>
              <Link to="/signup" className="cta-button">Go Pro</Link>{' '}
              <Link to="/login" className="cta-button secondary">I already have an account</Link>
            </div>
            <p className="tagline">Start free. Upgrade anytime — your data stays.</p>
          </div>
        </div>
        <p className="tagline" style={{ marginTop: '1rem', textAlign: 'center' }}>
          Free plan includes your first goal fully. Create more goals by upgrading to Pro.
        </p>
      </section>
    </div>
  );
}