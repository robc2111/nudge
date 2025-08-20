// BillingSuccess.jsx
// src/pages/BillingSuccess.jsx
import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  useEffect(() => {
    console.log('Checkout session:', sessionId);
  }, [sessionId]);

  return (
    <div className="p-8">
      <h2>✅ Thanks! Your subscription is active.</h2>
      <p>Enjoy Pro features immediately.</p>
      <Link to="/profile" className="cta-button">Go to Profile</Link>
    </div>
  );
}