// LandingPage.jsx
import SEO from '../seo/SEO';
import UpgradeButton from '../components/UpgradeButton';
import BrandButton from '../components/BrandButton';

const PROMO_DEADLINE_MS = new Date('2025-10-31T23:59:59Z').getTime();
const promoActive = Date.now() <= PROMO_DEADLINE_MS;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <SEO
        title="GoalCrumbs – Break big goals into tiny crumbs"
        description="AI accountability, Telegram nudges, weekly check-ins."
        image="/og/birdog.png"
        url="https://goalcrumbs.com/"
        keywords={[
          'goal tracking',
          'accountability app',
          'AI coach',
          'habit tracker',
          'Telegram reminders',
        ]}
      />

      <section className="hero-section">
        <div className="hero-left">
          <picture>
            <source
              srcSet="/images/logo-512.avif 2x, /images/logo-256.avif 1x"
              type="image/avif"
            />
            <source
              srcSet="/images/logo-512.webp 2x, /images/logo-256.webp 1x"
              type="image/webp"
            />
            <img
              src="/images/logo-256.webp"
              alt="GoalCrumbs logo"
              width="256"
              height="256"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="hero-image"
            />
          </picture>
        </div>
        <div className="hero-right">
          <h1>The Goal Tracking App That Makes Big Goals Feel Small</h1>
          <p>
            Your AI-powered accountability partner. Stay on track, stay
            motivated, achieve your goals.
          </p>
          <p>
            <BrandButton to="/signup">Get Started</BrandButton>{' '}
            <span style={{ margin: '0 6px' }}>or</span>{' '}
            <BrandButton to="/login">Sign In</BrandButton>
          </p>
        </div>
      </section>

      <section className="about-section">
        <h2>Why GoalCrumbs Works</h2>
        <ul className="benefits-list">
          <li>
            ✅ Big goals are no longer overwhelming. GoalCrumbs breaks your goal
            down into smaller, more manageable tasks.
          </li>
          <li>
            ✅ Not enough time for today&apos;s task? Break microtasks down even
            further on your dashboard. No more excuses.
          </li>
          <li>
            ✅ Do you forget or get distracted? Daily Telegram reminders can
            help keep you focused.
          </li>
          <li>✅ Track your progress to keep motivated.</li>
          <li>
            ✅ After you&apos;ve set up your goal, you can update progress and
            reflect on your progress using Telegram.
          </li>
          <li>
            ✅ Need to pivot? Edit your goal, while keeping your progress so
            far, and GoalCrumbs will generate new subgoals, tasks and microtasks
            to take you in a new direction.
          </li>
        </ul>
      </section>

      <section className="side-by-side-sections">
        <div className="how-it-works-section">
          <h2>How It Works 🍰</h2>
          <div>
            <picture>
              <source
                srcSet="/images/cake-240.avif 2x, /images/cake-120.avif 1x"
                type="image/avif"
              />
              <source
                srcSet="/images/cake-240.webp 2x, /images/cake-120.webp 1x"
                type="image/webp"
              />
              <img
                src="/images/cake-120.webp"
                alt="Goal"
                width="120"
                height="120"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <p>
              <strong>Goal:</strong> Describe your mission.
            </p>
          </div>
          <div>
            <img src="/slice.png" alt="Subgoal" />
            <p>
              <strong>Subgoal:</strong> We slice your goal into weekly
              milestones.
            </p>
          </div>
          <div>
            <img src="/crumbs.png" alt="Tasks" />
            <p>
              <strong>Tasks → Microtasks:</strong> Subgoals are broken down to
              smaller steps with daily reminders.
            </p>
          </div>
          <div>
            <img src="/ant.png" alt="Daily Reminders" />
            <p>
              <strong>Daily Reminders:</strong> The next steps toward your goal
              are sent to you daily via Telegram.
            </p>
            {/* Subtle helper for first-time users */}
            <p style={{ marginTop: 8, fontSize: '0.95rem' }}>
              Don&apos;t have Telegram?{' '}
              <a
                className="brand-link-dark"
                href="https://telegram.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Telegram
              </a>
              .
            </p>
          </div>

          <div className="faq-cta">
            <span>Want more details?</span>
            <BrandButton to="/faq">Read the FAQ</BrandButton>
          </div>
        </div>

        <div className="mx-auto max-w-screen-xl px-6 md:px-10 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            Track Your Progress at a Glance
          </h2>
          <picture>
            <source
              type="image/avif"
              srcSet="/images/dashboard-400.avif 400w, /images/dashboard-800.avif 800w, /images/dashboard-1600.avif 1600w"
            />
            <source
              type="image/webp"
              srcSet="/images/dashboard-400.webp 400w, /images/dashboard-800.webp 800w, /images/dashboard-1600.webp 1600w"
            />
            <img
              src="/images/dashboard-800.webp"
              alt="GoalCrumbs AI accountability app dashboard"
              width="1600"
              height="1000" // use your real aspect if you know it
              loading="lazy"
              decoding="async"
              className="mx-auto mt-6 rounded-2xl shadow-md w-full max-w-5xl"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 80vw, 800px"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </picture>
          <p>
            Visit the dashboard to view your goal in detail and the progress you
            have made so far.
          </p>
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
              <li>✅ Tasks &amp; microtasks with progress</li>
              <li>✅ Daily reminders + weekly check-ins (Telegram)</li>
            </ul>
            <BrandButton to="/signup">Start Free Plan</BrandButton>
          </div>

          <div className="pricing-card">
            <h3>Pro</h3>
            <p className="tagline">Unlimited goals + personalised messages</p>

            <p style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
              {promoActive ? (
                <>
                  <span
                    style={{ textDecoration: 'line-through', opacity: 0.6 }}
                  >
                    £8.99
                  </span>{' '}
                  <strong>£5.00</strong> <span>/ month</span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.95rem',
                      marginTop: 6,
                    }}
                  >
                    Limited offer — subscribe by <strong>31 Oct</strong> to lock
                    this price.
                  </span>
                </>
              ) : (
                <>
                  <strong>£8.99</strong> <span>/ month</span>
                </>
              )}
            </p>

            <ul className="benefits-list">
              <li>
                ✅ <strong>Unlimited goals</strong>
              </li>
              <li>
                ✅ <strong>Flexible reminders</strong>
              </li>
            </ul>

            <div style={{ marginTop: '1rem' }}>
              {/* use the Upgrade button so the server decides which price to use */}
              <UpgradeButton promoActive={promoActive} />
              <BrandButton to="/login" style={{ marginLeft: 8 }}>
                I already have an account
              </BrandButton>
            </div>

            <p className="tagline">
              Start free. Upgrade anytime — your data stays.
            </p>
          </div>
        </div>

        <p
          className="tagline"
          style={{ marginTop: '1rem', textAlign: 'center' }}
        >
          Free plan includes your first goal fully. Create more goals by
          upgrading to Pro.
        </p>
      </section>
    </div>
  );
}
