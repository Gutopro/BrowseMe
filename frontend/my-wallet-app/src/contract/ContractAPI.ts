// Goes to: frontend/my-wallet-app/src/contract/ContractAPI.ts
//
// Thin wrapper over the deployed BrowseMe contract. Mirrors deploy.ts's
// contract construction exactly (CompiledContract.make + withWitnesses),
// and exposes only the 7 `export circuit`s declared in main.compact.
//
// tierForCount and attestationNullifier are intentionally NOT wrapped here:
// they are `pure circuit` (no `export`) in main.compact, called only from
// inside submitAttestation, and are not present on the compiled contract's
// generated TS API.

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import * as CompactJs from '@midnight-ntwrk/compact-js';
// Same import deploy.ts uses — there is no separate named "CompiledBrowseMeContract" export.
import * as BrowseMe from '../../../../contracts/managed/browseme/contract/index.js';
import { witnesses } from '../../../../contracts/src/witnesses.js';
import {
  type BrowseMeProviders,
  type BrowseMePrivateState,
  BROWSEME_PRIVATE_STATE_ID,
  AttesterType,
} from './common-types';

// Encodes free-text form input into the fixed 32-byte arrays the circuits
// expect. Truncates rather than throws — validate length in the form
// itself (RegistrationForm.tsx) so users get a warning before submit,
// not a silent truncation here.
function toBytes32(input: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(input).slice(0, 32));
  return bytes;
}

// Built the same way deploy.ts builds browseMeContractInstance — do this
// once at module load, not per-call.
const browseMeContractInstance = CompactJs.CompiledContract.make(
  'browseme',
  (BrowseMe as any).Contract,
).pipe(CompactJs.CompiledContract.withWitnesses(witnesses)) as any;

export class ContractAPI {
  public readonly contractAddress: string;
  public readonly state$;

  private constructor(
    private readonly deployedContract: any, // type against DeployedContract<...> once contract types are wired in
    private readonly providers: BrowseMeProviders,
  ) {
    this.contractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.contractAddress, { type: 'latest' })
      .pipe
      // map raw ledger state to your derived UI state here, e.g.:
      // map((contractState) => ledger(contractState.data))
      ();
  }

  /** Deploys a fresh instance. Use once, then persist the resulting address. */
  static async deploy(providers: BrowseMeProviders, initialPrivateState: BrowseMePrivateState): Promise<ContractAPI> {
    const deployed = await deployContract(providers, {
      compiledContract: browseMeContractInstance,
      privateStateId: BROWSEME_PRIVATE_STATE_ID,
      initialPrivateState,
    });
    return new ContractAPI(deployed, providers);
  }

  /** Joins an already-deployed contract by address (the common frontend path). */
  static async join(
    providers: BrowseMeProviders,
    contractAddress: string,
    initialPrivateState: BrowseMePrivateState,
  ): Promise<ContractAPI> {
    const deployed = await findDeployedContract(providers, {
      contractAddress,
      compiledContract: browseMeContractInstance,
      privateStateId: BROWSEME_PRIVATE_STATE_ID,
      initialPrivateState,
    });
    return new ContractAPI(deployed, providers);
  }

  // ── Impure circuits (submit a transaction) ──────────────────────────
  // Signatures below are copied 1:1 from the `export circuit` declarations
  // in main.compact — argument count and order matter for callTx.

  /** main.compact: registerInvestor(investorCommitment: Bytes<32>): Bytes<32> */
  async registerInvestor(investorCommitment: Uint8Array) {
    return this.deployedContract.callTx.registerInvestor(investorCommitment);
  }

  /** main.compact: registerBusinessTrackA(businessCommitment, sector, location): Uint<64> */
  async registerBusinessTrackA(businessCommitment: Uint8Array, sector: string, location: string) {
    return this.deployedContract.callTx.registerBusinessTrackA(
      businessCommitment,
      toBytes32(sector),
      toBytes32(location),
    );
  }

  /** main.compact: registerBusinessTrackB(businessCommitment, sector, location): Uint<64> */
  async registerBusinessTrackB(businessCommitment: Uint8Array, sector: string, location: string) {
    return this.deployedContract.callTx.registerBusinessTrackB(
      businessCommitment,
      toBytes32(sector),
      toBytes32(location),
    );
  }

  /** main.compact: submitAttestation(businessId: Uint<64>, attesterType, attesterCommitment: Bytes<32>): [] */
  async submitAttestation(businessId: bigint, attesterType: AttesterType, attesterCommitment: Uint8Array) {
    return this.deployedContract.callTx.submitAttestation(businessId, attesterType, attesterCommitment);
  }

  /** main.compact: initiateHandshake(nonce: Bytes<32>, businessId: Uint<64>): [] */
  async initiateHandshake(nonce: Uint8Array, businessId: bigint) {
    return this.deployedContract.callTx.initiateHandshake(nonce, businessId);
  }

  /** main.compact: shake(nonce: Bytes<32>): [] */
  async shake(nonce: Uint8Array) {
    return this.deployedContract.callTx.shake(nonce);
  }

  /** main.compact: unshake(nonce: Bytes<32>): [] */
  async unshake(nonce: Uint8Array) {
    return this.deployedContract.callTx.unshake(nonce);
  }
}
