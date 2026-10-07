import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { useDeals } from '../hooks/useDeals';
import { listedBusinessesFrom, type ListedBusiness } from '../contract/ContractAPI';
import './BrowsePage.css';

const ALL = 'all';

const clean = (value: string) => value.trim() || 'Unspecified';

export default function ListedBusinessesPage() {
  const { contractAPI, connect, connecting, connectionError, contractError } = useWallet();
  const { deals, error: dealsError } = useDeals();

  // TEMP DEBUG: remove once the Browse button works.
  useEffect(() => {
    console.log('[page] mount');
    return () => console.log('[page] unmount');
  }, []);
  console.log('[page] render', {
    hasAPI: !!contractAPI,
    deals: deals === null ? 'null' : 'loaded',
    dealsError,
  });

  const [businesses, setBusinesses] = useState<ListedBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sector, setSector] = useState(ALL);
  const [location, setLocation] = useState(ALL);
  const [openOnly, setOpenOnly] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractAPI) return;
    const sub = listedBusinessesFrom(contractAPI.state$).subscribe({
      next: (list) => {
        setBusinesses(list);
        setError(null);
      },
      error: (err) => {
        console.error(err);
        setError('Could not load listings from the indexer.');
      },
    });
    return () => sub.unsubscribe();
  }, [contractAPI]);

  const sectors = useMemo(
    () => Array.from(new Set((businesses ?? []).map((b) => clean(b.sector)))).sort((a, b) => a.localeCompare(b)),
    [businesses],
  );
  const locations = useMemo(
    () => Array.from(new Set((businesses ?? []).map((b) => clean(b.location)))).sort((a, b) => a.localeCompare(b)),
    [businesses],
  );

  const visible = useMemo(
    () =>
      (businesses ?? []).filter(
        (b) =>
          (sector === ALL || clean(b.sector) === sector) &&
          (location === ALL || clean(b.location) === location) &&
          (!openOnly || b.status === 'OPEN'),
      ),
    [businesses, sector, location, openOnly],
  );

  // Listings owned by the connected wallet.
  const ownedIds = useMemo(
    () => new Set((deals?.ownedBusinesses ?? []).map((b) => b.id.toString())),
    [deals],
  );

  // Active outgoing handshakes, keyed by business id. Ended ones are ignored,
  // so a new handshake can be started after an unshake.
  const myHandshakes = useMemo(() => {
    const m = new Map<string, 'PENDING' | 'SEALED'>();
    for (const h of deals?.handshakes ?? []) {
      if (h.role !== 'INVESTOR' || h.status === 'ENDED') continue;
      m.set(h.businessId.toString(), h.status);
    }
    return m;
  }, [deals]);

  const dealsLoading = !!contractAPI && deals === null && !dealsError;

  const filtersActive = sector !== ALL || location !== ALL || openOnly;
  const resetFilters = () => {
    setSector(ALL);
    setLocation(ALL);
    setOpenOnly(false);
  };

  const initiate = async (businessId: bigint) => {
    if (!contractAPI) return;
    setBusyId(businessId.toString());
    setActionError(null);
    try {
      const nonce = crypto.getRandomValues(new Uint8Array(32));
      await contractAPI.initiateHandshake(nonce, businessId);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : 'The transaction failed.');
    } finally {
      setBusyId(null);
    }
  };

  const buttonLabel = (idStr: string) => {
    if (busyId === idStr) return 'Signing…';
    if (dealsLoading) return 'Loading your wallet state…';
    return 'Initiate handshake';
  };

  const notice = error ?? dealsError ?? contractError ?? connectionError;

  return (
    <div className="bm-home">
      <header className="bm-browse-head">
        <span className="bm-eyebrow-dark">Browse</span>
        <h1 className="bm-h2">Listed businesses</h1>
        <p className="bm-browse-sub">
          Business names, financials and contact details are never on the ledger. You are
          seeing only what each owner chose to make public.
        </p>
        <ul className="bm-disclosure" aria-label="What is visible on listings">
          <li className="bm-disclosure-item bm-disclosure-item--public">
            <span>Public</span> sector, location, track, tier, status
          </li>
          <li className="bm-disclosure-item bm-disclosure-item--private">
            <span>Private</span> name, financials, contact, identity
          </li>
        </ul>
      </header>

      {notice && (
        <p className="bm-browse-error" role="alert">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="bm-browse-error" role="alert">
          {actionError}
        </p>
      )}

      {deals && !deals.isInvestor && (
        <p className="bm-deals-hint">
          You need an investor registration to start handshakes.{' '}
          <Link to="/register-investor">Register as an investor</Link>
        </p>
      )}

      {!contractAPI && (
        <div className="bm-browse-empty">
          <p>Connect your wallet to load listings.</p>
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

      {contractAPI && !error && businesses === null && (
        <p className="bm-browse-status">Loading listings…</p>
      )}

      {businesses && businesses.length === 0 && (
        <div className="bm-browse-empty">
          <p>No businesses are listed yet.</p>
        </div>
      )}

      {businesses && businesses.length > 0 && (
        <>
          <div className="bm-filters" role="group" aria-label="Filter listings">
            <label className="bm-filter">
              <span>Sector</span>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value={ALL}>All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="bm-filter">
              <span>Location</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value={ALL}>All locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="bm-filter-check">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
              />
              Open only
            </label>

            <p className="bm-filter-count" aria-live="polite">
              {visible.length} of {businesses.length} listings
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="bm-browse-empty">
              <p>No listings match these filters.</p>
              {filtersActive && (
                <button type="button" className="bm-btn bm-btn-ghost" onClick={resetFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <ul className="bm-card-grid">
              {visible.map((b) => {
                const idStr = b.id.toString();
                const handshake = myHandshakes.get(idStr);
                return (
                  <li key={idStr} className="bm-listing">
                    <div className="bm-listing-top">
                      <span className="bm-listing-id">#{idStr}</span>
                      <span
                        className={`bm-status bm-status--${b.status === 'OPEN' ? 'open' : 'investing'}`}
                      >
                        {b.status === 'OPEN' ? 'Open' : 'Investing'}
                      </span>
                    </div>

                    <h2 className="bm-listing-sector">{clean(b.sector)}</h2>
                    <p className="bm-listing-location">{clean(b.location)}</p>

                    <div className="bm-listing-meta">
                      <span className="bm-tag">Track {b.track}</span>
                      {b.tier > 0 && <span className="bm-tag bm-tag--gold">Tier {b.tier}</span>}
                    </div>

                    <div className="bm-listing-action">
                      {ownedIds.has(idStr) ? (
                        <span className="bm-listing-note">Your listing</span>
                      ) : handshake ? (
                        <span className="bm-listing-note">
                          {handshake === 'SEALED' ? 'Handshake sealed' : 'Handshake pending'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="bm-btn bm-btn-primary"
                          disabled={dealsLoading || !deals?.isInvestor || busyId !== null}
                          onClick={() => void initiate(b.id)}
                        >
                          {buttonLabel(idStr)}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
