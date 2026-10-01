// contracts/src/witnesses.ts
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type BusinessForm = {
  name: Uint8Array;
  description: Uint8Array;
  contactInfo: Uint8Array;
  sector: Uint8Array;
  location: Uint8Array;
};

export type InvestorForm = {
  name: Uint8Array;
  region: Uint8Array;
  businessId: Uint8Array;
  taxId: Uint8Array;
};

export type AttesterIdentity = {
  identitySecret: Uint8Array;
};

export type BrowseMePrivateState = {
  readonly callerAddress: Uint8Array;
  readonly businessForm: BusinessForm;
  readonly investorForm: InvestorForm;
  readonly attesterIdentity: AttesterIdentity;
};

export const createBrowseMePrivateState = (
  callerAddress: Uint8Array,
  businessForm: BusinessForm,
  investorForm: InvestorForm,
  attesterIdentity: AttesterIdentity,
) => ({
  callerAddress,
  businessForm,
  investorForm,
  attesterIdentity,
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

  businessFormRand: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] =>
    [privateState, randomBytes(32)],

  investorFormData: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, InvestorForm] =>
    [privateState, privateState.investorForm],

  investorFormRand: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] =>
    [privateState, randomBytes(32)],

  attesterIdentityData: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, AttesterIdentity] =>
    [privateState, privateState.attesterIdentity],

};
