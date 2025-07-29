//LandingPage.jsx
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <h1>Welcome to GoalCrumbs 👋</h1>
        <p>Your AI-powered accountability partner. Break big goals into tiny, manageable crumbs — and actually get them done.</p>
        <p>
          <Link className="cta-button" to="/signup">Get Started</Link> or <Link className="cta-button" to="/login">Sign In</Link>
        </p>
      </section>

      {/* About Section */}
      <section className="about-section">
        <h2>What is GoalCrumbs?</h2>
        <p>
          GoalCrumbs helps you stop procrastinating by breaking large, overwhelming goals into bite-sized steps. 
          With smart nudges, visual progress, and check-ins, it's like having a project manager in your pocket.
        </p>
        <ul>
          <li>✅ Create layered goals with subgoals and microtasks</li>
          <li>✅ Get daily and weekly check-ins</li>
          <li>✅ Track progress and stay consistent</li>
          <li>✅ Connect to Telegram for nudges</li>
        </ul>
      </section>

      <section className="side-by-side-sections">
  <div className="team-section">
    <h2>Meet Your GoalCrumbs Team 🐾</h2>

  <div>
    <img src="/owl.png" alt="Owl" width="80" />
    <p><strong>The Owl</strong> helps you set up your goals with wisdom and clarity.</p>
  </div>

  <div>
    <img src="/mouse.png" alt="Mouse" width="80" />
    <p><strong>The Mouse</strong> offers calm and nurturing guidance.</p>
  </div>

  <div>
    <img src="/sparrow.png" alt="Sparrow" width="80" />
    <p><strong>The Sparrow</strong> brings positivity and encouragement.</p>
  </div>

  <div>
    <img src="/ant.png" alt="Ant" width="80" />
    <p><strong>The Ant</strong> is disciplined and detail-focused — your task finisher.</p>
  </div>

  <div>
    <img src="/frog.png" alt="Frog" width="80" />
    <p><strong>The Frog</strong> helps you take action and stay productive.</p>
  </div>
</div>

<div className="how-it-works-section">
  <h2>How GoalCrumbs Works 🍰</h2>

  <div>
    <img src="/cake.png" alt="Goal (Cake)" width="100" />
    <p><strong>Goal:</strong> Your big mission — the whole cake.</p>
  </div>

  <div>
    <img src="/slice.png" alt="Subgoal (Slice)" width="100" />
    <p><strong>Subgoal:</strong> A focused piece of the goal.</p>
  </div>

  <div>
    <img src="/crumbs.png" alt="Tasks (Crumbs)" width="100" />
    <p><strong>Tasks:</strong> Tiny steps — the crumbs that lead to progress.</p>
  </div>
  </div>
</section>

      {/* Placeholder Image Section */}
      <section>
        <h2>How it Works</h2>
        <img className="dashboard-preview" src="/example-dashboard.png" alt="Dashboard preview" />
        <p>(Placeholder image — you can replace this with your app's dashboard screenshot)</p>
      </section>

      {/* Testimonials */}
      <section>
        <h2>What Users Are Saying</h2>
        <p>★ ★ ★ ★ ★ <br />"I've finally built momentum on my side project!" - Sarah L.</p>
        <p>★ ★ ★ ★ ☆ <br />"The Telegram nudges are just what I needed." - Alex D.</p>
        <p>(More testimonials coming soon)</p>
      </section>

      {/* News / Updates */}
      <section>
        <h2>Latest Updates</h2>
        <ul>
          <li>📢 July 2025: Beta launch!</li>
          <li>🔧 August 2025: Mobile app development begins</li>
          <li>🌍 Telegram integration coming soon</li>
        </ul>
      </section>

      {/* Call to Action */}
      <section>
        <h2>Ready to take action?</h2>
        <Link to="/signup" className="cta-button">Join GoalCrumbs today</Link>
      </section>
    </div>
  );
};

export default LandingPage;