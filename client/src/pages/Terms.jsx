import React, { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../seo/SEO';

export default function Terms() {
  // Force top on mount and focus #main for a11y (without scrolling)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const main = document.getElementById('main');
    if (main?.focus) main.focus({ preventScroll: true });
  }, []);

  const updated = '2025-09-22';

  return (
    <main id="main" tabIndex="-1" className="page--legal">
      <SEO
        title="Terms of Service – GoalCrumbs"
        description="The terms that apply when you use GoalCrumbs."
        image="/og/birdog.png"
        keywords={[
          'terms of service',
          'legal',
          'accountability app',
          'goal tracking',
          'habit tracker',
        ]}
        url="https://goalcrumbs.com/terms"
      />
      <div className="legal-card">
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: {updated}</p>

        <p>
          By accessing or using GoalCrumbs (the “Service”), you agree to these
          Terms. If you don&apos;t agree, do not use the Service.
        </p>

        <h2 className="legal-section-title">1. Your Account</h2>
        <ul className="legal-list">
          <li>
            You are responsible for your account and for keeping your
            credentials secure.
          </li>
          <li>
            You must provide accurate information and be at least 13 (or 16 in
            the EEA).
          </li>
        </ul>

        <h2 className="legal-section-title">2. Subscriptions & Billing</h2>
        <ul className="legal-list">
          <li>Paid plans are billed via Stripe. Taxes may apply.</li>
          <li>
            Plans renew automatically until canceled. You can manage or cancel
            anytime via Profile → Manage Subscription.
          </li>
          <li>
            Unless required by law, fees are non-refundable; access continues
            until the end of the paid period.
          </li>
        </ul>

        <h2 className="legal-section-title">3. Acceptable Use</h2>
        <ul className="legal-list">
          <li>
            No unlawful activity, abuse, reverse engineering, or interference
            with the Service.
          </li>
          <li>Respect intellectual property and others&apos; privacy.</li>
        </ul>

        <h2 className="legal-section-title">4. Content</h2>
        <p>
          You own your content. You grant us a limited license to store and
          process it solely to operate the Service. You are responsible for the
          legality of content you add.
        </p>

        <h2 className="legal-section-title">5. Service Changes</h2>
        <p>
          We may update, suspend, or discontinue features. We will provide
          notice of material changes where reasonable.
        </p>

        <h2 className="legal-section-title">6. AI Services</h2>
        <p>
          Some features (including goal breakdowns, reminders, and weekly
          check-ins) may use third-party artificial intelligence services
          (currently OpenAI’s API). By using these features, you consent to
          limited context (e.g., goal titles, subgoals, or reflection text)
          being sent to those services to generate responses. We do not
          guarantee the accuracy, reliability, or appropriateness of
          AI-generated content.
        </p>

        <h2 className="legal-section-title">7. Plan Limits</h2>
        <p>
          Free accounts include one active goal with reminders. Pro accounts
          include unlimited active goals and additional features. We may enforce
          limits to prevent abuse and ensure fair use.
        </p>

        <h2 className="legal-section-title">8. Disclaimers</h2>
        <p>
          The Service is provided “as is” without warranties. We do not
          guarantee that goals will be achieved or that reminders will always be
          delivered.
        </p>
        <p>
          The Service relies on third-party providers (e.g., Telegram for
          messaging, Stripe for billing). Outages or changes in those services
          may affect functionality, and we are not responsible for their
          availability.
        </p>

        <h2 className="legal-section-title">9. Limitation of Liability</h2>
        <p>
          To the extent permitted by law, GoalCrumbs will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or
          any loss of data, profits, or revenues.
        </p>

        <h2 className="legal-section-title">10. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate accounts for breach of these Terms or for misuse. Upon
          termination, your right to use the Service ends.
        </p>

        <h2 className="legal-section-title">11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of England & Wales (update if
          different for your business).
        </p>

        <h2 className="legal-section-title">12. Contact</h2>
        <p>
          Questions? Email{' '}
          <a className="legal-link" href="mailto:support@goalcrumbs.com">
            support@goalcrumbs.com
          </a>
          .
        </p>

        <p style={{ marginTop: '2rem' }}>
          See our{' '}
          <Link to="/privacy" className="legal-link">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
