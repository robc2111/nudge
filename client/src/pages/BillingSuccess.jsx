// src/pages/BillingSuccess.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // ✅ no Link here
import axios from '../api/axios';
import { toast } from 'react-toastify';
import BrandButton from '../components/BrandButton';

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await axios.post('/payments/sync-plan');
        if (mounted) setSynced(true);
      } catch (e) {
        console.error(
          'Plan sync after checkout failed:',
          e?.response?.data || e.message
        );
        toast.info('Subscription created. It may take a moment to reflect.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return (
    <div className="billing-buttons" style={{ textAlign: 'center' }}>
      <h2>
        ✅ Thanks! Your subscription is {synced ? 'active' : 'being activated'}.
      </h2>
      <p>
        {synced
          ? 'Enjoy Pro features immediately.'
          : 'This will update shortly.'}
      </p>
      <BrandButton to="/profile">Back to Profile</BrandButton>
    </div>
  );
}
