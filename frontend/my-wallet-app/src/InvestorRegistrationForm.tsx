import React, { useState } from 'react';
import './RegistrationForm.css';

// Mirrors contracts/main.compact:
//   export circuit registerInvestor(investorCommitment: Bytes<32>): Bytes<32>
//
// Unlike business registration, registerInvestor takes a single opaque
// commitment — there are no publicly-disclosed fields on this circuit.
// Everything the investor enters here stays private and only ever leaves
// the browser as a hash (the commitment). Stage 2 needs to replace
// `commitmentPreimage` with a real Bytes<32> hash before this is wired to
// ContractAPI.

export interface InvestorFormValues {
  name: string;        // company / business / investor name
  region: string;
  businessId: string;
  taxId: string;
}

// What eventually gets passed to a ContractAPI.registerInvestor call.
// `investorCommitment` is a placeholder here — Stage 2 needs to hash
// commitmentPreimage into Bytes<32> before this is real.
export interface InvestorRegistrationPayload {
  commitmentPreimage: InvestorFormValues;
}

interface InvestorRegistrationFormProps {
  onSubmit?: (payload: InvestorRegistrationPayload) => void | Promise<void>;
  submitting?: boolean;
  onHome?: () => void; // optional — lets App.tsx wire a "Back to Home" button
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const emptyValues: InvestorFormValues = {
  name: '',
  region: '',
  businessId: '',
  taxId: '',
};

const InvestorRegistrationForm: React.FC<InvestorRegistrationFormProps> = ({
  onSubmit,
  submitting = false,
  onHome,
}) => {
  const [values, setValues] = useState<InvestorFormValues>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<keyof InvestorFormValues, string>>>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = <K extends keyof InvestorFormValues>(key: K, value: InvestorFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof InvestorFormValues, string>> = {};
    if (!values.name.trim()) next.name = 'Name is required';
    if (!values.region.trim()) next.region = 'Region is required';
    if (!values.businessId.trim()) next.businessId = 'Business ID is required';
    if (!values.taxId.trim()) next.taxId = 'Tax ID is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: InvestorRegistrationPayload = {
      commitmentPreimage: { ...values },
    };

    setStatus('submitting');
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // Stage 2 will replace this with a ContractAPI.registerInvestor call.
        console.log('registerInvestor payload (contract wiring not built yet):', payload);
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
            <span className="bm-eyebrow-dark">Investor registration</span>
            <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
              You're registered.
            </h1>
            <p className="bm-lede">
              Your commitment is on-chain under your wallet address. None of your
              details are public — businesses only see them if you shake on a deal.
            </p>
            <div className="bm-cta-row">
              <button
                type="button"
                className="bm-btn bm-btn-primary"
                onClick={() => setStatus('idle')}
              >
                Register another investor profile
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
          <span className="bm-eyebrow-dark">Investor registration</span>
          <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
            Register as an investor.
          </h1>
          <p className="bm-lede">
            Nothing below goes on-chain in the clear — it's hashed into a single
            commitment tied to your wallet address. You'll only reveal these
            details to a business once you shake hands with them.
          </p>
        </div>

        <form className="bm-reg-form" onSubmit={handleSubmit} noValidate>
          {/* ---- Name ---- */}
          <div className="bm-field">
            <label className="bm-field-label" htmlFor="inv-name">
              Company / business / investor name
            </label>
            <input
              id="inv-name"
              className="bm-input"
              type="text"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Adaeze Capital Partners"
            />
            {errors.name && <span className="bm-field-error">{errors.name}</span>}
          </div>

          {/* ---- Region / Business ID ---- */}
          <div className="bm-field-row">
            <div className="bm-field">
              <label className="bm-field-label" htmlFor="inv-region">Region</label>
              <input
                id="inv-region"
                className="bm-input"
                type="text"
                value={values.region}
                onChange={(e) => setField('region', e.target.value)}
                placeholder="e.g. South East, Nigeria"
              />
              {errors.region && <span className="bm-field-error">{errors.region}</span>}
            </div>

            <div className="bm-field">
              <label className="bm-field-label" htmlFor="inv-business-id">Business ID</label>
              <input
                id="inv-business-id"
                className="bm-input"
                type="text"
                value={values.businessId}
                onChange={(e) => setField('businessId', e.target.value)}
                placeholder="Registration / CAC number"
              />
              {errors.businessId && <span className="bm-field-error">{errors.businessId}</span>}
            </div>
          </div>

          {/* ---- Tax ID ---- */}
          <div className="bm-field">
            <label className="bm-field-label" htmlFor="inv-tax-id">Tax ID</label>
            <input
              id="inv-tax-id"
              className="bm-input"
              type="text"
              value={values.taxId}
              onChange={(e) => setField('taxId', e.target.value)}
              placeholder="TIN"
            />
            <span className="bm-field-hint">
              Private — hashed into your commitment, never shown publicly.
            </span>
            {errors.taxId && <span className="bm-field-error">{errors.taxId}</span>}
          </div>

          {submitError && (
            <div className="bm-field-error bm-submit-error" role="alert">
              {submitError}
            </div>
          )}

          <div className="bm-cta-row" style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="bm-btn bm-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering…' : 'Register as investor'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default InvestorRegistrationForm;
