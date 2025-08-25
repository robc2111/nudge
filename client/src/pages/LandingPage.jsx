// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom';

export default function LandingPage() {
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

      {/* WHY IT WORKS */}
      <section className="about-section">
  <h2>Why GoalCrumbs Works</h2>
  <ul className="benefits-list">
    <li>✅ Layered structure: goals → subgoals → tasks → microtasks</li>
    <li>✅ Daily nudges + weekly reviews to build consistency</li>
    <li>✅ Smart defaults and progress tracking that reduce decision fatigue</li>
    <li>✅ Telegram integration for frictionless check-ins</li>
  </ul>
</section>

      {/* HOW IT WORKS (more verbose) — team section removed */}
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
  </div>
  <div className="mx-auto max-w-screen-xl px-6 md:px-10 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">See Your Progress at a Glance</h2>
          <img
            className="mx-auto mt-6 rounded-2xl shadow-md w-full max-w-5xl"
            src="/example-dashboard.png"
            alt="GoalCrumbs dashboard preview"
            loading="lazy"
            width={1280}
            height={768}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
</section>

      {/* PRO BENEFITS + CTA */}
<section id="plans" className="about-section">
  <h2>Choose Your Plan</h2>

  <div className="side-by-side-sections">
    {/* FREE */}
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

    {/* PRO */}
    <div className="pricing-card">
      <h3>Pro</h3>
      <p className="tagline">Unlimited goals + quality-of-life boosts.</p>
      <ul className="benefits-list">
        <li>✅ <strong>Unlimited goals</strong> (create as many as you like)</li>
        <li>✅ <strong>Flexible reminders</strong> (choose days/times)</li>
        <li>✅ <strong>Streaks & simple analytics</strong> (done counts, completion %)</li>
        <li>✅ <strong>CSV export</strong> (goals, tasks, progress)</li>
        <li>✅ <strong>Themes</strong> (light/dark, warm)</li>
      </ul>
      <div style={{ marginTop: '1rem' }}>
        <Link to="/signup" className="cta-button">Go Pro</Link>
        {' '}
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