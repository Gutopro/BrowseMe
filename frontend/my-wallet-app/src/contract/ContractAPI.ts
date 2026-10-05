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
//
// v0.2 UPDATE (commitments fixed): registerInvestor, registerBusinessTrackA/B,
// and submitAttestation no longer take a caller-supplied *Commitment argument.
// The commitment is now computed in-circuit from a witness-supplied private
// form (see contracts/src/witnesses.ts and main.compact). Callers MUST call
// the matching set*Form/setAttesterIdentity method below to stage the form
// in private state immediately before invoking the registration/attestation
// call — the witness reads back whatever is currently staged there at
// proving time.

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as BrowseMe from '../../../../contracts/managed/browseme/contract/index.js';
import { witnesses } from '../../../../contracts/src/witnesses.js';
import type { BusinessForm, InvestorForm, AttesterIdentity } from '../../../../contracts/src/witnesses.js';
import {
  type BrowseMeProviders,
  type BrowseMePrivateState,
  BROWSEME_PRIVATE_STATE_ID,
  AttesterCategory,
} from './common-types';
import { map, type Observable } from 'rxjs';

// Encodes free-text form input into the fixed 32-byte arrays the circuits
// expect. Truncates rather than throws — validate length in the form
// itself (RegistrationForm.tsx) so users get a warning before submit,
// not a silent truncation here.
function toBytes32(input: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(input).slice(0, 32));
  return bytes;
}

export interface ListedBusiness {
  id: bigint;
  track: 'A' | 'B';
  tier: number; // 0 = pending, 1 = T1 (highest) .. 3 = T3
  status: 'INVESTING' | 'OPEN';
  sector: string;
  location: string;
}

// Inverse of toBytes32: drops the trailing zero padding and decodes UTF-8.
function fromBytes32(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return new TextDecoder().decode(bytes.slice(0, end));
}

// Maps the contract's public `businesses` map to the listed entries only.
// Enums compile to numbers: Track.TRACK_A = 0, Status.INVESTING = 0.
// Deliberately ignores businessOwners and the per-business commitment.
export function listedBusinessesFrom(state$: Observable<any>): Observable<ListedBusiness[]> {
  return state$.pipe(
    map((contractState) => {
      const view = BrowseMe.ledger(contractState.data);
      const out: ListedBusiness[] = [];
      for (const [id, b] of view.businesses) {
        if (!b.listed) continue;
        out.push({
          id,
          track: b.track === 0 ? 'A' : 'B',
          tier: Number(b.tier),
          status: b.status === 0 ? 'INVESTING' : 'OPEN',
          sector: fromBytes32(b.sector),
          location: fromBytes32(b.location),
        });
      }
      const rank = (t: number) => (t === 0 ? 99 : t);
      return out.sort((a, b) => rank(a.tier) - rank(b.tier) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }),
  );
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

  // ── Private state updates ────────────────────────────────────────────
  // Circuits now read form data via witness rather than as call arguments,
  // so the relevant field must be staged in private state before calling
  // the matching registration/attestation circuit. Each method reads the
  // current private state, merges in the new value, and writes it back.
  // Call immediately before the matching circuit call — not meant to
  // persist across unrelated calls.

  async setInvestorForm(form: InvestorForm): Promise<void> {
    const current = await this.providers.privateStateProvider.get(BROWSEME_PRIVATE_STATE_ID);
    if (!current) throw new Error('No private state found — join the contract before registering.');
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, {
      ...current,
      investorForm: form,
    });
  }

  async setBusinessForm(form: BusinessForm): Promise<void> {
    const current = await this.providers.privateStateProvider.get(BROWSEME_PRIVATE_STATE_ID);
    if (!current) throw new Error('No private state found — join the contract before registering.');
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, {
      ...current,
      businessForm: form,
    });
  }

  async setAttesterIdentity(identity: AttesterIdentity): Promise<void> {
    const current = await this.providers.privateStateProvider.get(BROWSEME_PRIVATE_STATE_ID);
    if (!current) throw new Error('No private state found — join the contract before registering.');
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, {
      ...current,
      attesterIdentity: identity,
    });
  }

  // ── Impure circuits (submit a transaction) ──────────────────────────
  // Signatures below are copied 1:1 from the `export circuit` declarations
  // in main.compact — argument count and order matter for callTx.

  /**
   * main.compact: registerInvestor(): Bytes<32>
   * Call setInvestorForm() first — the commitment is computed in-circuit
   * from privateState.investorForm + a fresh witness-generated rand.
   */
  async registerInvestor() {
    return this.deployedContract.callTx.registerInvestor();
  }

  /**
   * main.compact: registerBusinessTrackA(sector, location): Uint<64>
   * Call setBusinessForm() first — the commitment is computed in-circuit
   * from privateState.businessForm + a fresh witness-generated rand.
   */
  async registerBusinessTrackA(sector: string, location: string) {
    return this.deployedContract.callTx.registerBusinessTrackA(
      toBytes32(sector),
      toBytes32(location),
    );
  }

  /**
   * main.compact: registerBusinessTrackB(sector, location): Uint<64>
   * Call setBusinessForm() first — the commitment is computed in-circuit
   * from privateState.businessForm + a fresh witness-generated rand.
   */
  async registerBusinessTrackB(sector: string, location: string) {
    return this.deployedContract.callTx.registerBusinessTrackB(
      toBytes32(sector),
      toBytes32(location),
    );
  }

  /**
   * main.compact: submitAttestation(businessId: Uint<64>, attesterType: AttesterType): []
   * attesterType is main.compact's AttesterType enum (COMMUNITY, RELIGIOUS,
   * UNION, EDUCATION) — see common-types.ts AttesterCategory. Call
   * setAttesterIdentity() first — the commitment is computed in-circuit
   * from privateState.attesterIdentity + a fresh witness-generated rand.
   */
  async submitAttestation(businessId: bigint, attesterType: AttesterCategory) {
    return this.deployedContract.callTx.submitAttestation(businessId, attesterType);
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
