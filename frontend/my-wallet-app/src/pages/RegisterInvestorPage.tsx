import { useState } from 'react';
import InvestorRegistrationForm from '../InvestorRegistrationForm';
import type { InvestorRegistrationPayload } from '../InvestorRegistrationForm';
import type { InvestorForm } from '../../../../contracts/src/witnesses';
import { useWallet, isLikelySessionExpiry } from '../WalletContext';

function toBytes32(input: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(input).slice(0, 32));
  return bytes;
}

export default function RegisterInvestorPage() {
  const { contractAPI } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: InvestorRegistrationPayload) => {
    if (!contractAPI) {
      const message = 'Wallet not connected to the contract yet.';
      setError(message);
      throw new Error(message);
    }
    setSubmitting(true);
    setError(null);
    try {
      const { name, region, businessId, taxId } = payload.commitmentPreimage;
      const form: InvestorForm = {
        name: toBytes32(name),
        region: toBytes32(region),
        businessId: toBytes32(businessId),
        taxId: toBytes32(taxId),
      };
      await contractAPI.setInvestorForm(form);
      await contractAPI.registerInvestor();
    } catch (err) {
      setError(isLikelySessionExpiry(err) ? 'Your wallet session expired — please reconnect and try again.' : 'Registration failed — check the console for details.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {error && <p className="bm-field-error" style={{ marginBottom: '1rem' }}>{error}</p>}
      <InvestorRegistrationForm onSubmit={handleSubmit} submitting={submitting} />
    </>
  );
}
