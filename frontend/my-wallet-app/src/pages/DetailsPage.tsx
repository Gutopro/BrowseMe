// Goes to: frontend/my-wallet-app/src/pages/DetailsPage.tsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { useHandshakeDetails } from '../hooks/useHandshakeDetails';
import type { DetailField } from '../contract/ContractAPI';
import './BrowsePage.css';
import './DealsPage.css';
import './DetailsPage.css';

const clean = (value: string) => value.trim() || 'Unspecified';
const shortNonce = (hex: string) => `${hex.slice(0, 8)}…${hex.slice(-4)}`;

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

export default function DetailsPage() {
  const { nonce } = useParams<{ nonce: string }>();
  const { contractAPI, connect, connecting, connectionError, contractError } = useWallet();
  const { view, mine, theirs, error } = useHandshakeDetails(nonce);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const share = async () => {
    if (!contractAPI || !view) return;
    setBusy(true);
    setActionError(null);
    try {
      await contractAPI.deliverMyDetails(view.nonce);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'The transaction failed.');
    } finally {
      setBusy(false);
    }
  };

  const notice = error ?? contractError ?? connectionError;
  const other = view ? (view.role === 'INVESTOR' ? 'the business' : 'the investor') : 'the other side';

  return (
    <div className="bm-home">
      <header className="bm-browse-head">
        <span className="bm-eyebrow-dark">Handshake</span>
        <h1 className="bm-h2">Shared details</h1>
        <p className="bm-browse-sub">
          Details move only after both sides have shaken, and only when you choose to share yours. Each
          package is encrypted to the other party’s key before it touches the ledger.
        </p>
      </header>

      {notice && <p className="bm-browse-error" role="alert">{notice}</p>}
      {actionError && <p className="bm-browse-error" role="alert">{actionError}</p>}

      {!contractAPI && (
        <div className="bm-browse-empty">
          <p>Connect your wallet to see this handshake.</p>
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

      {contractAPI && !error && view === undefined && <p className="bm-browse-status">Loading handshake…</p>}

      {contractAPI && view === null && (
        <div className="bm-browse-empty">
          <p>We couldn’t find this handshake for your wallet.</p>
          <Link to="/deals" className="bm-btn bm-btn-ghost">Back to Deals</Link>
        </div>
      )}

      {contractAPI && view && (
        <>
          <div className="bm-details-summary">
            <div className="bm-listing-top">
              <span className="bm-listing-id">
                {view.role === 'OWNER' ? 'Incoming' : 'Outgoing'} · #{view.businessId.toString()} ·{' '}
                {shortNonce(view.nonceHex)}
              </span>
              <span className={`bm-status bm-deal-status--${view.status.toLowerCase()}`}>
                {view.status === 'SEALED' ? 'Sealed' : view.status === 'PENDING' ? 'Pending' : 'Ended'}
              </span>
            </div>
            <h2 className="bm-listing-sector">{clean(view.sector)}</h2>
            <p className="bm-listing-location">{clean(view.location)}</p>
            <Link to="/deals" className="bm-details-back">← Back to Deals</Link>
          </div>

          {view.status === 'PENDING' && (
            <div className="bm-browse-empty">
              <p>
                This handshake isn’t sealed yet. Details can be shared once the business owner shakes
                back.
              </p>
            </div>
          )}

          {view.status === 'ENDED' && (
            <div className="bm-browse-empty">
              <p>
                This handshake has ended. Delivered packages were removed from the ledger’s current
                state. They remain in chain history, so treat anything you shared as shared.
              </p>
            </div>
          )}

          {view.status === 'SEALED' && (
            <div className="bm-details-grid">
              {/* ---- What I share ---- */}
              <section className="bm-details-panel" aria-labelledby="mine-title">
                <h3 id="mine-title" className="bm-details-title">What you share</h3>
                <p className="bm-details-sub">
                  Encrypted to {other}’s key and written to the ledger. Only they can read it.
                </p>

                {mine === null && <p className="bm-browse-status">Reading your stored details…</p>}
                {mine && <FieldList fields={mine.fields} />}
                {mine && mine.problem && (
                  <p className="bm-details-problem" role="alert">{mine.problem}</p>
                )}

                {view.myPackageDelivered ? (
                  <span className="bm-details-badge bm-details-badge--ok">Shared</span>
                ) : (
                  <button
                    type="button"
                    className="bm-btn bm-btn-primary"
                    onClick={() => void share()}
                    disabled={busy || !mine || !!mine.problem}
                  >
                    {busy ? 'Signing…' : 'Share my details'}
                  </button>
                )}
              </section>

              {/* ---- What they share ---- */}
              <section className="bm-details-panel" aria-labelledby="theirs-title">
                <h3 id="theirs-title" className="bm-details-title">What they share</h3>
                <p className="bm-details-sub">
                  Decrypted in this browser, then checked against the commitment {other} registered
                  on-chain.
                </p>

                {!view.theirPackage && (
                  <p className="bm-browse-status">Waiting for {other} to share their details.</p>
                )}
                {view.theirPackage && theirs === null && <p className="bm-browse-status">Decrypting…</p>}
                {theirs && !theirs.ok && (
                  <p className="bm-details-problem" role="alert">{theirs.reason}</p>
                )}
                {theirs && theirs.ok && (
                  <>
                    {theirs.verified ? (
                      <span className="bm-details-badge bm-details-badge--ok">
                        Verified against their on-chain commitment
                      </span>
                    ) : (
                      <span className="bm-details-badge bm-details-badge--warn">
                        Does not match their on-chain commitment. Treat as unverified.
                      </span>
                    )}
                    <FieldList fields={theirs.fields} />
                  </>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
