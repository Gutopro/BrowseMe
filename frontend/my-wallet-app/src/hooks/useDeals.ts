import { useEffect, useState } from 'react';
import { useWallet } from '../WalletContext';
import { dealsFrom, type DealsView } from '../contract/ContractAPI';

// Live view of what the connected wallet is party to. Null until first load.
// The [useDeals] console lines are temporary debugging.
export function useDeals() {
  const { contractAPI } = useWallet();
  const [deals, setDeals] = useState<DealsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useDeals] effect run, contractAPI present:', !!contractAPI);
    if (!contractAPI) {
      setDeals(null);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        console.log('[useDeals] reading caller address...');
        const caller = await contractAPI.getCallerAddress();
        console.log('[useDeals] got caller address, cancelled:', cancelled, 'length:', caller?.length);
        if (cancelled) return;
        const sub = dealsFrom(contractAPI.state$, caller).subscribe({
          next: (view) => {
            console.log('[useDeals] deals updated, isInvestor:', view.isInvestor);
            setDeals(view);
            setError(null);
          },
          error: (err) => {
            console.error('[useDeals] stream error', err);
            setError('Could not load your deals from the indexer.');
          },
        });
        unsubscribe = () => sub.unsubscribe();
      } catch (err) {
        console.error('[useDeals] failed before subscribing', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your deals.');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [contractAPI]);

  return { deals, error };
}
