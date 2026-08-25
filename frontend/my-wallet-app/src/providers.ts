// Goes to: frontend/my-wallet-app/src/providers.ts
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
//
// Wraps the raw window.midnight InitialAPI (from selectWallet.ts) into
// everything ContractAPI needs: a connected wallet session, decoded
// address bytes for witnesses, and the full Midnight provider set.

import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { Transaction } from '@midnight-ntwrk/ledger-v8'; // adjust to your actual ledger import path
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { BrowseMeProviders } from './contract/common-types';

// Match this to whatever network you're deploying against. Pull from
// an env var (VITE_NETWORK) rather than hardcoding once you have more
// than one target — see the multi-network skill notes for the pattern.
export const NETWORK_ID = 'undeployed';
setNetworkId(NETWORK_ID as any);

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}
function fromHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

/**
 * Connects to a wallet returned by selectWallet.ts / listWallets().
 * v4 dapp-connector-api removed enable()/isEnabled() — connect(networkId)
 * does both the permission prompt and the connection in one call, and can
 * reject with PermissionRejected or Disconnected, so call this from inside
 * a try/catch around your "Connect Wallet" button handler.
 */
export async function connectWallet(wallet: InitialAPI): Promise<ConnectedAPI> {
  return wallet.connect(NETWORK_ID);
}

/**
 * Your main.compact witness declares callerAddress as raw Bytes<32>, but
 * the connector API only ever returns addresses as Bech32m strings
 * (e.g. "mn_addr_undeployed1..."). Decode once per session and reuse —
 * don't re-parse this on every call.
 */
export async function callerAddressBytesFromWallet(connected: ConnectedAPI): Promise<Uint8Array> {
  const { unshieldedAddress } = await connected.getUnshieldedAddress();
  const parsed = MidnightBech32m.parse(unshieldedAddress).decode(UnshieldedAddress, NETWORK_ID);
  return new Uint8Array(parsed.data);
}

/**
 * Builds the full Midnight provider set from a connected wallet session.
 * Pass the result straight into ContractAPI.join(...) / deploy(...).
 */
export async function initializeProviders(connected: ConnectedAPI): Promise<BrowseMeProviders> {
  const config = await connected.getConfiguration();
  const shielded = await connected.getShieldedAddresses();
  const { unshieldedAddress } = await connected.getUnshieldedAddress();

  if (!config.proverServerUri) {
    throw new Error(
      'Wallet did not report a proverServerUri. On preview/mainnet the wallet ' +
      'proxies proving via 1AM — you may need getProvingProvider() instead ' +
      'of httpClientProofProvider here. See the multi-network skill notes.',
    );
  }

  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));

  return {
    // levelPrivateStateProvider() needs a config object — calling it with no
    // arguments leaves that config undefined internally, which is what
    // crashed with "Cannot read properties of undefined" here.
    // Dev-only placeholder password; swap for a real secret-prompt flow
    // (or at least an env var) before this touches anything but 'undeployed'.
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: () => 'Local-dev-password$',
      accountId: unshieldedAddress,
    }),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (tx: { serialize: () => Uint8Array }, _newCoins?: unknown) => {
        const { tx: balancedHex } = await connected.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balancedHex));
      },
    },
    midnightProvider: {
      submitTx: async (tx: { serialize: () => Uint8Array; identifiers: () => string[] }) => {
        await connected.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  } as unknown as BrowseMeProviders;
}
