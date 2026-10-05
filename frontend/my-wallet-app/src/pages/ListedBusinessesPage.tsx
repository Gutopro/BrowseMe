import { useEffect, useState } from 'react';
import { useWallet } from '../WalletContext';
import { listedBusinessesFrom, type ListedBusiness } from '../contract/ContractAPI';

export default function ListedBusinessesPage() {
  const { contractAPI } = useWallet();
  const [businesses, setBusinesses] = useState<ListedBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractAPI) return;
    const sub = listedBusinessesFrom(contractAPI.state$).subscribe({
      next: (list) => { setBusinesses(list); setError(null); },
      error: (err) => {
        console.error(err);
        setError('Could not load listings from the indexer.');
      },
    });
    return () => sub.unsubscribe();
  }, [contractAPI]);

  return (
    <div className="bm-home">
      <section className="bm-section">
        <h2>Listed businesses</h2>
        {!contractAPI && <p>Connect your wallet to load listings.</p>}
        {error && <p className="bm-field-error">{error}</p>}
        {contractAPI && !error && businesses === null && <p>Loading…</p>}
        {businesses && businesses.length === 0 && <p>No businesses are listed yet.</p>}
        {businesses && businesses.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">Sector</th>
                  <th align="left">Location</th>
                  <th align="left">Track</th>
                  <th align="left">Tier</th>
                  <th align="left">Status</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id.toString()}>
                    <td>{b.sector}</td>
                    <td>{b.location}</td>
                    <td>{b.track}</td>
                    <td>{b.tier > 0 ? `T${b.tier}` : '—'}</td>
                    <td>{b.status === 'INVESTING' ? 'Investing' : 'Open'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
