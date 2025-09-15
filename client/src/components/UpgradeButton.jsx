import { useState } from 'react';
import axios from '../api/axios';

export default function UpgradeButton({
  labelWhenPromo = 'Get Pro for £5/mo',
  labelStandard = 'Get Pro for £8.99/mo',
  promoActive,
}) {
  const [busy, setBusy] = useState(false);

  const startCheckout = async () => {
    try {
      setBusy(true);
      const { data } = await axios.post('/payments/checkout'); // your auth middleware attaches token
      if (data?.url) window.location.assign(data.url);
      else alert('Could not start checkout.');
    } catch (e) {
      alert(e?.response?.data?.error || 'Checkout failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="cta-button" onClick={startCheckout} disabled={busy}>
      {busy ? 'Redirecting…' : promoActive ? labelWhenPromo : labelStandard}
    </button>
  );
}
