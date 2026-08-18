import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export const listWallets = (): InitialAPI[] => {
  const injected = window.midnight;
  return injected ? Object.values(injected) : [];
};

export const selectWallet = (): InitialAPI => {
  const wallets = listWallets();

  if (wallets.length === 0) {
    throw new Error('No Midnight wallet found. Please install a Midnight wallet extension.');
  }

  return wallets[0];
};
