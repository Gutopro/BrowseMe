// src/WalletContext.tsx
import React, { createContext, useContext, useRef, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { selectWallet } from './selectWallet';
import { ContractAPI } from './contract/ContractAPI';
import { initializeProviders, callerAddressBytesFromWallet } from './providers';
import type { BusinessForm, InvestorForm, AttesterIdentity } from '../../../contracts/src/witnesses';

const CONTRACT_ADDRESS = import.meta.env.VITE_BROWSEME_CONTRACT_ADDRESS as string;

// 1AM refuses connections while it is syncing (for example right after a
// transaction). Retry instead of failing, for roughly a minute in total.
const MAX_SYNC_ATTEMPTS = 20;
const SYNC_RETRY_MS = 3000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isSyncingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /syncing|sync to finish/i.test(message);
}

const emptyBytes32 = () => new Uint8Array(32);

function buildInitialPrivateState(callerAddress: Uint8Array) {
  const emptyBusinessForm: BusinessForm = {
    name: emptyBytes32(), description: emptyBytes32(), contactInfo: emptyBytes32(),
    sector: emptyBytes32(), location: emptyBytes32(),
  };
  const emptyInvestorForm: InvestorForm = {
    name: emptyBytes32(), region: emptyBytes32(), businessId: emptyBytes32(), taxId: emptyBytes32(),
  };
  const emptyAttesterIdentity: AttesterIdentity = { identitySecret: emptyBytes32() };
  return { callerAddress, businessForm: emptyBusinessForm, investorForm: emptyInvestorForm, attesterIdentity: emptyAttesterIdentity };
}

export function isLikelySessionExpiry(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /session|expired|timeout|not connected|disconnected/i.test(message);
}

interface WalletContextValue {
  isConnected: boolean;
  walletAddress: string | null;
  contractAPI: ContractAPI | null;
  contractError: string | null;
  connectionError: string | null;
  connecting: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [contractAPI, setContractAPI] = useState<ContractAPI | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const connectedApiRef = useRef<ConnectedAPI | null>(null);

  const connect = async (): Promise<boolean> => {
    setConnecting(true);
    setConnectionError(null);
    let connected = false;
    let address: string | null = null;

    for (let attempt = 0; ; attempt++) {
      try {
        const wallet = selectWallet();
        if (!wallet) {
          throw new Error(
            'No Midnight wallet found. Install or enable the extension and allow site access for localhost.'
          );
        }
        const connectedApi = await wallet.connect('undeployed');
        connectedApiRef.current = connectedApi;

        const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
        address = unshieldedAddress;

        const connectionStatus = await connectedApi.getConnectionStatus();
        connected = connectionStatus.status === 'connected';
        setConnectionError(null);
        break;
      } catch (error) {
        if (isSyncingError(error) && attempt < MAX_SYNC_ATTEMPTS - 1) {
          setConnectionError('Wallet is still syncing — retrying…');
          await sleep(SYNC_RETRY_MS);
          continue;
        }
        console.error('Wallet connection failed:', error);
        setConnectionError(
          error instanceof Error ? error.message : 'Wallet connection failed.'
        );
        break;
      }
    }

    setIsConnected(connected);
    setWalletAddress(address);
    setContractError(null);
    setContractAPI(null);

    if (connected) {
      try {
        if (!CONTRACT_ADDRESS) {
          throw new Error('VITE_BROWSEME_CONTRACT_ADDRESS is not set.');
        }
        const providers = await initializeProviders(connectedApiRef.current!);
        const callerAddress = await callerAddressBytesFromWallet(connectedApiRef.current!);
        const initialPrivateState = buildInitialPrivateState(callerAddress);
        const api = await ContractAPI.join(providers, CONTRACT_ADDRESS, initialPrivateState);
        setContractAPI(api);
      } catch (error) {
        console.error('Contract join failed:', error);
        setContractError(error instanceof Error ? error.message : 'Failed to join the deployed contract.');
      }
    }

    setConnecting(false);
    return connected;
  };

  const disconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setContractAPI(null);
    setContractError(null);
    setConnectionError(null);
    connectedApiRef.current = null;
  };

  return (
    <WalletContext.Provider
      value={{ isConnected, walletAddress, contractAPI, contractError, connectionError, connecting, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
