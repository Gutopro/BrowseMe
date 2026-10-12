import { useState } from 'react';
import InvestorRegistrationForm from '../InvestorRegistrationForm';
import type { InvestorRegistrationPayload } from '../InvestorRegistrationForm';
import { useWallet, isLikelySessionExpiry } from '../WalletContext';
import { encodeInvestorForm } from '../contract/codec';

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

    // Throws a readable message if any field is over its byte limit, instead of
    // silently cutting it. Done before the try so the message reaches the form.
    const { name, region, businessId, taxId } = payload.commitmentPreimage;
    const form = encodeInvestorForm({ name, region, businessId, taxId });

    setSubmitting(true);
    setError(null);
    try {
      await contractAPI.setInvestorForm(form);
      await contractAPI.registerInvestor();
    } catch (err) {
      setError(
        isLikelySessionExpiry(err)
          ? 'Your wallet session expired — please reconnect and try again.'
          : 'Registration failed — check the console for details.',
      );
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
