import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  // Force top on mount and focus #main for a11y (without scrolling)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const main = document.getElementById('main');
    if (main?.focus) main.focus({ preventScroll: true });
  }, []);

  const updated = '2025-01-01';

  return (
    <main className="page--legal">
      <div className="legal-card">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: {updated}</p>

        <p>
          This Privacy Policy explains how GoalCrumbs (“we”, “us”, “our”)
          collects, uses, and shares information about you when you use our
          website and apps (the “Service”).
        </p>

        <h2 className="legal-section-title">Information We Collect</h2>
        <ul className="legal-list">
          <li>
            <strong>Account data:</strong> name, email, and password hash (never
            your plain password).
          </li>
          <li>
            <strong>Usage data:</strong> goals, subgoals, tasks/microtasks you
            create, status, timestamps, and related in-app activity.
          </li>
          <li>
            <strong>Telegram (optional):</strong> if you connect Telegram, we
            store your Telegram ID to send reminders you request.
          </li>
          <li>
            <strong>Payments:</strong> processed by Stripe. We receive
            non-sensitive metadata (e.g., customer ID, subscription status) but
            never your full card number.
          </li>
          <li>
            <strong>Device/Log data:</strong> IP address, browser type, and
            basic logs for security and debugging.
          </li>
          <li>
            <strong>Cookies, local storage &amp; similar technologies</strong>:
            see the dedicated section below for details and your choices.
          </li>
        </ul>

        <h2 id="cookies" className="legal-section-title">
          Cookies, local storage &amp; similar technologies
        </h2>
        <p>
          We use these technologies for <strong>strictly necessary</strong>{' '}
          purposes (e.g., authentication, security, fraud prevention,
          remembering required settings) and, if enabled, for{' '}
          <strong>optional</strong> purposes (e.g., analytics and preference
          storage).
        </p>
        <ul className="legal-list">
          <li>
            <strong>Necessary</strong> (always on): session/auth tokens,
            security, service reliability.
          </li>
          <li>
            <strong>Optional</strong> (consent-based where required): analytics
            to understand usage and improve the Service, and additional
            preference storage.
          </li>
        </ul>
        <p>
          Where required by law, we request your consent before setting
          non-essential cookies or similar technologies. You can withdraw your
          consent at any time by clearing cookies/local storage or adjusting
          your browser settings. Doing so may affect some features.
        </p>
        <p>
          If we use third-party analytics, those providers may set their own
          cookies subject to their privacy policies. We will identify such
          providers in this policy or within the product and reflect any changes
          in our cookie banner.
        </p>

        <h2 className="legal-section-title">How We Use Information</h2>
        <ul className="legal-list">
          <li>Provide, maintain, and improve the Service</li>
          <li>Authenticate you and secure your account</li>
          <li>Send Telegram or email reminders if enabled by you</li>
          <li>Process subscriptions and billing via Stripe</li>
          <li>Communicate updates, security notices, and support messages</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="legal-section-title">Sharing</h2>
        <p>
          We don’t sell your personal information. We share limited data with:
        </p>
        <ul className="legal-list">
          <li>
            <strong>Stripe</strong> (payments &amp; subscriptions)
          </li>
          <li>
            <strong>Telegram</strong> (optional reminders)
          </li>
          <li>
            <strong>Service providers</strong> (hosting, logging/monitoring,
            analytics, email delivery) bound by confidentiality and
            data-processing terms
          </li>
          <li>Authorities where required by law or to protect rights/safety</li>
        </ul>

        <h2 className="legal-section-title">Data Retention</h2>
        <p>
          We keep account and content data while your account is active. You can
          delete goals or your account at any time; we remove personal data
          unless we must retain it for legal, billing, or security reasons.
          Backups roll off on a schedule.
        </p>

        <h2 className="legal-section-title">Security</h2>
        <p>
          We use industry standards (encryption in transit, hashed passwords,
          least-privilege access). No method is 100% secure; please use a
          strong, unique password.
        </p>

        <h2 className="legal-section-title">Legal bases (EU/UK)</h2>
        <p>
          Where the GDPR/UK GDPR applies, we process personal data based on:
        </p>
        <ul className="legal-list">
          <li>
            <strong>Contract</strong> (Art. 6(1)(b)): to provide the Service you
            request.
          </li>
          <li>
            <strong>Legitimate interests</strong> (Art. 6(1)(f)): securing and
            improving the Service, preventing fraud/abuse, customer support. We
            balance these interests against your rights and expectations.
          </li>
          <li>
            <strong>Legal obligation</strong> (Art. 6(1)(c)): compliance with
            applicable laws and accounting rules.
          </li>
          <li>
            <strong>Consent</strong> (Art. 6(1)(a)): for optional cookies/
            analytics and similar technologies where required. You can withdraw
            consent at any time.
          </li>
        </ul>

        <h2 className="legal-section-title">International transfers (EU/UK)</h2>
        <p>
          We may transfer personal data to countries that may not provide the
          same level of data protection as your jurisdiction. Where we do so, we
          rely on appropriate safeguards such as the European Commission’s/UK
          ICO’s Standard Contractual Clauses and implement additional measures
          as needed.
        </p>

        <h2 className="legal-section-title">Your Rights</h2>
        <p>
          Depending on your location (e.g., UK/EU), you may have rights to
          access, correct, export, delete, or object to certain processing of
          your personal data, and to withdraw consent where processing is based
          on consent. Contact us to exercise these rights. You also have the
          right to lodge a complaint with your data protection authority.
        </p>

        <h2 className="legal-section-title">Children</h2>
        <p>
          The Service isn’t intended for children under 13 (or 16 in the EEA).
        </p>

        <h2 className="legal-section-title">Changes to this Policy</h2>
        <p>
          We may update this policy from time to time. We’ll post the updated
          version here with a new “Last updated” date, and if changes are
          material we’ll notify you in-app or by email.
        </p>

        <h2 className="legal-section-title">Contact</h2>
        <p>
          Questions or requests? Email{' '}
          <a className="legal-link" href="mailto:support@goalcrumbs.com">
            support@goalcrumbs.com
          </a>
          .
        </p>

        <p style={{ marginTop: '2rem' }}>
          Also see our{' '}
          <Link to="/terms" className="legal-link">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
