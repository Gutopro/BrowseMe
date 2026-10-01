// Goes to: frontend/my-wallet-app/src/contract/common-types.ts
//
// Shared types for the BrowseMe contract layer. Kept separate from
// ContractAPI.ts so both the frontend and any future scripts/tests can
// import the type definitions without pulling in the full API class.

import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type {
  BusinessForm,
  InvestorForm,
  AttesterIdentity,
} from '../../../../contracts/src/witnesses.js';

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

// Mirrors contracts/src/witnesses.ts exactly (v0.2 — commitments fixed).
export type BrowseMePrivateState = {
  callerAddress: Uint8Array; // Bytes<32> — see providers.ts callerAddressBytesFromWallet()
  businessForm: BusinessForm;
  investorForm: InvestorForm;
  attesterIdentity: AttesterIdentity;
};

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

// NOT present in main.compact — this was a frontend-only role tag, previously
// misnamed AttesterType, which collided with the contract's real
// AttesterType enum above. Rename usages of the old AttesterType.Investor /
// .BusinessTrackA / .BusinessTrackB / .ThirdParty to AttesterRole.* if this
// distinguishes UI flows (e.g. which registration form is showing) rather
// than anything sent to the contract. If nothing in the frontend actually
// reads this anymore, it's safe to delete.
export const AttesterRole = {
  Investor: 0,
  BusinessTrackA: 1,
  BusinessTrackB: 2,
  ThirdParty: 3,
} as const;
export type AttesterRole = (typeof AttesterRole)[keyof typeof AttesterRole];
