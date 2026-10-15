// contracts/src/witnesses.ts
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

// Byte limits for each private form field. These must match the Bytes<N>
// sizes in main.compact. Forms should validate against these (in bytes, not
// characters) so nothing is silently truncated.
export const FORM_LIMITS = {
  name: 32,
  description: 128,
  contactInfo: 64,
  sector: 32,
  location: 32,
  region: 32,
  businessId: 32,
  taxId: 32,
  organisation: 32,
  position: 32,
  registrationId: 32,
} as const;

export type BusinessForm = {
  name: Uint8Array;        // Bytes<32>
  description: Uint8Array; // Bytes<128>
  contactInfo: Uint8Array; // Bytes<64>
  sector: Uint8Array;      // Bytes<32>
  location: Uint8Array;    // Bytes<32>
};

export type InvestorForm = {
  name: Uint8Array;       // Bytes<32>
  region: Uint8Array;     // Bytes<32>
  businessId: Uint8Array; // Bytes<32>
  taxId: Uint8Array;      // Bytes<32>
};

export type AttesterForm = {
  name: Uint8Array;           // Bytes<32>
  organisation: Uint8Array;   // Bytes<32>
  position: Uint8Array;       // Bytes<32>
  contactInfo: Uint8Array;    // Bytes<64>
  registrationId: Uint8Array; // Bytes<32>
};

export type AttesterIdentity = {
  identitySecret: Uint8Array;
};

// Encryption keypair used to exchange details after a handshake and to
// receive attester details. Generated in the frontend on first use; the
// public half goes on-chain, the secret half never leaves this browser's
// private state.
export type DetailsKeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export type BrowseMePrivateState = {
  readonly callerAddress: Uint8Array;
  readonly businessForm: BusinessForm;
  // Randomness used for the on-chain commitment to businessForm. Saved at
  // registration so the commitment can be opened (verified) later.
  readonly businessFormRand: Uint8Array;
  readonly investorForm: InvestorForm;
  // Same, for investorForm.
  readonly investorFormRand: Uint8Array;
  readonly attesterIdentity: AttesterIdentity;
  // The attester form and its randomness are staged by the client before each
  // submitAttestation call (the encrypted package needs the randomness up
  // front), so the witness reads them rather than generating them.
  readonly attesterForm: AttesterForm;
  readonly attesterFormRand: Uint8Array;
  readonly detailsKeyPair: DetailsKeyPair | null;
};

const zeros = (length: number): Uint8Array => new Uint8Array(length);

export const emptyBusinessForm = (): BusinessForm => ({
  name: zeros(FORM_LIMITS.name),
  description: zeros(FORM_LIMITS.description),
  contactInfo: zeros(FORM_LIMITS.contactInfo),
  sector: zeros(FORM_LIMITS.sector),
  location: zeros(FORM_LIMITS.location),
});

export const emptyInvestorForm = (): InvestorForm => ({
  name: zeros(FORM_LIMITS.name),
  region: zeros(FORM_LIMITS.region),
  businessId: zeros(FORM_LIMITS.businessId),
  taxId: zeros(FORM_LIMITS.taxId),
});

export const emptyAttesterForm = (): AttesterForm => ({
  name: zeros(FORM_LIMITS.name),
  organisation: zeros(FORM_LIMITS.organisation),
  position: zeros(FORM_LIMITS.position),
  contactInfo: zeros(FORM_LIMITS.contactInfo),
  registrationId: zeros(FORM_LIMITS.registrationId),
});

export const emptyAttesterIdentity = (): AttesterIdentity => ({
  identitySecret: zeros(32),
});

// Fresh private state for a wallet that has never registered anything.
export const emptyPrivateState = (callerAddress: Uint8Array): BrowseMePrivateState => ({
  callerAddress,
  businessForm: emptyBusinessForm(),
  businessFormRand: zeros(32),
  investorForm: emptyInvestorForm(),
  investorFormRand: zeros(32),
  attesterIdentity: emptyAttesterIdentity(),
  attesterForm: emptyAttesterForm(),
  attesterFormRand: zeros(32),
  detailsKeyPair: null,
});

// Same 4-argument shape as before, so existing callers keep working.
export const createBrowseMePrivateState = (
  callerAddress: Uint8Array,
  businessForm: BusinessForm,
  investorForm: InvestorForm,
  attesterIdentity: AttesterIdentity,
): BrowseMePrivateState => ({
  callerAddress,
  businessForm,
  businessFormRand: zeros(32),
  investorForm,
  investorFormRand: zeros(32),
  attesterIdentity,
  attesterForm: emptyAttesterForm(),
  attesterFormRand: zeros(32),
  detailsKeyPair: null,
});

// Matches Midnight's own randomBytes utility pattern (example-bboard):
// browser-native crypto.getRandomValues, never Math.random().
const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const witnesses = {
  callerAddress: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] =>
    [privateState, privateState.callerAddress],

  businessFormData: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, BusinessForm] =>
    [privateState, privateState.businessForm],

  // Generates the commitment randomness AND saves it, so the commitment
  // can be opened later.
  businessFormRand: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] => {
    const rand = randomBytes(32);
    return [{ ...privateState, businessFormRand: rand }, rand];
  },

  investorFormData: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, InvestorForm] =>
    [privateState, privateState.investorForm],

  investorFormRand: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] => {
    const rand = randomBytes(32);
    return [{ ...privateState, investorFormRand: rand }, rand];
  },

  attesterIdentityData: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, AttesterIdentity] =>
    [privateState, privateState.attesterIdentity],

  attesterFormData: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, AttesterForm] =>
    [privateState, privateState.attesterForm],

  // Reads the randomness the client staged before the call. It cannot be
  // generated here: the encrypted package passed to submitAttestation has to
  // contain it, and the package is built before the circuit runs.
  attesterFormRand: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] =>
    [privateState, privateState.attesterFormRand],
};
