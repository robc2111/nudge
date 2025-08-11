// LandingPage.jsx
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">

      {/* Top scan line — Hook + CTA */}
      <section className="hero-section">
        <div className="hero-left">
          <img className="hero-image" src="/logo.png" alt="GoalCrumbs Logo" />
        </div>
        <div className="hero-right">
          <h1>Break Big Goals Into Tiny Crumbs</h1>
          <p className="tagline">
            Your AI-powered accountability partner — stay on track, stay motivated.
          </p>
          <div className="hero-cta">
            <Link className="cta-button" to="/signup">Get Started</Link>
            <span className="or"> or </span>
            <Link className="cta-button secondary" to="/login">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Short second horizontal scan line — quick benefits */}
      <section className="about-section">
        <h2>Why GoalCrumbs Works</h2>
        <ul className="benefits-list">
          <li>✅ Layered goals: subgoals, tasks, and microtasks</li>
          <li>✅ Daily reminders + weekly check-ins</li>
          <li>✅ Visual progress tracking</li>
          <li>✅ Telegram integration for nudges</li>
        </ul>
      </section>

      {/* Strong left column = mascots (vertical scan), right = how it works */}
      <section className="side-by-side-sections">
        <div className="team-section">
          <h2>Meet Your GoalCrumbs Team 🐾</h2>
          <div><img src="/owl.png" alt="Owl" /><p><strong>The Owl</strong> – sets up your goals with wisdom.</p></div>
          <div><img src="/mouse.png" alt="Mouse" /><p><strong>The Mouse</strong> – calm and nurturing guidance.</p></div>
          <div><img src="/sparrow.png" alt="Sparrow" /><p><strong>The Sparrow</strong> – positivity and encouragement.</p></div>
          <div><img src="/ant.png" alt="Ant" /><p><strong>The Ant</strong> – disciplined, detail-focused finisher.</p></div>
          <div><img src="/frog.png" alt="Frog" /><p><strong>The Frog</strong> – helps you take action.</p></div>
        </div>

        <div className="how-it-works-section">
          <h2>How It Works 🍰</h2>
          <div><img src="/cake.png" alt="Goal" /><p><strong>Goal:</strong> the whole cake — your mission.</p></div>
          <div><img src="/slice.png" alt="Subgoal" /><p><strong>Subgoal:</strong> one slice — a focused piece.</p></div>
          <div><img src="/crumbs.png" alt="Tasks" /><p><strong>Tasks:</strong> crumbs — the steps that lead to progress.</p></div>
        </div>
      </section>

      {/* Mid-page reinforcement */}
      <section className="dashboard-section">
        <h2>See Your Progress at a Glance</h2>
        <img className="dashboard-preview" src="/example-dashboard.png" alt="Dashboard preview" />
      </section>

      {/* Social proof */}
      <section className="testimonials-section">
        <h2>What Users Say</h2>
        <blockquote>★ ★ ★ ★ ★ "I've finally built momentum on my side project!" — Sarah L.</blockquote>
        <blockquote>★ ★ ★ ★ ☆ "The Telegram nudges are just what I needed." — Alex D.</blockquote>
      </section>

      {/* Bottom CTA */}
      <section className="final-cta-section">
        <h2>Ready to Get Started?</h2>
        <Link to="/signup" className="cta-button">Join GoalCrumbs Today</Link>
      </section>
    </div>
  );
};

export default LandingPage;