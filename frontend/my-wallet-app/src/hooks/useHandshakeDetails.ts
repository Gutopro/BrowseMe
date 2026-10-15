// Goes to: frontend/my-wallet-app/src/hooks/useHandshakeDetails.ts
//
// Live view of one handshake for the connected wallet, plus the derived
// pieces the details page needs: what I'm about to share, the other side's
// details (decrypted and verified) once they've delivered them, and, for a
// Track B business, the attester details (the owner's preview of what will be
// shared, or the investor's decrypted and matched bundle).

import { useEffect, useState } from 'react';
import { useWallet } from '../WalletContext';
import {
  handshakeDetailsFrom,
  type AttesterBundleResult,
  type AttesterListing,
  type DeliveryPreview,
  type HandshakeDetailsView,
  type OpenResult,
} from '../contract/ContractAPI';
import { toHex } from '../contract/codec';

export function useHandshakeDetails(nonceHex: string | undefined) {
  const { contractAPI } = useWallet();
  // undefined = still loading, null = not found / not a party to it
  const [view, setView] = useState<HandshakeDetailsView | null | undefined>(undefined);
  const [mine, setMine] = useState<DeliveryPreview | null>(null);
  const [theirs, setTheirs] = useState<OpenResult | null>(null);
  const [attesterPreview, setAttesterPreview] = useState<AttesterListing | null>(null);
  const [attesterBundle, setAttesterBundle] = useState<AttesterBundleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Subscribe to the handshake.
  useEffect(() => {
    if (!contractAPI || !nonceHex) {
      setView(undefined);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const caller = await contractAPI.getCallerAddress();
        if (cancelled) return;
        const sub = handshakeDetailsFrom(contractAPI.state$, nonceHex, caller).subscribe({
          next: (next) => {
            setView(next);
            setError(null);
          },
          error: (err) => {
            console.error('[useHandshakeDetails] stream error', err);
            setError('Could not load this handshake from the indexer.');
          },
        });
        unsubscribe = () => sub.unsubscribe();
      } catch (err) {
        console.error('[useHandshakeDetails] failed before subscribing', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this handshake.');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [contractAPI, nonceHex]);

  // 2. What I'm about to share (reloaded when the handshake changes state).
  const previewKey = view ? `${view.nonceHex}:${view.status}:${view.myPackageDelivered}` : null;
  useEffect(() => {
    if (!contractAPI || !view || view.status !== 'SEALED') {
      setMine(null);
      return;
    }
    let cancelled = false;
    contractAPI
      .getDeliveryPreview(view.nonce)
      .then((preview) => {
        if (!cancelled) setMine(preview);
      })
      .catch((err) => {
        console.error('[useHandshakeDetails] preview failed', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read your stored details.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAPI, previewKey]);

  // 3. Decrypt and verify what they delivered (only when their package changes).
  const theirKey = view && view.theirPackage ? `${view.nonceHex}:${toHex(view.theirPackage)}` : null;
  useEffect(() => {
    if (!contractAPI || !view || !view.theirPackage) {
      setTheirs(null);
      return;
    }
    let cancelled = false;
    contractAPI
      .openCounterpartyDetails(view)
      .then((result) => {
        if (!cancelled) setTheirs(result);
      })
      .catch((err) => {
        console.error('[useHandshakeDetails] open failed', err);
        if (!cancelled) setTheirs({ ok: false, reason: 'Could not open their details.' });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAPI, theirKey]);

  // 4. Attester details for a Track B business. The owner sees a preview of
  //    what will be shared; the investor sees the decrypted, matched bundle.
  const attesterKey =
    view && view.status === 'SEALED' && view.track === 'B'
      ? [
          view.nonceHex,
          view.role,
          view.attestationRecords.map((r) => r.id).join(','),
          view.attestationBundle ? toHex(view.attestationBundle).slice(0, 48) : 'none',
        ].join(':')
      : null;
  useEffect(() => {
    if (!contractAPI || !view || view.status !== 'SEALED' || view.track !== 'B') {
      setAttesterPreview(null);
      setAttesterBundle(null);
      return;
    }
    let cancelled = false;
    if (view.role === 'OWNER') {
      setAttesterBundle(null);
      contractAPI
        .previewAttesters(view)
        .then((listing) => {
          if (!cancelled) setAttesterPreview(listing);
        })
        .catch((err) => {
          console.error('[useHandshakeDetails] attester preview failed', err);
          if (!cancelled) setAttesterPreview({ problem: 'Could not read the attester details.', entries: [] });
        });
    } else {
      setAttesterPreview(null);
      if (!view.attestationBundle) {
        setAttesterBundle(null);
        return;
      }
      contractAPI
        .openAttesterBundle(view)
        .then((result) => {
          if (!cancelled) setAttesterBundle(result);
        })
        .catch((err) => {
          console.error('[useHandshakeDetails] attester bundle failed', err);
          if (!cancelled) setAttesterBundle({ ok: false, reason: 'Could not open the attester details.' });
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAPI, attesterKey]);

  return { view, mine, theirs, attesterPreview, attesterBundle, error };
}
