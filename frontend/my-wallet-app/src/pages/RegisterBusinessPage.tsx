// Goes to: frontend/my-wallet-app/src/pages/RegisterBusinessPage.tsx
import { useState } from 'react';
import RegistrationForm from '../RegistrationForm';
import type { RegistrationPayload } from '../RegistrationForm';
import { useWallet, isLikelySessionExpiry } from '../WalletContext';
import { encodeBusinessForm } from '../contract/codec';

export default function RegisterBusinessPage() {
  const { contractAPI } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: RegistrationPayload) => {
    if (!contractAPI) {
      const message = 'Wallet not connected to the contract yet.';
      setError(message);
      throw new Error(message);
    }

    // Throws a readable message if any field is over its byte limit, so nothing
    // is ever silently truncated. The form shows the message under the button.
    const form = encodeBusinessForm({
      name: payload.commitmentPreimage.name,
      description: payload.commitmentPreimage.description,
      contactInfo: payload.commitmentPreimage.contactInfo,
      sector: payload.sector,
      location: payload.location,
    });

    setSubmitting(true);
    setError(null);
    try {
      await contractAPI.setBusinessForm(form);
      if (payload.track === 'TRACK_A') {
        await contractAPI.registerBusinessTrackA(payload.sector, payload.location);
      } else {
        await contractAPI.registerBusinessTrackB(payload.sector, payload.location);
      }
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
      <RegistrationForm onSubmit={handleSubmit} submitting={submitting} />
    </>
  );
}
