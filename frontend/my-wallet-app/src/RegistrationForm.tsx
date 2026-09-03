import React, { useState } from 'react';
import './RegistrationForm.css';

// Mirrors contracts/main.compact:
//   export enum Track { TRACK_A, TRACK_B }
//   export circuit registerBusinessTrackA(businessCommitment, sector, location): Uint<64>
//   export circuit registerBusinessTrackB(businessCommitment, sector, location): Uint<64>
export type Track = 'TRACK_A' | 'TRACK_B';

export interface BusinessFormValues {
  track: Track;
  name: string;
  sector: string;
  location: string;
  description: string;
}

// What eventually gets passed to a ContractAPI call. `commitment` is a
// placeholder here — Stage 2 needs to hash the full private form (name +
// description + whatever else stays off-chain) into Bytes<32> before this
// is real. sector/location will also need Bytes<32> encoding at that point.
export interface RegistrationPayload {
  track: Track;
  sector: string;
  location: string;
  commitmentPreimage: Omit<BusinessFormValues, 'track' | 'sector' | 'location'>;
}

interface RegistrationFormProps {
  onSubmit?: (payload: RegistrationPayload) => void | Promise<void>;
  submitting?: boolean;
  onHome?: () => void; // optional — lets App.tsx wire a "Back to Home" button
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const SECTOR_OPTIONS = [
  'Food & Beverage',
  'Retail & Trade',
  'Services',
  'Manufacturing & Craft',
  'Technology',
  'Agriculture',
  'Other',
];

const emptyValues: BusinessFormValues = {
  track: 'TRACK_A',
  name: '',
  sector: '',
  location: '',
  description: '',
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, submitting = false, onHome }) => {
  const [values, setValues] = useState<BusinessFormValues>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessFormValues, string>>>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = <K extends keyof BusinessFormValues>(key: K, value: BusinessFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof BusinessFormValues, string>> = {};
    if (!values.name.trim()) next.name = 'Business name is required';
    if (!values.sector) next.sector = 'Pick a sector';
    if (!values.location.trim()) next.location = 'Location is required';
    if (values.description.trim().length < 20) {
      next.description = 'Give investors at least a couple sentences';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: RegistrationPayload = {
      track: values.track,
      sector: values.sector,
      location: values.location,
      commitmentPreimage: {
        name: values.name,
        description: values.description,
      },
    };

    setStatus('submitting');
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // Stage 2 will replace this with a ContractAPI call.
        console.log('registerBusiness payload (contract wiring not built yet):', payload);
      }
      setStatus('success');
      setValues(emptyValues);
    } catch (err) {
      setStatus('error');
      setSubmitError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  const isSubmitting = submitting || status === 'submitting';

  if (status === 'success') {
    return (
      <div className="bm-home">
        <section className="bm-section bm-reg">
          <div className="bm-success">
            <span className="bm-eyebrow-dark">Business registration</span>
            <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
              You're registered.
            </h1>
            <p className="bm-lede">
              {values.track === 'TRACK_A'
                ? 'Your business is now listed. Investors can discover it via your sector and location — your private details stay off-chain.'
                : "Your commitment is on-chain and pending community attestation. You'll be listed once the threshold clears."}
            </p>
            <div className="bm-cta-row">
              <button
                type="button"
                className="bm-btn bm-btn-primary"
                onClick={() => setStatus('idle')}
              >
                Register another business
              </button>
              {onHome && (
                <button type="button" className="bm-btn bm-btn-ghost" onClick={onHome}>
                  Back to Home
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bm-home">
      <section className="bm-section bm-reg">
        <div className="bm-reg-head">
          <span className="bm-eyebrow-dark">Business registration</span>
          <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
            List your business.
          </h1>
          <p className="bm-lede">
            Choose how you want to be discovered. Only your sector, location, and a
            commitment hash go on-chain — everything else stays with you until you
            shake on a deal.
          </p>
        </div>

        <form className="bm-reg-form" onSubmit={handleSubmit} noValidate>
          {/* ---- Track toggle ---- */}
          <fieldset className="bm-track-toggle">
            <legend className="bm-field-label">Registration track</legend>
            <div className="bm-track-options">
              <label className={`bm-track-option ${values.track === 'TRACK_A' ? 'bm-track-option--active' : ''}`}>
                <input
                  type="radio"
                  name="track"
                  value="TRACK_A"
                  checked={values.track === 'TRACK_A'}
                  onChange={() => setField('track', 'TRACK_A')}
                />
                <span className="bm-track-title">Track A — List now</span>
                <span className="bm-track-body">
                  Listed immediately once registered. No attestation required.
                </span>
              </label>
              <label className={`bm-track-option ${values.track === 'TRACK_B' ? 'bm-track-option--active' : ''}`}>
                <input
                  type="radio"
                  name="track"
                  value="TRACK_B"
                  checked={values.track === 'TRACK_B'}
                  onChange={() => setField('track', 'TRACK_B')}
                />
                <span className="bm-track-title">Track B — Build credibility</span>
                <span className="bm-track-body">
                  Stays unlisted until community attestations (incl. a union
                  attestation) clear the threshold.
                </span>
              </label>
            </div>
          </fieldset>

          {/* ---- Business name ---- */}
          <div className="bm-field">
            <label className="bm-field-label" htmlFor="reg-name">Business name</label>
            <input
              id="reg-name"
              className="bm-input"
              type="text"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Adaeze Textiles"
            />
            {errors.name && <span className="bm-field-error">{errors.name}</span>}
          </div>

          {/* ---- Sector / Location ---- */}
          <div className="bm-field-row">
            <div className="bm-field">
              <label className="bm-field-label" htmlFor="reg-sector">Sector</label>
              <select
                id="reg-sector"
                className="bm-input bm-select"
                value={values.sector}
                onChange={(e) => setField('sector', e.target.value)}
              >
                <option value="" disabled>Select a sector</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.sector && <span className="bm-field-error">{errors.sector}</span>}
            </div>

            <div className="bm-field">
              <label className="bm-field-label" htmlFor="reg-location">Location</label>
              <input
                id="reg-location"
                className="bm-input"
                type="text"
                value={values.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="e.g. Onitsha, Anambra"
              />
              {errors.location && <span className="bm-field-error">{errors.location}</span>}
            </div>
          </div>

          {/* ---- Description ---- */}
          <div className="bm-field">
            <label className="bm-field-label" htmlFor="reg-description">
              What does the business do?
            </label>
            <textarea
              id="reg-description"
              className="bm-input bm-textarea"
              value={values.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Stays private — hashed into your commitment, never shown publicly."
              rows={5}
            />
            <span className="bm-field-hint">
              Private — only investors you shake hands with will see this.
            </span>
            {errors.description && <span className="bm-field-error">{errors.description}</span>}
          </div>

          {submitError && (
            <div className="bm-field-error bm-submit-error" role="alert">
              {submitError}
            </div>
          )}

          <div className="bm-cta-row" style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="bm-btn bm-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering…' : 'Register business'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default RegistrationForm;
