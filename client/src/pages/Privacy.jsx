// src/pages/Privacy.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  const updated = '2025-01-01'; // ← keep this fresh when you edit

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-600 mb-8">Last updated: {updated}</p>

      <p className="mb-6">
        This Privacy Policy explains how GoalCrumbs (“we”, “us”, “our”) collects, uses, and shares
        information about you when you use our website and apps (the “Service”).
      </p>

      <h2 id="info-we-collect" className="text-xl font-semibold mt-8 mb-2">Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Account data:</strong> name, email, password hash (never your plain password).
        </li>
        <li>
          <strong>Usage data:</strong> goals, subgoals, tasks/microtasks you create, status/timestamps.
        </li>
        <li>
          <strong>Telegram:</strong> if you connect Telegram, we store your Telegram ID to send reminders.
        </li>
        <li>
          <strong>Payments:</strong> subscription information is processed by Stripe. We receive
          non‑sensitive metadata (e.g., customer ID, subscription status) but never your full card number.
        </li>
        <li>
          <strong>Device/Log data:</strong> IP address, browser type, and basic logs for security and debugging.
        </li>
        <li>
          <strong>Cookies & local storage:</strong> used for authentication (JWT/session) and preferences.
        </li>
      </ul>

      <h2 id="how-we-use" className="text-xl font-semibold mt-8 mb-2">How We Use Information</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Provide, maintain, and improve the Service</li>
        <li>Authenticate you and secure your account</li>
        <li>Send Telegram/Email reminders if enabled</li>
        <li>Process subscriptions and billing via Stripe</li>
        <li>Communicate updates, security notices, and support messages</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2 id="sharing" className="text-xl font-semibold mt-8 mb-2">Sharing</h2>
      <p className="mb-4">
        We don’t sell your personal information. We share limited data with:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Stripe</strong> (payments & subscriptions)
        </li>
        <li>
          <strong>Telegram</strong> (optional reminders to your chat ID)
        </li>
        <li>
          <strong>Service providers</strong> (hosting, monitoring, analytics) under contractual confidentiality
        </li>
        <li>
          Authorities if required by law or to protect rights and safety
        </li>
      </ul>

      <h2 id="retention" className="text-xl font-semibold mt-8 mb-2">Data Retention</h2>
      <p className="mb-4">
        We keep account and content data while your account is active. You can delete goals or your
        entire account at any time; we’ll remove personal data unless we must retain it for legal,
        billing, or security reasons. Backups roll off on a schedule.
      </p>

      <h2 id="security" className="text-xl font-semibold mt-8 mb-2">Security</h2>
      <p className="mb-4">
        We use industry standards (encryption in transit, hashed passwords, least‑privilege access).
        No method is 100% secure; please use a strong, unique password.
      </p>

      <h2 id="your-rights" className="text-xl font-semibold mt-8 mb-2">Your Rights</h2>
      <p className="mb-4">
        Depending on where you live (e.g., UK/EU), you may have rights to access, correct, export,
        delete, or object to certain processing of your personal data. Contact us to exercise these
        rights.
      </p>

      <h2 id="children" className="text-xl font-semibold mt-8 mb-2">Children</h2>
      <p className="mb-4">The Service isn’t intended for children under 13 (or 16 in the EEA).</p>

      <h2 id="changes" className="text-xl font-semibold mt-8 mb-2">Changes to this Policy</h2>
      <p className="mb-4">
        We may update this policy. We’ll post the updated version here with a new “Last updated” date.
      </p>

      <h2 id="contact" className="text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p className="mb-4">
        Questions? Email <a className="text-blue-600 underline" href="mailto:support@goalcrumbs.com">support@goalcrumbs.com</a>.
      </p>

      <p className="mt-10 text-sm">
        Also see our <Link to="/terms" className="text-blue-600 underline">Terms of Service</Link>.
      </p>
    </div>
  );
}