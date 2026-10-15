// Goes to: frontend/my-wallet-app/src/pages/AttestPage.tsx
//
// Route: /businesses/:id/attest
// One Track B business. Anyone can attest for it by submitting an identity
// form; the business owner also sees who has attested, with their details
// decrypted here and checked against the on-chain commitments.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWallet, isLikelySessionExpiry } from '../WalletContext';
import { AttesterCategory, ATTESTER_LABELS } from '../contract/common-types';
import {
  attestBusinessFrom,
  type AttestBusinessView,
  type AttesterListing,
  type DetailField,
} from '../contract/ContractAPI';
import { byteLength, encodeAttesterForm } from '../contract/codec';
import { FORM_LIMITS } from '../../../../contracts/src/witnesses';
import './BrowsePage.css';
import './DealsPage.css';
import './DetailsPage.css';
import '../RegistrationForm.css';

const MAX_ATTESTATIONS = 4;
const MIN_PASSPHRASE = 12;

const CATEGORIES = [
  { label: 'Community leader or association', value: AttesterCategory.Community },
  { label: 'Religious body', value: AttesterCategory.Religious },
  { label: 'Trade union', value: AttesterCategory.Union },
  { label: 'Educational institution', value: AttesterCategory.Education },
];

const FIELDS = [
  { key: 'name', label: 'Full name', limit: FORM_LIMITS.name, placeholder: 'Your full name' },
  { key: 'organisation', label: 'Organisation', limit: FORM_LIMITS.organisation, placeholder: 'e.g. Onitsha Traders Union' },
  { key: 'position', label: 'Role or position', limit: FORM_LIMITS.position, placeholder: 'e.g. Secretary' },
  { key: 'contactInfo', label: 'Contact', limit: FORM_LIMITS.contactInfo, placeholder: 'Email, phone or WhatsApp' },
  { key: 'registrationId', label: 'Registration or ID number', limit: FORM_LIMITS.registrationId, placeholder: 'Union, church or school registration number' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

const emptyValues: Record<FieldKey, string> = {
  name: '',
  organisation: '',
  position: '',
  contactInfo: '',
  registrationId: '',
};

const clean = (value: string) => value.trim() || 'Unspecified';
const typeLabel = (type: number) => (type >= 0 && type < ATTESTER_LABELS.length ? ATTESTER_LABELS[type] : 'Unknown');

// The attester's identity secret never leaves this browser. It is derived from
// the passphrase, so the same passphrase always gives the same identity.
async function secretFromPassphrase(passphrase: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(`browseme-attester-v1:${passphrase}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

function FieldList({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="bm-details-fields">
      {fields.map((f) => (
        <div key={f.label} className="bm-details-item">
          <dt>{f.label}</dt>
          <dd className={f.value ? '' : 'is-empty'}>{f.value || 'Not provided'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AttestPage() {
  const { id } = useParams<{ id: string }>();
  const { contractAPI, connect, connecting, connectionError, contractError } = useWallet();

  const businessId = useMemo(() => (id && /^\d+$/.test(id) ? BigInt(id) : null), [id]);

  // undefined = still loading, null = not found / not a Track B business
  const [view, setView] = useState<AttestBusinessView | null | undefined>(undefined);
  const [listing, setListing] = useState<AttesterListing | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [values, setValues] = useState<Record<FieldKey, string>>(emptyValues);
  const [category, setCategory] = useState(String(AttesterCategory.Union));
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. Subscribe to this business.
  useEffect(() => {
    if (!contractAPI || businessId === null) {
      setView(undefined);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const caller = await contractAPI.getCallerAddress();
        if (cancelled) return;
        const sub = attestBusinessFrom(contractAPI.state$, businessId, caller).subscribe({
          next: (next) => {
            setView(next);
            setStreamError(null);
          },
          error: (err) => {
            console.error('[AttestPage] stream error', err);
            setStreamError('Could not load this business from the indexer.');
          },
        });
        unsubscribe = () => sub.unsubscribe();
      } catch (err) {
        console.error('[AttestPage] failed before subscribing', err);
        if (!cancelled) setStreamError(err instanceof Error ? err.message : 'Could not load this business.');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [contractAPI, businessId]);

  // 2. Owner only: decrypt and verify the attesters' details.
  const recordsKey = view ? view.records.map((r) => r.id).join(',') : '';
  const isOwner = !!view && view.isOwner;
  useEffect(() => {
    if (!contractAPI || !view || !view.isOwner) {
      setListing(null);
      return;
    }
    let cancelled = false;
    contractAPI
      .openAttesters(view.ownerKey, view.records)
      .then((result) => {
        if (!cancelled) setListing(result);
      })
      .catch((err) => {
        console.error('[AttestPage] could not open attesters', err);
        if (!cancelled) setListing({ problem: 'Could not read the attester details.', entries: [] });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAPI, isOwner, recordsKey]);

  const setField = (key: FieldKey, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/businesses/${id}/attest`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable: the address bar still has the link
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contractAPI || !view) return;
    setError(null);
    setDone(false);

    if (!view.ownerKey) {
      setError('This business was registered before attester details existed, so it can’t take new attestations.');
      return;
    }
    for (const f of FIELDS) {
      if (!values[f.key].trim()) {
        setError(`${f.label} is required.`);
        return;
      }
      const used = byteLength(values[f.key]);
      if (used > f.limit) {
        setError(`${f.label} is too long: ${used} of ${f.limit} bytes.`);
        return;
      }
    }
    if (passphrase.length < MIN_PASSPHRASE) {
      setError(`Use a passphrase of at least ${MIN_PASSPHRASE} characters.`);
      return;
    }

    setBusy(true);
    try {
      const form = encodeAttesterForm(values);
      const identitySecret = await secretFromPassphrase(passphrase);
      await contractAPI.submitAttestation(
        view.businessId,
        Number(category) as AttesterCategory,
        form,
        view.ownerKey,
        identitySecret,
      );
      setDone(true);
      setValues(emptyValues);
      setPassphrase('');
    } catch (err) {
      console.error(err);
      setError(
        isLikelySessionExpiry(err)
          ? 'Your wallet session expired. Please reconnect and try again.'
          : 'The attestation was rejected. This identity may already have attested for this business, or the business may already have 4 attestations. Check the console for details.',
      );
    } finally {
      setBusy(false);
    }
  };

  const notice = streamError ?? contractError ?? connectionError;
  const full = !!view && view.attestationCount >= MAX_ATTESTATIONS;

  return (
    <div className="bm-home">
      <header className="bm-browse-head">
        <span className="bm-eyebrow-dark">Attestation</span>
        <h1 className="bm-h2">Vouch for a Track B business</h1>
        <p className="bm-browse-sub">
          A Track B business is listed once it has two attestations, one of them from a union. Each attester
          submits an identity form. Only a commitment to it goes on-chain; the details themselves are encrypted
          to the business owner.
        </p>
      </header>

      {notice && <p className="bm-browse-error" role="alert">{notice}</p>}

      {businessId === null && (
        <div className="bm-browse-empty">
          <p>This isn’t a valid business link.</p>
          <Link to="/businesses" className="bm-btn bm-btn-ghost">Browse listings</Link>
        </div>
      )}

      {businessId !== null && !contractAPI && (
        <div className="bm-browse-empty">
          <p>Connect your wallet to see this business.</p>
          <button
            type="button"
            className="bm-btn bm-btn-primary"
            onClick={() => void connect()}
            disabled={connecting}
          >
            {connecting ? 'Connecting… check your wallet' : 'Connect wallet'}
          </button>
        </div>
      )}

      {businessId !== null && contractAPI && !streamError && view === undefined && (
        <p className="bm-browse-status">Loading business…</p>
      )}

      {businessId !== null && contractAPI && view === null && (
        <div className="bm-browse-empty">
          <p>We couldn’t find a Track B business with this ID.</p>
          <Link to="/deals" className="bm-btn bm-btn-ghost">Back to Deals</Link>
        </div>
      )}

      {contractAPI && view && (
        <>
          <div className="bm-details-summary">
            <div className="bm-listing-top">
              <span className="bm-listing-id">#{view.businessId.toString()} · Track B</span>
              <span className={`bm-status bm-status--${view.listed ? 'open' : 'investing'}`}>
                {view.listed ? 'Listed' : 'Not listed yet'}
              </span>
            </div>
            <h2 className="bm-listing-sector">{clean(view.sector)}</h2>
            <p className="bm-listing-location">{clean(view.location)}</p>

            <div
              className="bm-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={MAX_ATTESTATIONS}
              aria-valuenow={view.attestationCount}
              aria-label="Attestations received"
            >
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < view.attestationCount ? 'is-filled' : ''} />
              ))}
            </div>
            <ul className="bm-checklist">
              <li className={view.attestationCount >= 2 ? 'is-done' : ''}>
                {view.attestationCount} of {MAX_ATTESTATIONS} attestations
                {view.tier > 0 ? ` · Tier ${view.tier}` : ''}
              </li>
              <li className={view.hasUnion ? 'is-done' : ''}>
                Union attestation {view.hasUnion ? 'received' : 'required'}
              </li>
            </ul>
            <Link to="/deals" className="bm-details-back">← Back to Deals</Link>
          </div>

          {/* ---- Owner: who has attested ---- */}
          {view.isOwner && (
            <section className="bm-details-panel" style={{ marginBottom: '1.25rem' }} aria-labelledby="owner-title">
              <h3 id="owner-title" className="bm-details-title">Your attesters</h3>
              <p className="bm-details-sub">
                Decrypted in this browser and checked against each attestation’s on-chain commitment. Share the
                link below with the people or organisations you want to vouch for you.
              </p>
              <button type="button" className="bm-btn bm-btn-ghost" onClick={() => void copyLink()}>
                {copied ? 'Link copied' : 'Copy attestation link'}
              </button>

              {listing === null && <p className="bm-browse-status">Reading attester details…</p>}
              {listing && listing.problem && (
                <p className="bm-details-problem" role="alert">{listing.problem}</p>
              )}
              {listing && !listing.problem && listing.entries.length === 0 && (
                <p className="bm-browse-status">No attestations yet.</p>
              )}
              {listing &&
                listing.entries.map((entry) =>
                  entry.ok ? (
                    <div
                      key={entry.id}
                      style={{
                        display: 'grid',
                        gap: '0.75rem',
                        width: '100%',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(243, 237, 224, 0.12)',
                      }}
                    >
                      <h4 className="bm-details-title" style={{ fontSize: '1rem' }}>
                        {typeLabel(entry.type)} attester
                      </h4>
                      {entry.verified ? (
                        <span className="bm-details-badge bm-details-badge--ok">
                          Verified against their on-chain commitment
                        </span>
                      ) : (
                        <span className="bm-details-badge bm-details-badge--warn">
                          Does not match their on-chain commitment. Treat as unverified.
                        </span>
                      )}
                      <FieldList fields={entry.fields} />
                    </div>
                  ) : (
                    <p key={entry.id} className="bm-details-problem" role="alert">
                      {typeLabel(entry.type)} attester: {entry.reason}
                    </p>
                  ),
                )}
            </section>
          )}

          {/* ---- Everyone else: public record of types ---- */}
          {!view.isOwner && view.records.length > 0 && (
            <p className="bm-browse-status">
              Attested so far: {view.records.map((r) => typeLabel(r.type)).join(', ')}.
            </p>
          )}

          {/* ---- Attest ---- */}
          {view.isOwner ? (
            <p className="bm-browse-status">
              You own this business, so you can’t attest for it from this wallet.
            </p>
          ) : full ? (
            <p className="bm-browse-status">
              This business already has the maximum of {MAX_ATTESTATIONS} attestations.
            </p>
          ) : !view.ownerKey ? (
            <p className="bm-browse-error" role="alert">
              This business was registered before attester details existed, so it can’t take new
              attestations.
            </p>
          ) : (
            <form className="bm-reg-form" onSubmit={submit} noValidate>
              <div className="bm-field">
                <label className="bm-field-label" htmlFor="att-category">You are attesting as</label>
                <select
                  id="att-category"
                  className="bm-input bm-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={String(c.value)}>{c.label}</option>
                  ))}
                </select>
                <span className="bm-field-hint">
                  The category is public. Several attesters can share a category.
                </span>
              </div>

              {FIELDS.map((f) => (
                <div className="bm-field" key={f.key}>
                  <label className="bm-field-label" htmlFor={`att-${f.key}`}>{f.label}</label>
                  <input
                    id={`att-${f.key}`}
                    className="bm-input"
                    type="text"
                    value={values[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                  <span className="bm-field-hint">
                    Private. {byteLength(values[f.key])}/{f.limit} bytes
                  </span>
                </div>
              ))}

              <p className="bm-field-hint">
                These details are encrypted to the business owner. After a handshake the owner can pass them on,
                encrypted, to an investor, who can then check them for themselves.
              </p>

              <div className="bm-field">
                <label className="bm-field-label" htmlFor="att-pass">Identity passphrase</label>
                <input
                  id="att-pass"
                  className="bm-input"
                  type="password"
                  autoComplete="off"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={`At least ${MIN_PASSPHRASE} characters`}
                />
                <span className="bm-field-hint">
                  Your attester identity is derived from this, and it stops the same identity attesting twice
                  for this business. Keep it private: anyone who knows it can attest as you, and a weak
                  passphrase can be guessed from the public nullifier.
                </span>
              </div>

              {error && <div className="bm-field-error bm-submit-error" role="alert">{error}</div>}

              {done && (
                <p className="bm-browse-status" role="status">
                  Attestation submitted. The business owner can now see your details on their attestation page.
                </p>
              )}

              <div className="bm-cta-row" style={{ marginTop: '0.5rem' }}>
                <button type="submit" className="bm-btn bm-btn-primary" disabled={busy}>
                  {busy ? 'Signing…' : 'Submit attestation'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
