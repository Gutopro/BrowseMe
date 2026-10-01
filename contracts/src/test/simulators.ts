import { Contract, type Ledger, ledger, AttesterType } from "../../managed/browseme/contract/index.js";
import { witnesses, createBrowseMePrivateState, type BrowseMePrivateState } from "../witnesses.js";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { randomBytes } from "node:crypto";

export const testAddress = (): Uint8Array => new Uint8Array(randomBytes(32));

const pad32 = (str: string): Uint8Array => {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(str).slice(0, 32));
  return out;
};

function defaultPrivateState(callerAddress: Uint8Array): BrowseMePrivateState {
  return createBrowseMePrivateState(
    callerAddress,
    {
      name: pad32("Test Biz"),
      description: pad32("A test business"),
      contactInfo: pad32("test@example.com"),
      sector: pad32("tech"),
      location: pad32("lagos"),
    },
    {
      name: pad32("Test Investor"),
      region: pad32("lagos"),
      businessId: pad32("biz-1"),
      taxId: pad32("tax-1"),
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

  // Third argument is now the attester's identity secret (private), not a commitment.
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

  initiateHandshake(nonce: Uint8Array, businessId: bigint) {
    const { context, result } = this.contract.impureCircuits.initiateHandshake(
      this.circuitContext, nonce, businessId
    );
    this.circuitContext = context;
    return result;
  }

  shake(nonce: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.shake(
      this.circuitContext, nonce
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
}
