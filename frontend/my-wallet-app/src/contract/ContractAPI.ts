// Goes to: frontend/my-wallet-app/src/contract/ContractAPI.ts
//
// Thin wrapper over the deployed BrowseMe contract. Built the way Midnight's
// own docs build a CompiledContract (make<...>().pipe(withWitnesses(...),
// withCompiledFileAssets(...))), NOT the `as any`-cast pattern deploy.ts
// uses. Exposes the 10 `export circuit`s declared in main.compact.
//
// tierForCount and attestationNullifier are intentionally NOT wrapped here:
// they are `pure circuit` (no `export`) in main.compact.
//
// v0.2: commitments are computed in-circuit from a witness-supplied private
// form. Callers MUST call the matching set*Form method immediately before
// the registration call.
//
// v0.3: state$ is shared and replays the latest contract state (shareReplay).
//
// v0.4 (details sharing):
//   - initiateHandshake / shake generate (once) and publish this wallet's
//     encryption key.
//   - deliverMyDetails / openCounterpartyDetails exchange and verify details.
//   - join() merges any private state already stored in this browser.
//   - text encoding moved to codec.ts, which throws instead of truncating.
//
// v0.5 (attester identity forms):
//   - registerBusinessTrackB publishes the owner's encryption key.
//   - submitAttestation takes an identity form: it stages the form, builds an
//     encrypted package for the business owner and sends both.
//   - openAttesters (owner) decrypts and verifies the attester forms.
//   - deliverAttesterBundle (owner) re-encrypts the verified forms to an
//     investor after a sealed handshake; openAttesterBundle (investor) opens
//     them and matches each against the on-chain attestation commitments.

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as BrowseMe from '../../../../contracts/managed/browseme/contract/index.js';
import { witnesses, emptyPrivateState } from '../../../../contracts/src/witnesses.js';
import type {
  BusinessForm,
  InvestorForm,
  AttesterForm,
  DetailsKeyPair,
} from '../../../../contracts/src/witnesses.js';
import {
  type BrowseMeProviders,
  type BrowseMePrivateState,
  BROWSEME_PRIVATE_STATE_ID,
  type AttesterCategory,
} from './common-types';
import { firstValueFrom, map, of, shareReplay, type Observable } from 'rxjs';
import { decodeText, equalBytes, fromHex, isAllZero, toHex } from './codec';
import {
  generateKeyPair,
  randomBytes,
  openAttesterDetails,
  openAttestationBundle,
  openBusinessDetails,
  openInvestorDetails,
  sealAttesterDetails,
  sealAttestationBundle,
  sealBusinessDetails,
  sealInvestorDetails,
} from './detailsCrypto';

type LedgerView = ReturnType<typeof BrowseMe.ledger>;

// Encodes the coarse, public sector/location arguments into the fixed 32-byte
// arrays the register circuits expect. Truncates rather than throws;
// RegistrationForm validates length before submit.
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
          sector: decodeText(b.sector),
          location: decodeText(b.location),
        });
      }
      const rank = (t: number) => (t === 0 ? 99 : t);
      return out.sort((a, b) => rank(a.tier) - rank(b.tier) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }),
  );
}

// ── Deals view ───────────────────────────────────────────────────────

export type HandshakeStatus = 'PENDING' | 'SEALED' | 'ENDED';

export interface DealHandshake {
  nonce: Uint8Array;
  nonceHex: string;
  businessId: bigint;
  role: 'INVESTOR' | 'OWNER';
  status: HandshakeStatus;
  sector: string;
  location: string;
}

export interface OwnedBusiness {
  id: bigint;
  track: 'A' | 'B';
  tier: number;
  listed: boolean;
  attestations: number;
  hasUnion: boolean;
  sector: string;
  location: string;
}

export interface DealsView {
  isInvestor: boolean;
  ownedBusinesses: OwnedBusiness[];
  handshakes: DealHandshake[];
}

// Everything the connected wallet is party to, read from public ledger state.
// `callerAddress` is the same 32 bytes the contract sees via callerAddress().
export function dealsFrom(state$: Observable<any>, callerAddress: Uint8Array): Observable<DealsView> {
  const me = toHex(callerAddress);

  return state$.pipe(
    map((contractState) => {
      const view = BrowseMe.ledger(contractState.data);

      const ownedBusinesses: OwnedBusiness[] = [];
      for (const [id, owner] of view.businessOwners) {
        if (toHex(owner) !== me) continue;
        if (!view.businesses.member(id)) continue;
        const b = view.businesses.lookup(id);
        ownedBusinesses.push({
          id,
          track: b.track === 0 ? 'A' : 'B',
          tier: Number(b.tier),
          listed: b.listed,
          attestations: view.attestationCounts.member(id) ? Number(view.attestationCounts.lookup(id)) : 0,
          hasUnion: view.hasUnionAttestation.member(id) ? view.hasUnionAttestation.lookup(id) : false,
          sector: decodeText(b.sector),
          location: decodeText(b.location),
        });
      }
      ownedBusinesses.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      const handshakes: DealHandshake[] = [];
      for (const [nonce, hs] of view.pendingHandshakes) {
        const asInvestor = toHex(hs.investorId) === me;
        const asOwner =
          view.businessOwners.member(hs.businessId) &&
          toHex(view.businessOwners.lookup(hs.businessId)) === me;
        if (!asInvestor && !asOwner) continue;

        const biz = view.businesses.member(hs.businessId) ? view.businesses.lookup(hs.businessId) : null;
        handshakes.push({
          nonce,
          nonceHex: toHex(nonce),
          businessId: hs.businessId,
          role: asInvestor ? 'INVESTOR' : 'OWNER',
          status: hs.unshaken ? 'ENDED' : hs.shaken ? 'SEALED' : 'PENDING',
          sector: biz ? decodeText(biz.sector) : '',
          location: biz ? decodeText(biz.location) : '',
        });
      }
      const rank = (s: HandshakeStatus) => (s === 'PENDING' ? 0 : s === 'SEALED' ? 1 : 2);
      handshakes.sort((a, b) => rank(a.status) - rank(b.status));

      // Compare by hex instead of calling investors.member(callerAddress), the
      // same way owners and handshakes are matched above.
      let isInvestor = false;
      for (const [key] of view.investors) {
        if (toHex(key) === me) isInvestor = true;
      }

      return { isInvestor, ownedBusinesses, handshakes };
    }),
  );
}

// ── Attestation records and the attest view ──────────────────────────

export interface DetailField {
  label: string;
  value: string;
}

// One on-chain attestation: who vouched is hidden, only its type, the
// commitment to the attester's form, and the encrypted package are public.
export interface AttestationRecordView {
  id: string; // nullifier, hex
  type: number; // AttesterType: 0 community, 1 religious, 2 union, 3 education
  commitment: Uint8Array;
  publicKey: Uint8Array;
  details: Uint8Array;
}

function attestationRecordsOf(view: LedgerView, businessId: bigint): AttestationRecordView[] {
  const out: AttestationRecordView[] = [];
  for (const [nul, rec] of view.attestations) {
    if (rec.businessId !== businessId) continue;
    out.push({
      id: toHex(nul),
      type: Number(rec.attesterType),
      commitment: rec.commitment,
      publicKey: rec.publicKey,
      details: rec.details,
    });
  }
  return out;
}

export interface AttestBusinessView {
  businessId: bigint;
  tier: number;
  listed: boolean;
  sector: string;
  location: string;
  attestationCount: number;
  hasUnion: boolean;
  isOwner: boolean;
  // The owner's encryption public key, published at registration. null if the
  // business was registered before attester forms existed.
  ownerKey: Uint8Array | null;
  records: AttestationRecordView[];
}

function attestBusinessViewOf(view: LedgerView, businessId: bigint, me: string): AttestBusinessView | null {
  if (!view.businesses.member(businessId)) return null;
  const b = view.businesses.lookup(businessId);
  if (b.track === 0) return null; // attestations only apply to Track B

  const owner = view.businessOwners.member(businessId) ? toHex(view.businessOwners.lookup(businessId)) : null;
  return {
    businessId,
    tier: Number(b.tier),
    listed: b.listed,
    sector: decodeText(b.sector),
    location: decodeText(b.location),
    attestationCount: view.attestationCounts.member(businessId) ? Number(view.attestationCounts.lookup(businessId)) : 0,
    hasUnion: view.hasUnionAttestation.member(businessId) ? view.hasUnionAttestation.lookup(businessId) : false,
    isOwner: owner === me,
    ownerKey: view.businessKeys.member(businessId) ? view.businessKeys.lookup(businessId) : null,
    records: attestationRecordsOf(view, businessId),
  };
}

// One Track B business as seen by the connected wallet. Emits null when the
// business doesn't exist or isn't on Track B.
export function attestBusinessFrom(
  state$: Observable<any>,
  businessId: bigint,
  callerAddress: Uint8Array,
): Observable<AttestBusinessView | null> {
  const me = toHex(callerAddress);
  return state$.pipe(map((contractState) => attestBusinessViewOf(BrowseMe.ledger(contractState.data), businessId, me)));
}

// ── Details view ─────────────────────────────────────────────────────

export interface HandshakeDetailsView {
  nonce: Uint8Array;
  nonceHex: string;
  businessId: bigint;
  track: 'A' | 'B';
  role: 'INVESTOR' | 'OWNER';
  status: HandshakeStatus;
  sector: string;
  location: string;
  // Have I already delivered my package?
  myPackageDelivered: boolean;
  // The other side's encrypted package addressed to me, once delivered.
  theirPackage: Uint8Array | null;
  // My own encryption public key as published in this handshake.
  myPublicKey: Uint8Array;
  // The other side's encryption public key from the handshake.
  theirPublicKey: Uint8Array;
  // The commitment the other side registered on-chain (to verify against).
  theirCommitment: Uint8Array | null;
  // Track B only. The owner's registration key (for opening attester forms).
  businessKey: Uint8Array | null;
  // Track B only. The business's on-chain attestation records.
  attestationRecords: AttestationRecordView[];
  // The encrypted attester bundle for this handshake, once the owner delivered
  // it. For the owner this means "already shared"; for the investor, "received".
  attestationBundle: Uint8Array | null;
}

// What this wallet is about to share, plus a reason it can't (if any).
export interface DeliveryPreview {
  role: 'INVESTOR' | 'OWNER';
  fields: DetailField[];
  problem: string | null;
}

export type OpenResult =
  | { ok: true; fields: DetailField[]; verified: boolean }
  | { ok: false; reason: string };

// One attester as shown on screen. verified means the form's commitment
// matches an on-chain attestation record.
export interface AttesterShown {
  type: number; // -1 when no on-chain record matches
  verified: boolean;
  fields: DetailField[];
}

export type AttesterEntry =
  | { ok: true; id: string; type: number; verified: boolean; fields: DetailField[] }
  | { ok: false; id: string; type: number; reason: string };

export interface AttesterListing {
  problem: string | null;
  entries: AttesterEntry[];
}

export type AttesterBundleResult =
  | { ok: true; attesters: AttesterShown[]; onChainCount: number }
  | { ok: false; reason: string };

// One handshake as seen by one party. Emits null when the handshake doesn't
// exist or the caller isn't a party to it.
export function handshakeDetailsFrom(
  state$: Observable<any>,
  nonceHex: string,
  callerAddress: Uint8Array,
): Observable<HandshakeDetailsView | null> {
  if (!/^[0-9a-f]{64}$/i.test(nonceHex)) return of(null);
  const me = toHex(callerAddress);
  const nonce = fromHex(nonceHex.toLowerCase());

  return state$.pipe(
    map((contractState): HandshakeDetailsView | null => {
      const view = BrowseMe.ledger(contractState.data);
      if (!view.pendingHandshakes.member(nonce)) return null;
      const hs = view.pendingHandshakes.lookup(nonce);

      const asInvestor = toHex(hs.investorId) === me;
      const asOwner =
        view.businessOwners.member(hs.businessId) &&
        toHex(view.businessOwners.lookup(hs.businessId)) === me;
      if (!asInvestor && !asOwner) return null;

      const role: 'INVESTOR' | 'OWNER' = asInvestor ? 'INVESTOR' : 'OWNER';
      const biz = view.businesses.member(hs.businessId) ? view.businesses.lookup(hs.businessId) : null;
      const track: 'A' | 'B' = biz && biz.track !== 0 ? 'B' : 'A';

      const theirPackages = role === 'INVESTOR' ? view.businessPackages : view.investorPackages;
      const myPackages = role === 'INVESTOR' ? view.investorPackages : view.businessPackages;

      return {
        nonce,
        nonceHex: toHex(nonce),
        businessId: hs.businessId,
        track,
        role,
        status: hs.unshaken ? 'ENDED' : hs.shaken ? 'SEALED' : 'PENDING',
        sector: biz ? decodeText(biz.sector) : '',
        location: biz ? decodeText(biz.location) : '',
        myPackageDelivered: myPackages.member(nonce),
        theirPackage: theirPackages.member(nonce) ? theirPackages.lookup(nonce) : null,
        myPublicKey: role === 'INVESTOR' ? hs.investorKey : hs.ownerKey,
        theirPublicKey: role === 'INVESTOR' ? hs.ownerKey : hs.investorKey,
        theirCommitment:
          role === 'INVESTOR'
            ? biz
              ? biz.commitment
              : null
            : view.investors.member(hs.investorId)
              ? view.investors.lookup(hs.investorId)
              : null,
        businessKey: view.businessKeys.member(hs.businessId) ? view.businessKeys.lookup(hs.businessId) : null,
        attestationRecords: track === 'B' ? attestationRecordsOf(view, hs.businessId) : [],
        attestationBundle: view.attestationPackages.member(nonce) ? view.attestationPackages.lookup(nonce) : null,
      };
    }),
  );
}

const businessFields = (f: BusinessForm): DetailField[] => [
  { label: 'Business name', value: decodeText(f.name) },
  { label: 'What it does', value: decodeText(f.description) },
  { label: 'Contact', value: decodeText(f.contactInfo) },
  { label: 'Sector', value: decodeText(f.sector) },
  { label: 'Location', value: decodeText(f.location) },
];

const investorFields = (f: InvestorForm): DetailField[] => [
  { label: 'Name', value: decodeText(f.name) },
  { label: 'Region', value: decodeText(f.region) },
  { label: 'Business ID', value: decodeText(f.businessId) },
  { label: 'Tax ID', value: decodeText(f.taxId) },
];

const attesterFields = (f: AttesterForm): DetailField[] => [
  { label: 'Name', value: decodeText(f.name) },
  { label: 'Organisation', value: decodeText(f.organisation) },
  { label: 'Role', value: decodeText(f.position) },
  { label: 'Contact', value: decodeText(f.contactInfo) },
  { label: 'Registration / ID number', value: decodeText(f.registrationId) },
];

const OLD_REGISTRATION_PROBLEM =
  'The details stored in this browser predate verifiable commitments. Register again to share them.';
const MISMATCH_PROBLEM =
  'The details stored in this browser don’t match what this wallet committed on-chain. This happens when another registration from this wallet replaced them, or when browser storage was cleared.';
const KEY_PROBLEM =
  'The encryption key for this handshake isn’t in this browser, so the other side could not decrypt a package from you.';
const OWNER_KEY_PROBLEM =
  'The encryption key this business was registered with isn’t in this browser, so attester details can’t be opened here. Open this page from the browser profile that registered the business.';

interface MineResolved {
  role: 'INVESTOR' | 'OWNER';
  sealed: boolean;
  fields: DetailField[];
  problem: string | null;
  theirPublicKey: Uint8Array;
  privateState: BrowseMePrivateState;
}

type RecordOpening =
  | { ok: true; record: AttestationRecordView; form: AttesterForm; rand: Uint8Array; verified: boolean }
  | { ok: false; record: AttestationRecordView; reason: string };

// Type alias keeps make()'s generic argument short. Passing the REAL typed
// constructor (BrowseMe.Contract<BrowseMePrivateState>) here — not
// `(BrowseMe as any).Contract` — is what lets TS infer C correctly.
type BrowseMeContract = BrowseMe.Contract<BrowseMePrivateState>;

// withCompiledFileAssets(...) is NOT optional: deployContract's/
// findDeployedContract's overloads require the compiled contract's assets
// slot to be `never`, which only happens once this is attached.
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

    // One shared indexer subscription for the whole app, replaying the latest
    // contract state to every new subscriber. refCount is deliberately left
    // off so a StrictMode remount doesn't reset the cache.
    this.state$ = this.providers.publicDataProvider
      .contractStateObservable(this.contractAddress, { type: 'latest' })
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  /**
   * Deploys a fresh instance. Use once, then persist the resulting address.
   * No `args` field: BrowseMe's constructor takes no arguments.
   */
  static async deploy(providers: BrowseMeProviders, initialPrivateState: BrowseMePrivateState): Promise<ContractAPI> {
    const deployed = await deployContract(providers, {
      compiledContract: browseMeContractInstance,
      privateStateId: BROWSEME_PRIVATE_STATE_ID,
      initialPrivateState,
    });
    return new ContractAPI(deployed, providers);
  }

  /**
   * Joins an already-deployed contract by address (the common frontend path).
   *
   * Only `callerAddress` is read from the caller's initial state. Anything
   * already stored in this browser (registered forms, the commitment
   * randomness, the details keypair) is kept and merged over fresh defaults,
   * so reconnecting never wipes it, whichever way findDeployedContract treats
   * existing state.
   */
  static async join(
    providers: BrowseMeProviders,
    contractAddress: string,
    initialPrivateState: Pick<BrowseMePrivateState, 'callerAddress'>,
  ): Promise<ContractAPI> {
    const callerAddress = initialPrivateState.callerAddress;

    // The private state provider is scoped per contract address. It must be
    // told which one before any get/set, otherwise it throws "Contract
    // address not set".
    providers.privateStateProvider.setContractAddress(contractAddress);

    const existing = await providers.privateStateProvider.get(BROWSEME_PRIVATE_STATE_ID);
    const base = emptyPrivateState(callerAddress);
    const privateState: BrowseMePrivateState = existing ? { ...base, ...existing, callerAddress } : base;

    const deployed = await findDeployedContract(providers, {
      contractAddress,
      compiledContract: browseMeContractInstance,
      privateStateId: BROWSEME_PRIVATE_STATE_ID,
      initialPrivateState: privateState,
    });
    return new ContractAPI(deployed, providers);
  }

  // ── Private state ────────────────────────────────────────────────────

  private async getPrivateState(): Promise<BrowseMePrivateState> {
    const current = await this.providers.privateStateProvider.get(BROWSEME_PRIVATE_STATE_ID);
    if (!current) throw new Error('No private state found — join the contract first.');
    // Normalise state written by older versions of the app.
    return { ...emptyPrivateState(current.callerAddress), ...current };
  }

  // Circuits read form data via witness rather than as call arguments, so the
  // relevant form must be staged in private state before calling the matching
  // registration/attestation circuit. Call immediately before that circuit.

  async setInvestorForm(form: InvestorForm): Promise<void> {
    const current = await this.getPrivateState();
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, { ...current, investorForm: form });
  }

  async setBusinessForm(form: BusinessForm): Promise<void> {
    const current = await this.getPrivateState();
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, { ...current, businessForm: form });
  }

  // Stages everything submitAttestation's witnesses read: the attester's
  // identity secret, their form, and the commitment randomness.
  private async stageAttestation(form: AttesterForm, rand: Uint8Array, identitySecret: Uint8Array): Promise<void> {
    const current = await this.getPrivateState();
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, {
      ...current,
      attesterIdentity: { identitySecret },
      attesterForm: form,
      attesterFormRand: rand,
    });
  }

  /** The caller address bytes staged in private state when the wallet connected. */
  async getCallerAddress(): Promise<Uint8Array> {
    return (await this.getPrivateState()).callerAddress;
  }

  // The encryption keypair used to exchange details. Created on first use and
  // kept in this browser's private state; only the public half goes on-chain.
  private async ensureDetailsKeyPair(): Promise<DetailsKeyPair> {
    const current = await this.getPrivateState();
    if (current.detailsKeyPair) return current.detailsKeyPair;
    const detailsKeyPair = generateKeyPair();
    await this.providers.privateStateProvider.set(BROWSEME_PRIVATE_STATE_ID, { ...current, detailsKeyPair });
    return detailsKeyPair;
  }

  // ── Impure circuits (submit a transaction) ──────────────────────────
  // Signatures are copied 1:1 from the `export circuit` declarations in
  // main.compact — argument count and order matter for callTx.

  /** main.compact: registerInvestor(): Bytes<32>. Call setInvestorForm() first. */
  async registerInvestor() {
    return this.deployedContract.callTx.registerInvestor();
  }

  /** main.compact: registerBusinessTrackA(sector, location): Uint<64>. Call setBusinessForm() first. */
  async registerBusinessTrackA(sector: string, location: string) {
    return this.deployedContract.callTx.registerBusinessTrackA(toBytes32(sector), toBytes32(location));
  }

  /**
   * main.compact: registerBusinessTrackB(sector, location, ownerKey): Uint<64>.
   * Call setBusinessForm() first. The owner's encryption public key is
   * generated here if needed, so attesters can encrypt their details to it.
   */
  async registerBusinessTrackB(sector: string, location: string) {
    const keyPair = await this.ensureDetailsKeyPair();
    return this.deployedContract.callTx.registerBusinessTrackB(
      toBytes32(sector),
      toBytes32(location),
      keyPair.publicKey,
    );
  }

  /**
   * main.compact: submitAttestation(businessId, attesterType, ephemeralKey, details).
   *
   * Stages the attester's form, builds the package encrypted to the business
   * owner's key (with a throwaway keypair made for this one attestation, so
   * the attestation doesn't link to this wallet's other activity) and submits.
   */
  async submitAttestation(
    businessId: bigint,
    attesterType: AttesterCategory,
    form: AttesterForm,
    ownerKey: Uint8Array,
    identitySecret: Uint8Array,
  ) {
    const rand = randomBytes(32);
    const ephemeral = generateKeyPair();
    const details = sealAttesterDetails(form, rand, ownerKey, ephemeral.secretKey);
    await this.stageAttestation(form, rand, identitySecret);
    return this.deployedContract.callTx.submitAttestation(businessId, attesterType, ephemeral.publicKey, details);
  }

  /**
   * main.compact: initiateHandshake(nonce, businessId, investorKey).
   * The investor's encryption public key is generated here if needed.
   */
  async initiateHandshake(nonce: Uint8Array, businessId: bigint) {
    const keyPair = await this.ensureDetailsKeyPair();
    return this.deployedContract.callTx.initiateHandshake(nonce, businessId, keyPair.publicKey);
  }

  /**
   * main.compact: shake(nonce, ownerKey).
   * The owner's encryption public key is generated here if needed.
   */
  async shake(nonce: Uint8Array) {
    const keyPair = await this.ensureDetailsKeyPair();
    return this.deployedContract.callTx.shake(nonce, keyPair.publicKey);
  }

  /** main.compact: unshake(nonce: Bytes<32>): [] */
  async unshake(nonce: Uint8Array) {
    return this.deployedContract.callTx.unshake(nonce);
  }

  // ── Details sharing ──────────────────────────────────────────────────

  // Reads everything needed to decide whether (and what) this wallet can
  // deliver for a handshake, and why not if it can't.
  private async resolveMine(nonce: Uint8Array): Promise<MineResolved> {
    const contractState = await firstValueFrom(this.state$);
    const privateState = await this.getPrivateState();
    const view = BrowseMe.ledger(contractState.data);

    if (!view.pendingHandshakes.member(nonce)) throw new Error('This handshake does not exist on the ledger.');
    const hs = view.pendingHandshakes.lookup(nonce);

    const me = toHex(privateState.callerAddress);
    const isInvestor = toHex(hs.investorId) === me;
    const isOwner =
      view.businessOwners.member(hs.businessId) && toHex(view.businessOwners.lookup(hs.businessId)) === me;
    if (!isInvestor && !isOwner) throw new Error('This wallet is not a party to this handshake.');

    const role: 'INVESTOR' | 'OWNER' = isInvestor ? 'INVESTOR' : 'OWNER';
    const myPublishedKey = role === 'INVESTOR' ? hs.investorKey : hs.ownerKey;
    const theirPublicKey = role === 'INVESTOR' ? hs.ownerKey : hs.investorKey;

    const onChainCommitment =
      role === 'INVESTOR'
        ? view.investors.member(hs.investorId)
          ? view.investors.lookup(hs.investorId)
          : null
        : view.businesses.member(hs.businessId)
          ? view.businesses.lookup(hs.businessId).commitment
          : null;

    const rand = role === 'INVESTOR' ? privateState.investorFormRand : privateState.businessFormRand;
    let fields: DetailField[] = [];
    let problem: string | null = null;

    try {
      const local =
        role === 'INVESTOR'
          ? BrowseMe.pureCircuits.investorCommitmentOf(privateState.investorForm, rand)
          : BrowseMe.pureCircuits.businessCommitmentOf(privateState.businessForm, rand);
      fields =
        role === 'INVESTOR' ? investorFields(privateState.investorForm) : businessFields(privateState.businessForm);
      if (isAllZero(rand)) problem = OLD_REGISTRATION_PROBLEM;
      else if (!onChainCommitment || !equalBytes(local, onChainCommitment)) problem = MISMATCH_PROBLEM;
    } catch {
      // Forms stored by an older version have the wrong sizes for the new contract.
      problem = OLD_REGISTRATION_PROBLEM;
    }

    if (!problem) {
      const keyPair = privateState.detailsKeyPair;
      if (!keyPair || !equalBytes(keyPair.publicKey, myPublishedKey)) problem = KEY_PROBLEM;
    }

    return { role, sealed: hs.shaken && !hs.unshaken, fields, problem, theirPublicKey, privateState };
  }

  /** What this wallet would share for a handshake, and any reason it can't. */
  async getDeliveryPreview(nonce: Uint8Array): Promise<DeliveryPreview> {
    const mine = await this.resolveMine(nonce);
    return { role: mine.role, fields: mine.fields, problem: mine.problem };
  }

  /**
   * Encrypts this wallet's registered details to the other party's key and
   * stores the package on-chain (deliverInvestorDetails / deliverBusinessDetails).
   * Refuses unless the stored details still match the on-chain commitment.
   */
  async deliverMyDetails(nonce: Uint8Array) {
    const mine = await this.resolveMine(nonce);
    if (!mine.sealed) throw new Error('The handshake is not sealed yet.');
    if (mine.problem) throw new Error(mine.problem);

    const keyPair = mine.privateState.detailsKeyPair!;
    if (mine.role === 'INVESTOR') {
      const pkg = sealInvestorDetails(
        mine.privateState.investorForm,
        mine.privateState.investorFormRand,
        mine.theirPublicKey,
        keyPair.secretKey,
      );
      return this.deployedContract.callTx.deliverInvestorDetails(nonce, pkg);
    }
    const pkg = sealBusinessDetails(
      mine.privateState.businessForm,
      mine.privateState.businessFormRand,
      mine.theirPublicKey,
      keyPair.secretKey,
    );
    return this.deployedContract.callTx.deliverBusinessDetails(nonce, pkg);
  }

  /**
   * Decrypts the package the other party delivered and checks it against the
   * commitment they registered on-chain.
   */
  async openCounterpartyDetails(view: HandshakeDetailsView): Promise<OpenResult> {
    if (!view.theirPackage) return { ok: false, reason: 'They have not shared their details yet.' };

    const keyPair = (await this.getPrivateState()).detailsKeyPair;
    if (!keyPair) {
      return { ok: false, reason: 'This browser has no encryption key for your handshakes.' };
    }

    const cannotDecrypt: OpenResult = {
      ok: false,
      reason: 'Could not decrypt their package. It may not be addressed to the key stored in this browser.',
    };

    if (view.role === 'INVESTOR') {
      // I'm the investor: the package is the business's details.
      const opened = openBusinessDetails(view.theirPackage, view.theirPublicKey, keyPair.secretKey);
      if (!opened) return cannotDecrypt;
      let verified = false;
      try {
        const commitment = BrowseMe.pureCircuits.businessCommitmentOf(opened.form, opened.rand);
        verified = view.theirCommitment !== null && equalBytes(commitment, view.theirCommitment);
      } catch {
        verified = false;
      }
      return { ok: true, verified, fields: businessFields(opened.form) };
    }

    // I'm the business owner: the package is the investor's details.
    const opened = openInvestorDetails(view.theirPackage, view.theirPublicKey, keyPair.secretKey);
    if (!opened) return cannotDecrypt;
    let verified = false;
    try {
      const commitment = BrowseMe.pureCircuits.investorCommitmentOf(opened.form, opened.rand);
      verified = view.theirCommitment !== null && equalBytes(commitment, view.theirCommitment);
    } catch {
      verified = false;
    }
    return { ok: true, verified, fields: investorFields(opened.form) };
  }

  // ── Attester details ─────────────────────────────────────────────────

  // Owner side: decrypts each attestation record's package with this
  // browser's secret key and checks it against the record's commitment.
  private async openRecords(
    ownerKey: Uint8Array | null,
    records: AttestationRecordView[],
  ): Promise<{ problem: string | null; openings: RecordOpening[] }> {
    const keyPair = (await this.getPrivateState()).detailsKeyPair;
    if (!keyPair || !ownerKey || !equalBytes(keyPair.publicKey, ownerKey)) {
      return { problem: OWNER_KEY_PROBLEM, openings: [] };
    }

    const openings = records.map((record): RecordOpening => {
      const opened = openAttesterDetails(record.details, record.publicKey, keyPair.secretKey);
      if (!opened) {
        return { ok: false, record, reason: 'Could not decrypt this attester’s details.' };
      }
      let verified = false;
      try {
        const commitment = BrowseMe.pureCircuits.attesterCommitmentOf(opened.form, opened.rand);
        verified = equalBytes(commitment, record.commitment);
      } catch {
        verified = false;
      }
      return { ok: true, record, form: opened.form, rand: opened.rand, verified };
    });
    return { problem: null, openings };
  }

  /**
   * Business owner: the attester forms for a business, decrypted in this
   * browser and checked against each attestation's on-chain commitment.
   */
  async openAttesters(ownerKey: Uint8Array | null, records: AttestationRecordView[]): Promise<AttesterListing> {
    const { problem, openings } = await this.openRecords(ownerKey, records);
    const entries = openings.map((o): AttesterEntry =>
      o.ok
        ? { ok: true, id: o.record.id, type: o.record.type, verified: o.verified, fields: attesterFields(o.form) }
        : { ok: false, id: o.record.id, type: o.record.type, reason: o.reason },
    );
    return { problem, entries };
  }

  /** Owner, on the Details page: the attester forms that would be shared. */
  async previewAttesters(view: HandshakeDetailsView): Promise<AttesterListing> {
    return this.openAttesters(view.businessKey, view.attestationRecords);
  }

  /**
   * Owner: re-encrypts the attester forms that opened and verified to the
   * investor's key and stores the bundle on-chain (deliverAttestationDetails).
   * Forms that don't match their on-chain commitment are left out.
   */
  async deliverAttesterBundle(view: HandshakeDetailsView) {
    if (view.role !== 'OWNER') throw new Error('Only the business owner can share attester details.');
    if (view.status !== 'SEALED') throw new Error('The handshake is not sealed yet.');

    const keyPair = (await this.getPrivateState()).detailsKeyPair;
    if (!keyPair || !equalBytes(keyPair.publicKey, view.myPublicKey)) throw new Error(KEY_PROBLEM);

    const { problem, openings } = await this.openRecords(view.businessKey, view.attestationRecords);
    if (problem) throw new Error(problem);

    const entries = openings.flatMap((o) => (o.ok && o.verified ? [{ form: o.form, rand: o.rand }] : []));
    if (entries.length === 0) {
      throw new Error('There are no attester details with a matching on-chain commitment to share yet.');
    }

    const bundle = sealAttestationBundle(entries, view.theirPublicKey, keyPair.secretKey);
    return this.deployedContract.callTx.deliverAttestationDetails(view.nonce, bundle);
  }

  /**
   * Investor: decrypts the bundle the owner delivered and matches each form
   * against the business's on-chain attestation commitments.
   */
  async openAttesterBundle(view: HandshakeDetailsView): Promise<AttesterBundleResult> {
    if (!view.attestationBundle) {
      return { ok: false, reason: 'The owner has not shared attester details yet.' };
    }

    const keyPair = (await this.getPrivateState()).detailsKeyPair;
    if (!keyPair) {
      return { ok: false, reason: 'This browser has no encryption key for your handshakes.' };
    }

    const opened = openAttestationBundle(view.attestationBundle, view.theirPublicKey, keyPair.secretKey);
    if (!opened) {
      return {
        ok: false,
        reason: 'Could not decrypt the attester details. They may not be addressed to the key stored in this browser.',
      };
    }

    const attesters = opened.map(({ form, rand }): AttesterShown => {
      let commitment: Uint8Array | null = null;
      try {
        commitment = BrowseMe.pureCircuits.attesterCommitmentOf(form, rand);
      } catch {
        commitment = null;
      }
      const match = commitment
        ? view.attestationRecords.find((r) => equalBytes(r.commitment, commitment!))
        : undefined;
      return { type: match ? match.type : -1, verified: !!match, fields: attesterFields(form) };
    });

    return { ok: true, attesters, onChainCount: view.attestationRecords.length };
  }
}
