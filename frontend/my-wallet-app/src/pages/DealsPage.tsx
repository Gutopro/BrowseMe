import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { dealsFrom, type DealsView, type DealHandshake, type OwnedBusiness } from '../contract/ContractAPI';
import './BrowsePage.css';
import './DealsPage.css';

const clean = (value: string) => value.trim() || 'Unspecified';
const shortNonce = (hex: string) => `${hex.slice(0, 8)}…${hex.slice(-4)}`;

const STATUS_LABEL = { PENDING: 'Pending', SEALED: 'Sealed', ENDED: 'Ended' } as const;

function handshakeCopy(h: DealHandshake): string {
  if (h.status === 'ENDED') return 'This handshake has ended.';
  if (h.status === 'SEALED') {
    return 'Both sides are now entitled to each other’s data. Either side can unshake at any time.';
  }
  return h.role === 'OWNER'
    ? 'An investor wants to shake. Their details unlock only if you shake back.'
    : 'Waiting for the business owner to shake back. Nothing is delivered until they do.';
}

function ProgressCard({ b }: { b: OwnedBusiness }) {
  return (
    <li className="bm-listing">
      <div className="bm-listing-top">
        <span className="bm-listing-id">#{b.id.toString()}</span>
        <span className={`bm-status bm-status--${b.listed ? 'open' : 'investing'}`}>
          {b.listed ? 'Listed' : 'Not listed yet'}
        </span>
      </div>
      <h3 className="bm-listing-sector">{clean(b.sector)}</h3>
      <p className="bm-listing-location">{clean(b.location)}</p>

      {b.track === 'A' ? (
        <div className="bm-listing-meta">
          <span className="bm-tag">Track A</span>
          <span className="bm-tag bm-tag--gold">Tier {b.tier}</span>
        </div>
      ) : (
        <>
          <div
            className="bm-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={b.attestations}
            aria-label="Attestations received"
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < b.attestations ? 'is-filled' : ''} />
            ))}
          </div>
          <ul className="bm-checklist">
            <li className={b.attestations >= 2 ? 'is-done' : ''}>
              {b.attestations} of 2 attestations needed to list
            </li>
            <li className={b.hasUnion ? 'is-done' : ''}>
              Union attestation {b.hasUnion ? 'received' : 'required'}
            </li>
          </ul>
          <div className="bm-listing-meta">
            <span className="bm-tag">Track B</span>
            {b.tier > 0 && <span className="bm-tag bm-tag--gold">Tier {b.tier}</span>}
          </div>
        </>
      )}
    </li>
  );
}

export default function DealsPage() {
  const { contractAPI, connect, connecting, connectionError, contractError } = useWallet();
  const [deals, setDeals] = useState<DealsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!contractAPI) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const caller = await contractAPI.getCallerAddress();
        if (cancelled) return;
        const sub = dealsFrom(contractAPI.state$, caller).subscribe({
          next: (view) => {
            setDeals(view);
            setError(null);
          },
          error: (err) => {
            console.error(err);
            setError('Could not load your deals from the indexer.');
          },
        });
        unsubscribe = () => sub.unsubscribe();
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your deals.');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [contractAPI]);

  const run = async (nonceHex: string, action: () => Promise<unknown>) => {
    setBusy(nonceHex);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'The transaction failed.');
    } finally {
      setBusy(null);
    }
  };

  const notice = error ?? contractError ?? connectionError;
  const isEmpty = deals && deals.handshakes.length === 0 && deals.ownedBusinesses.length === 0;

  return (
    <div className="bm-home">
      <header className="bm-browse-head">
        <span className="bm-eyebrow-dark">Deals</span>
        <h1 className="bm-h2">Your handshakes and listings</h1>
        <p className="bm-browse-sub">
          Everything here is read from public ledger state for your wallet. Shaking and
          unshaking are transactions you sign.
        </p>
      </header>

      {notice && <p className="bm-browse-error" role="alert">{notice}</p>}
      {actionError && <p className="bm-browse-error" role="alert">{actionError}</p>}

      {!contractAPI && (
        <div className="bm-browse-empty">
          <p>Connect your wallet to see your deals.</p>
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

      {contractAPI && !error && deals === null && <p className="bm-browse-status">Loading your deals…</p>}

      {isEmpty && (
        <div className="bm-browse-empty">
          <p>Nothing here yet. Register a business or browse listings to start a handshake.</p>
          <div className="bm-cta-row" style={{ justifyContent: 'center' }}>
            <Link to="/businesses" className="bm-btn bm-btn-primary">Browse listings</Link>
            <Link to="/register-business" className="bm-btn bm-btn-ghost">Register a business</Link>
          </div>
        </div>
      )}

      {deals && deals.handshakes.length > 0 && (
        <section className="bm-deals-section" aria-labelledby="hs-title">
          <h2 id="hs-title" className="bm-deals-title">Handshakes</h2>
          <ul className="bm-deal-list">
            {deals.handshakes.map((h) => {
              const working = busy === h.nonceHex;
              return (
                <li key={h.nonceHex} className="bm-deal">
                  <div className="bm-deal-main">
                    <div className="bm-listing-top">
                      <span className="bm-listing-id">
                        {h.role === 'OWNER' ? 'Incoming' : 'Outgoing'} · #{h.businessId.toString()} · {shortNonce(h.nonceHex)}
                      </span>
                      <span className={`bm-status bm-deal-status--${h.status.toLowerCase()}`}>
                        {STATUS_LABEL[h.status]}
                      </span>
                    </div>
                    <h3 className="bm-listing-sector">{clean(h.sector)}</h3>
                    <p className="bm-listing-location">{clean(h.location)}</p>
                    <p className="bm-deal-copy">{handshakeCopy(h)}</p>
                  </div>

                  {h.status !== 'ENDED' && (
                    <div className="bm-deal-actions">
                      {h.status === 'PENDING' && h.role === 'OWNER' && (
                        <button
                          type="button"
                          className="bm-btn bm-btn-primary"
                          disabled={working || !!busy}
                          onClick={() => run(h.nonceHex, () => contractAPI!.shake(h.nonce))}
                        >
                          {working ? 'Signing…' : 'Shake'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="bm-btn bm-btn-ghost"
                        disabled={working || !!busy}
                        onClick={() => run(h.nonceHex, () => contractAPI!.unshake(h.nonce))}
                      >
                        {h.status === 'SEALED'
                          ? 'Unshake'
                          : h.role === 'OWNER'
                            ? 'Decline'
                            : 'Withdraw'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {deals && deals.ownedBusinesses.length > 0 && (
        <section className="bm-deals-section" aria-labelledby="biz-title">
          <h2 id="biz-title" className="bm-deals-title">Your listings</h2>
          <ul className="bm-card-grid">
            {deals.ownedBusinesses.map((b) => (
              <ProgressCard key={b.id.toString()} b={b} />
            ))}
          </ul>
        </section>
      )}

      {deals && !deals.isInvestor && (
        <p className="bm-deals-hint">
          You are not registered as an investor, so you can’t start handshakes.{' '}
          <Link to="/register-investor">Register as an investor</Link>
        </p>
      )}
    </div>
  );
}
