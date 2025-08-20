// src/pages/Terms.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  const updated = '2025-01-01';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-600 mb-8">Last updated: {updated}</p>

      <p className="mb-6">
        By accessing or using GoalCrumbs (the “Service”), you agree to these Terms. If you don’t
        agree, do not use the Service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Your Account</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>You are responsible for your account and for keeping your credentials secure.</li>
        <li>You must provide accurate information and be at least 13 (or 16 in the EEA).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Subscriptions & Billing</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Paid plans are billed via Stripe. Taxes may apply.</li>
        <li>Plans renew automatically until canceled. You can manage or cancel anytime via your Profile → Manage Subscription.</li>
        <li>Unless required by law, fees are non‑refundable; access continues until the end of the paid period.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Acceptable Use</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>No unlawful activity, abuse, reverse engineering, or interference with the Service.</li>
        <li>Respect intellectual property and others’ privacy.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Content</h2>
      <p className="mb-4">
        You own your content. You grant us a limited license to store and process it solely to
        operate the Service. You’re responsible for the legality of content you add.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Service Changes</h2>
      <p className="mb-4">
        We may update, suspend, or discontinue features. We’ll try to give notice of material changes
        where reasonable.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Disclaimers</h2>
      <p className="mb-4">
        The Service is provided “as is” without warranties. We don’t guarantee that goals will be
        achieved or that reminders will always be delivered (e.g., third‑party outages).
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Limitation of Liability</h2>
      <p className="mb-4">
        To the extent permitted by law, GoalCrumbs will not be liable for indirect, incidental,
        special, consequential, or punitive damages, or any loss of data, profits, or revenues.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Termination</h2>
      <p className="mb-4">
        You may stop using the Service at any time. We may suspend or terminate accounts for breach
        of these Terms or for misuse. Upon termination, your right to use the Service ends.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Governing Law</h2>
      <p className="mb-4">
        These Terms are governed by the laws of England & Wales (update if different for your business).
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">10. Contact</h2>
      <p className="mb-4">
        Questions about these Terms? Email <a className="text-blue-600 underline" href="mailto:legal@goalcrumbs.com">legal@goalcrumbs.com</a>.
      </p>

      <p className="mt-10 text-sm">
        See our <Link to="/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}