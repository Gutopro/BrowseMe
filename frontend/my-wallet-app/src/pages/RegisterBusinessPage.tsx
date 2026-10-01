import { useState } from 'react';
import RegistrationForm from '../RegistrationForm';
import type { RegistrationPayload } from '../RegistrationForm';
import type { BusinessForm } from '../../../../contracts/src/witnesses';
import { useWallet, isLikelySessionExpiry } from '../WalletContext';

function toBytes32(input: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(input).slice(0, 32));
  return bytes;
}
const emptyBytes32 = () => new Uint8Array(32);

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
    setSubmitting(true);
    setError(null);
    try {
      const form: BusinessForm = {
        name: toBytes32(payload.commitmentPreimage.name),
        description: toBytes32(payload.commitmentPreimage.description),
        contactInfo: emptyBytes32(),
        sector: toBytes32(payload.sector),
        location: toBytes32(payload.location),
      };
      await contractAPI.setBusinessForm(form);
      if (payload.track === 'TRACK_A') {
        await contractAPI.registerBusinessTrackA(payload.sector, payload.location);
      } else {
        await contractAPI.registerBusinessTrackB(payload.sector, payload.location);
      }
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
      <RegistrationForm onSubmit={handleSubmit} submitting={submitting} />
    </>
  );
}
