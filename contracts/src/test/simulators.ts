import { Contract, type Ledger, ledger, AttesterType } from "../../managed/browseme/contract/index.js";
import { witnesses, createBrowseMePrivateState, type BrowseMePrivateState } from "../witnesses.js";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { randomBytes } from "node:crypto";

export const testAddress = (): Uint8Array => new Uint8Array(randomBytes(32));

export class BrowseMeSimulator {
  readonly contract: Contract<BrowseMePrivateState>;
  circuitContext: any;

  constructor(callerAddress: Uint8Array) {
    this.contract = new Contract(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext(createBrowseMePrivateState(callerAddress), "0".repeat(64))
      );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );
  }

  as(callerAddress: Uint8Array) {
    this.circuitContext.currentPrivateState = createBrowseMePrivateState(callerAddress);
    return this;
  }

  registerInvestor(commitment: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.registerInvestor(
      this.circuitContext, commitment
    );
    this.circuitContext = context;
    return result;
  }

  registerBusinessTrackA(commitment: Uint8Array, sector: Uint8Array, location: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.registerBusinessTrackA(
      this.circuitContext, commitment, sector, location
    );
    this.circuitContext = context;
    return result;
  }

  registerBusinessTrackB(commitment: Uint8Array, sector: Uint8Array, location: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.registerBusinessTrackB(
      this.circuitContext, commitment, sector, location
    );
    this.circuitContext = context;
    return result;
  }

  submitAttestation(businessId: bigint, attesterType: AttesterType, attesterCommitment: Uint8Array) {
    const { context, result } = this.contract.impureCircuits.submitAttestation(
      this.circuitContext, businessId, attesterType, attesterCommitment
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
