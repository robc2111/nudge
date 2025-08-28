// src/pages/BillingSuccess.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Ask backend to re-sync plan and enforce limits (idempotent)
        await axios.post('/payments/sync-plan');
        // Optionally refresh cached user in localStorage if you store it:
        // const { data } = await axios.get('/users/me');
        // localStorage.setItem('user', JSON.stringify(data));
        if (mounted) setSynced(true);
      } catch (e) {
        console.error('Plan sync after checkout failed:', e?.response?.data || e.message);
        toast.info('Subscription created. It may take a moment to reflect.');
      }
    })();

    return () => { mounted = false; };
  }, [sessionId]);

  return (
    <div className="p-8" style={{ textAlign: 'center' }}>
      <h2>✅ Thanks! Your subscription is {synced ? 'active' : 'being activated'}.</h2>
      <p>{synced ? 'Enjoy Pro features immediately.' : 'This will update shortly.'}</p>
      <Link to="/profile" className="cta-button">Go to Profile</Link>
    </div>
  );
}