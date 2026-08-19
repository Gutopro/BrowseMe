// Required for GraphQL subscriptions (wallet sync) to work in Node.js — the
// SDK expects a global WebSocket, which only exists in browsers by default.
// Must be set before any wallet code runs its sync/subscription logic.
import { WebSocket } from 'ws';
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import {
  WalletFacade,
  WalletEntrySchema,
  mergeWalletEntries,
} from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import {
  UnshieldedWallet,
  createKeystore,
  PublicKey,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import type { MidnightProvider, MidnightProviders, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import * as CompactJs from '@midnight-ntwrk/compact-js';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';

// ── Compiled BrowseMe contract + witnesses ───────────────────────────────────
// This script lives at contracts/src/deploy.ts, alongside witnesses.ts, so
// witnesses.js is a same-directory import. The root package.json's "compile"
// script runs `compact compile contracts/main.compact contracts/managed/browseme`,
// so the compiled output lands at contracts/managed/browseme, not contracts/managed.
import * as BrowseMe from '../managed/browseme/contract/index.js';
import { witnesses, createBrowseMePrivateState, type BrowseMePrivateState } from './witnesses.js';
// ─────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INDEXER_PORT = 8088;
const NODE_PORT = 9944;
const PROOF_SERVER_PORT = 6300;

const LOCAL_NETWORK = {
  node: `ws://127.0.0.1:${NODE_PORT}`,
  indexerHttp: `http://127.0.0.1:${INDEXER_PORT}/api/v4/graphql`,
  indexerWs: `ws://127.0.0.1:${INDEXER_PORT}/api/v4/graphql/ws`,
  proofServer: `http://127.0.0.1:${PROOF_SERVER_PORT}`,
  zkArtifactsDir: join(__dirname, '../managed/browseme'),
};

const NETWORK_ID = 'undeployed';

const DEV_SEED_HEX = '0000000000000000000000000000000000000000000000000000000000000001';

function deriveKeysFromSeed(seedHex: string): Record<number, Uint8Array> {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seedHex, 'hex'));
  if (hdWallet.type !== 'seedOk') {
    throw new Error('Failed to initialize HDWallet from seed');
  }
  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivationResult.type !== 'keysDerived') {
    throw new Error('Failed to derive keys');
  }
  hdWallet.hdWallet.clear();
  return derivationResult.keys;
}

/** Extract coin public key from ZswapSecretKeys (tries multiple APIs) */
function getShieldedCoinPublicKey(secretKeys: ledger.ZswapSecretKeys): any {
  const sk = secretKeys as any;
  if (typeof sk.getCoinPublicKey === 'function') return sk.getCoinPublicKey();
  if (sk.coinPublicKey) return sk.coinPublicKey;
  if (sk.publicKey) return sk.publicKey;
  if (sk.verificationKey) return sk.verificationKey;
  throw new Error(
    'Cannot extract coin public key from ZswapSecretKeys. Available: ' +
      Object.keys(sk).join(', '),
  );
}

/** Extract encryption public key from ZswapSecretKeys (tries multiple APIs) */
function getShieldedEncryptionPublicKey(secretKeys: ledger.ZswapSecretKeys): any {
  const sk = secretKeys as any;
  if (typeof sk.getEncryptionPublicKey === 'function') return sk.getEncryptionPublicKey();
  if (sk.encryptionPublicKey) return sk.encryptionPublicKey;
  throw new Error(
    'Cannot extract encryption public key from ZswapSecretKeys. Available: ' +
      Object.keys(sk).join(', '),
  );
}

const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: 'proof' | 'pre-proof',
): void => {
  if (!tx.intents || tx.intents.size === 0) return;

  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;

    const cloned = ledger.Intent.deserialize(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );

    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);

    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: any, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }

    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: any, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }

    tx.intents.set(segment, cloned);
  }
};

export async function main(): Promise<string> {
  console.log('[INFO] Setting network ID...');
  setNetworkId(NETWORK_ID as any);

  console.log('[INFO] Deriving keys from seed...');
  const keys = deriveKeysFromSeed(DEV_SEED_HEX);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], NETWORK_ID);

  console.log('[INFO] Initializing wallet facade...');

  // With @midnight-ntwrk/ledger-v8 pinned to a single version via the
  // "overrides" entry in package.json, there is now exactly one copy of
  // the wasm module in node_modules, so a single LedgerParameters
  // instance satisfies every `instanceof` check across the SDK.
  const ledgerParams = ledger.LedgerParameters.initialParameters();

  const wallet = await WalletFacade.init({
    configuration: {
      networkId: NETWORK_ID,
      costParameters: {
        feeBlocksMargin: 5,
        ledgerParams,
        additionalFeeOverhead: 300_000_000_000_000n,
      },
      relayURL: new URL(LOCAL_NETWORK.node),
      provingServerUrl: new URL(LOCAL_NETWORK.proofServer),
      indexerClientConnection: {
        indexerHttpUrl: new URL(LOCAL_NETWORK.indexerHttp),
        indexerWsUrl: new URL(LOCAL_NETWORK.indexerWs),
      },
      // Without this, WalletFacade.init threads `undefined` into the
      // shielded/unshielded/dust services' internal history writers, which
      // crashes with "Cannot read properties of undefined (reading 'upsert')"
      // every time a tx is recorded. In-memory is fine for a one-shot deploy
      // script; swap for a persisted TransactionHistoryStorage if the
      // wallet-daemon needs history to survive restarts.
      txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    },
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledgerParams.dust),
  });

  await wallet.start(shieldedSecretKeys, dustSecretKey);
  console.log('[OK] Wallet facade started');

  console.log('[INFO] Waiting for wallet sync...');
  const syncedState = await wallet.waitForSyncedState();
  console.log('[OK] Wallet synced. Dust balance:', syncedState.dust.totalCoins);

  const signFn = (payload: Uint8Array) => unshieldedKeystore.signData(payload);

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => getShieldedCoinPublicKey(shieldedSecretKeys),
    getEncryptionPublicKey: () => getShieldedEncryptionPublicKey(shieldedSecretKeys),
    balanceTx: async (tx: any, ttl?: number) => {
      // balanceUnboundTransaction expects `ttl` as a Date, not a raw
      // number/timestamp — and deployContract doesn't always supply one,
      // so it can arrive here as undefined. Passing `{ ttl: undefined }`
      // through crashes inside the SDK when it calls `ttl.getTime()`.
      const resolvedTtl = ttl !== undefined ? new Date(ttl) : new Date(Date.now() + 30 * 60 * 1000);
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys, dustSecretKey },
        { ttl: resolvedTtl },
      );
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return wallet.finalizeRecipe(recipe);
    },
  };

  // midnight-js-contracts' MidnightProvider interface calls
  // `providers.midnightProvider.submitTx(...)`, but WalletFacade only
  // exposes `submitTransaction(...)` — passing the raw `wallet` object
  // through fails with "submitTx is not a function". Adapt it, the same
  // way `walletProvider` above adapts `balanceUnboundTransaction`.
  const midnightProvider: MidnightProvider = {
    submitTx: (tx: any) => wallet.submitTransaction(tx),
  };

  console.log('[INFO] Assembling providers...');
  const zkConfigProvider = new NodeZkConfigProvider(LOCAL_NETWORK.zkArtifactsDir);

  const providers: MidnightProviders = {
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: () => 'Local-dev-password$',
      accountId: String(unshieldedKeystore.getBech32Address()),
    }),
    publicDataProvider: indexerPublicDataProvider(
      new URL(LOCAL_NETWORK.indexerHttp),
      new URL(LOCAL_NETWORK.indexerWs),
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(new URL(LOCAL_NETWORK.proofServer), zkConfigProvider),
    walletProvider,
    midnightProvider,
  };

  // ── Caller address for the `callerAddress` witness ─────────────────────
  // main.compact declares `witness callerAddress(): Bytes<32>` and every
  // circuit calls `disclose(callerAddress())` to stamp the caller onto
  // ledger state (businessOwners, investors, handshake parties, etc).
  // witnesses.ts wants a 32-byte Uint8Array in BrowseMePrivateState.
  //
  // Was: fromHex(unshieldedKeystore.getAddress()) — needs an undeclared package
  const callerAddressBytes = new Uint8Array(Buffer.from(unshieldedKeystore.getAddress(), 'hex'));

  console.log('[VERIFY] hex address:  ', unshieldedKeystore.getAddress());
  console.log('[VERIFY] bech32 address:', unshieldedKeystore.getBech32Address().asString());

  console.log('[INFO] Creating BrowseMe contract instance...');
  // CompiledContract.make(tag, ctor) wants the raw contract *constructor*
  // (as exported from the compiled Compact output) — internally it later
  // does `new context.ctor(witnesses)` itself. Passing an already-built
  // instance here breaks that. Unlike the Credit contract (which has no
  // witnesses and uses `withVacantWitnesses`), BrowseMe declares a real
  // `callerAddress` witness, so we attach the actual witnesses object via
  // `withWitnesses` instead.
  const browseMeContractInstance = CompactJs.CompiledContract.make(
    'browseme',
    (BrowseMe as any).Contract,
  ).pipe(CompactJs.CompiledContract.withWitnesses(witnesses)) as any;

  const initialPrivateState: BrowseMePrivateState = createBrowseMePrivateState(callerAddressBytes);

  console.log('[INFO] Deploying BrowseMe contract...');
  const deployed = await deployContract(providers, {
    compiledContract: browseMeContractInstance,
    privateStateId: 'browseme-private-state',
    initialPrivateState,
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log(`[OK] Contract deployed at: ${contractAddress}`);

  await wallet.stop();
  return contractAddress;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('[ERR]', err);
    process.exit(1);
  });
}
