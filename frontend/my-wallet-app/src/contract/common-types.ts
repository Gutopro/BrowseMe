// Goes to: frontend/my-wallet-app/src/contract/common-types.ts
//
// Shared types for the BrowseMe contract layer. Kept separate from
// ContractAPI.ts so both the frontend and any future scripts/tests can
// import the type definitions without pulling in the full API class.

import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { BrowseMePrivateState as ContractPrivateState } from '../../../../contracts/src/witnesses.js';

// All impure circuits exposed by main.compact. Add to this list if you
// export more circuits from the contract.
export type BrowseMeCircuits =
  | 'registerInvestor'
  | 'registerBusinessTrackA'
  | 'registerBusinessTrackB'
  | 'submitAttestation'
  | 'initiateHandshake'
  | 'shake'
  | 'deliverInvestorDetails'
  | 'deliverBusinessDetails'
  | 'unshake';

// Single source of truth lives in contracts/src/witnesses.ts (v0.3: adds the
// saved commitment randomness and the details keypair).
export type BrowseMePrivateState = ContractPrivateState;

export const BROWSEME_PRIVATE_STATE_ID = 'browsemePrivateState';

export type BrowseMeProviders = MidnightProviders<BrowseMeCircuits, typeof BROWSEME_PRIVATE_STATE_ID, BrowseMePrivateState>;

// Matches main.compact's `export enum AttesterType { COMMUNITY, RELIGIOUS,
// UNION, EDUCATION }` exactly — this is the enum submitAttestation actually
// takes. Values serialize by declaration order (Compact enums compile to
// plain numbers in TS), so this MUST stay in sync with main.compact if that
// enum's order ever changes.
export const AttesterCategory = {
  Community: 0,
  Religious: 1,
  Union: 2,
  Education: 3,
} as const;
export type AttesterCategory = (typeof AttesterCategory)[keyof typeof AttesterCategory];

// NOT present in main.compact — a frontend-only role tag, previously
// misnamed AttesterType, which collided with the contract's real
// AttesterType enum above. Safe to delete if nothing reads it.
export const AttesterRole = {
  Investor: 0,
  BusinessTrackA: 1,
  BusinessTrackB: 2,
  ThirdParty: 3,
} as const;
export type AttesterRole = (typeof AttesterRole)[keyof typeof AttesterRole];
