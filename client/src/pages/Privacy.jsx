import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  const updated = '2025-01-01';

  return (
    <main className="page--legal">
      <div className="legal-card">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: {updated}</p>

        <p>
          This Privacy Policy explains how GoalCrumbs (“we”, “us”, “our”) collects, uses, and shares
          information about you when you use our website and apps (the “Service”).
        </p>

        <h2 className="legal-section-title">Information We Collect</h2>
        <ul className="legal-list">
          <li><strong>Account data:</strong> name, email, password hash (never your plain password).</li>
          <li><strong>Usage data:</strong> goals, subgoals, tasks/microtasks you create, status/timestamps.</li>
          <li><strong>Telegram:</strong> if you connect Telegram, we store your Telegram ID to send reminders.</li>
          <li><strong>Payments:</strong> processed by Stripe. We receive non-sensitive metadata (customer ID, subscription status) but never your full card number.</li>
          <li><strong>Device/Log data:</strong> IP address, browser type, and basic logs for security and debugging.</li>
          <li><strong>Cookies & local storage:</strong> used for authentication (JWT/session) and preferences.</li>
        </ul>

        <h2 className="legal-section-title">How We Use Information</h2>
        <ul className="legal-list">
          <li>Provide, maintain, and improve the Service</li>
          <li>Authenticate you and secure your account</li>
          <li>Send Telegram/Email reminders if enabled</li>
          <li>Process subscriptions and billing via Stripe</li>
          <li>Communicate updates, security notices, and support messages</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="legal-section-title">Sharing</h2>
        <p>We don’t sell your personal information. We share limited data with:</p>
        <ul className="legal-list">
          <li><strong>Stripe</strong> (payments & subscriptions)</li>
          <li><strong>Telegram</strong> (optional reminders)</li>
          <li><strong>Service providers</strong> (hosting, monitoring, analytics) under confidentiality agreements</li>
          <li>Authorities if required by law or to protect rights and safety</li>
        </ul>

        <h2 className="legal-section-title">Data Retention</h2>
        <p>
          We keep account and content data while your account is active. You can delete goals or your
          entire account at any time; we’ll remove personal data unless we must retain it for legal,
          billing, or security reasons. Backups roll off on a schedule.
        </p>

        <h2 className="legal-section-title">Security</h2>
        <p>
          We use industry standards (encryption in transit, hashed passwords, least-privilege access).
          No method is 100% secure; please use a strong, unique password.
        </p>

        <h2 className="legal-section-title">Your Rights</h2>
        <p>
          Depending on where you live (e.g., UK/EU), you may have rights to access, correct, export,
          delete, or object to certain processing of your personal data. Contact us to exercise these
          rights.
        </p>

        <h2 className="legal-section-title">Children</h2>
        <p>The Service isn’t intended for children under 13 (or 16 in the EEA).</p>

        <h2 className="legal-section-title">Changes to this Policy</h2>
        <p>We may update this policy. We’ll post the updated version here with a new “Last updated” date.</p>

        <h2 className="legal-section-title">Contact</h2>
        <p>
          Questions? Email <a className="legal-link" href="mailto:support@goalcrumbs.com">support@goalcrumbs.com</a>.
        </p>

        <p style={{ marginTop: '2rem' }}>
          Also see our <Link to="/terms" className="legal-link">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}