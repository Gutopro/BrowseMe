// Goes to: frontend/my-wallet-app/src/contract/common-types.ts
//
// Shared types for the BrowseMe contract layer. Kept separate from
// ContractAPI.ts so both the frontend and any future scripts/tests can
// import the type definitions without pulling in the full API class.

import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

// All impure circuits exposed by main.compact. Add to this list if you
// export more circuits from the contract — TypeScript will then force
// ContractAPI to implement them (see the exhaustiveness note below).
export type BrowseMeCircuits =
  | 'registerInvestor'
  | 'registerBusinessTrackA'
  | 'registerBusinessTrackB'
  | 'submitAttestation'
  | 'initiateHandshake'
  | 'shake'
  | 'unshake';

// Whatever your contract's witnesses need locally (e.g. caller's raw
// unshielded address bytes, any secrets used in disclose()d values).
// Fill this in to match contracts/src/witnesses.ts exactly.
export type BrowseMePrivateState = {
  callerAddress: Uint8Array; // Bytes<32> — see providers.ts callerAddressBytesFromWallet()
};

export const BROWSEME_PRIVATE_STATE_ID = 'browsemePrivateState';

export type BrowseMeProviders = MidnightProviders <
  BrowseMeCircuits,
  typeof BROWSEME_PRIVATE_STATE_ID,
  BrowseMePrivateState
>;

// Matches main.compact's 4-way AttesterType enum. Confirm the order
// against the .compact source — enum values serialize by declaration
// order, so a mismatch here silently sends the wrong attester type.
export const AttesterType = {
  Investor: 0,
  BusinessTrackA: 1,
  BusinessTrackB: 2,
  ThirdParty: 3,
} as const;
export type AttesterType = (typeof AttesterType)[keyof typeof AttesterType];
