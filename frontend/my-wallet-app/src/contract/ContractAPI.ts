// Goes to: frontend/my-wallet-app/src/contract/ContractAPI.ts
//
// Thin wrapper over the deployed BrowseMe contract. Built the way Midnight's
// own docs build a CompiledContract (make<...>().pipe(withWitnesses(...),
// withCompiledFileAssets(...))), NOT the `as any`-cast pattern deploy.ts
// uses — that cast was hiding the same type errors we were chasing, not
// solving them. Exposes only the 7 `export circuit`s declared in
// main.compact.
//
// tierForCount and attestationNullifier are intentionally NOT wrapped here:
// they are `pure circuit` (no `export`) in main.compact, called only from
// inside submitAttestation, and are not present on the compiled contract's
// generated TS API.

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
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

// Type alias keeps make()'s generic argument short. Passing the REAL typed
// constructor (BrowseMe.Contract<BrowseMePrivateState>) here — not
// `(BrowseMe as any).Contract` — is what lets TS infer C correctly; an
// `any`-typed second argument is what collapsed withWitnesses' parameter
// type to `never` in the last build.
type BrowseMeContract = BrowseMe.Contract<BrowseMePrivateState>;

// withCompiledFileAssets(...) is NOT optional: deployContract's/
// findDeployedContract's overloads require the compiled contract's assets
// slot to be `never`, which only happens once this is attached. Skipping
// it is what caused deployContract's overloads to fall apart (rejecting
// privateStateId on one, demanding an `args` field on the other).
//
// Path mirrors the relative-path pattern the imports above already use
// (four levels up to contracts/managed/browseme) — verify against
// contracts/src/deploy.ts's `zkArtifactsDir` if this doesn't resolve.
const browseMeContractInstance = CompiledContract.make<BrowseMeContract>(
  'browseme',
  BrowseMe.Contract<BrowseMePrivateState>,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('../../../../contracts/managed/browseme'),
);

export class ContractAPI {
  public readonly contractAddress: string;
  public readonly state$;

  private readonly deployedContract: any; // type against DeployedContract<...> once contract types are wired in
  private readonly providers: BrowseMeProviders;

  private constructor(deployedContract: any, providers: BrowseMeProviders) {
    this.deployedContract = deployedContract;
    this.providers = providers;
    this.contractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = this.providers.publicDataProvider
      .contractStateObservable(this.contractAddress, { type: 'latest' })
      // map raw ledger state to your derived UI state here, e.g.:
      // map((contractState) => ledger(contractState.data))
      .pipe();
  }

  /**
   * Deploys a fresh instance. Use once, then persist the resulting address.
   * No `args` field: BrowseMe's constructor takes no arguments, and once
   * that's true, `args` must be omitted entirely rather than passed as
   * `[]` — passing it (even empty) is what triggered the second build
   * error.
   */
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
