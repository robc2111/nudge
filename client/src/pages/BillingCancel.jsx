// BillingCancel.jsx
import { Link } from 'react-router-dom';

export default function BillingCancel() {
  return (
    <div className="profile-buttons">
      <h2>❌ Checkout canceled</h2>
      <p>No worries. You can upgrade any time.</p>
      <Link to="/profile" className="btn">
        Back to Profile
      </Link>
    </div>
  );
}
