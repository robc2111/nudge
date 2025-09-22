import BrandButton from '../components/BrandButton';

export default function BillingCancel() {
  return (
    <div className="billing-buttons">
      <h2>❌ Checkout canceled</h2>
      <p>No worries. You can upgrade any time.</p>
      <BrandButton to="/profile" variant="solid">
        Back to Profile
      </BrandButton>
    </div>
  );
}
