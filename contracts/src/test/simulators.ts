import { Contract, type Ledger, ledger, AttesterType } from "../../managed/browseme/contract/index.js";
import {
  witnesses,
  createBrowseMePrivateState,
  FORM_LIMITS,
  type BrowseMePrivateState,
} from "../witnesses.js";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { randomBytes } from "node:crypto";

export const testAddress = (): Uint8Array => new Uint8Array(randomBytes(32));

// Pads a string into a fixed-size byte array (truncating), for readable tests.
const padTo = (str: string, size: number): Uint8Array => {
  const out = new Uint8Array(size);
  out.set(new TextEncoder().encode(str).slice(0, size));
  return out;
};
const pad32 = (str: string): Uint8Array => padTo(str, 32);

// Stand-ins for the encryption public keys the frontend publishes in a
// handshake. The contract only stores them, so any 32 bytes will do.
export const defaultInvestorKey = pad32("test-investor-public-key");
export const defaultOwnerKey = pad32("test-owner-public-key");

function defaultPrivateState(callerAddress: Uint8Array): BrowseMePrivateState {
  return createBrowseMePrivateState(
    callerAddress,
    {
      name: padTo("Test Biz", FORM_LIMITS.name),
      description: padTo("A test business", FORM_LIMITS.description),
      contactInfo: padTo("test@example.com", FORM_LIMITS.contactInfo),
      sector: padTo("tech", FORM_LIMITS.sector),
      location: padTo("lagos", FORM_LIMITS.location),
    },
    {
      name: padTo("Test Investor", FORM_LIMITS.name),
      region: padTo("lagos", FORM_LIMITS.region),
      businessId: padTo("biz-1", FORM_LIMITS.businessId),
      taxId: padTo("tax-1", FORM_LIMITS.taxId),
    },
    // overwritten per call in submitAttestation
    { identitySecret: pad32("default-attester") },
  );
}

export class BrowseMeSimulator {
  readonly contract: Contract<BrowseMePrivateState>;
  circuitContext: any;

  constructor(callerAddress: Uint8Array) {
    this.contract = new Contract(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext(defaultPrivateState(callerAddress), "0".repeat(64))
      );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );
  }

  as(callerAddress: Uint8Array) {
    this.circuitContext.currentPrivateState = { ...this.circuitContext.currentPrivateState, callerAddress };
    return this;
  }

  registerInvestor() {
    const { context, result } = this.contract.impureCircuits.registerInvestor(
      this.circuitContext
    );
    this.circuitContext = context;
    return result;
  }

  registerBusinessTrackA(sector: Uint8Array, location: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.registerBusinessTrackA(
      this.circuitContext, sector, location
    );
    this.circuitContext = context;
    return result;
  }

  registerBusinessTrackB(sector: Uint8Array, location: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.registerBusinessTrackB(
      this.circuitContext, sector, location
    );
    this.circuitContext = context;
    return result;
  }

  // Third argument is the attester's identity secret (private), not a commitment.
  submitAttestation(businessId: bigint, attesterType: AttesterType, identitySecret: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      attesterIdentity: { identitySecret },
    };
    const { context, result } = this.contract.impureCircuits.submitAttestation(
      this.circuitContext, businessId, attesterType
    );
    this.circuitContext = context;
    return result;
  }

  initiateHandshake(nonce: Uint8Array, businessId: bigint, investorKey: Uint8Array = defaultInvestorKey) {
    const { context, result } = this.contract.impureCircuits.initiateHandshake(
      this.circuitContext, nonce, businessId, investorKey
    );
    this.circuitContext = context;
    return result;
  }

  shake(nonce: Uint8Array, ownerKey: Uint8Array = defaultOwnerKey) {
    const { context, result } = this.contract.impureCircuits.shake(
      this.circuitContext, nonce, ownerKey
    );
    this.circuitContext = context;
    return result;
  }

  deliverInvestorDetails(nonce: Uint8Array, details: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.deliverInvestorDetails(
      this.circuitContext, nonce, details
    );
    this.circuitContext = context;
    return result;
  }

  deliverBusinessDetails(nonce: Uint8Array, details: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.deliverBusinessDetails(
      this.circuitContext, nonce, details
    );
    this.circuitContext = context;
    return result;
  }

  unshake(nonce: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.unshake(
      this.circuitContext, nonce
    );
    this.circuitContext = context;
    return result;
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  // The private state as the witnesses left it (e.g. the saved commitment randomness).
  getPrivateState(): BrowseMePrivateState {
    return this.circuitContext.currentPrivateState;
  }
}
