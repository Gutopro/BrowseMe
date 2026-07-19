'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track if we are doing auto-connect to avoid race conditions
  const autoConnectAttempted = useRef(false);

  // --- SAFE BALANCE PARSING (kept from before) ---
  const parseBalance = (raw: any): string => {
    if (raw === null || raw === undefined) return '0.00';
    let balanceString = '';
    if (typeof raw === 'string') balanceString = raw;
    else if (typeof raw === 'bigint' || typeof raw === 'number') balanceString = raw.toString(10);
    else if (raw instanceof Uint8Array) {
      balanceString = Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (typeof raw === 'object') {
      if (raw.coin !== undefined) balanceString = String(raw.coin);
      else if (raw.lovelace !== undefined) balanceString = String(raw.lovelace);
      else if (raw.toString && raw.toString !== Object.prototype.toString) balanceString = raw.toString();
      else {
        const match = JSON.stringify(raw).match(/\d+/);
        if (match) balanceString = match[0];
        else return '0.00';
      }
    } else return '0.00';

    const cleaned = balanceString.replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length === 0) return '0.00';
    let lovelace = 0;
    const isHex = /[a-fA-F]/.test(cleaned) && cleaned.length > 8;
    try {
      lovelace = isHex ? parseInt(cleaned, 16) : parseInt(cleaned, 10);
    } catch (_) { lovelace = 0; }
    if (isNaN(lovelace) || lovelace < 0) return '0.00';
    return (lovelace / 1_000_000).toFixed(2);
  };

  // --- CORE CONNECT LOGIC (Resilient to Shutdown) ---
  const connect = async (): Promise<void> => {
    setError(null);
    setConnecting(true);

    try {
      // 1. Check wallet presence
      if (!window.cardano) {
        throw new Error('No wallet found. Please install Nami, Eternl, or Flint.');
      }

      const walletNames = Object.keys(window.cardano);
      if (walletNames.length === 0) throw new Error('No wallet extension detected.');
      
      const walletName = walletNames[0];
      const wallet = window.cardano[walletName];

      // 2. IMPORTANT: Request a FRESH api connection.
      // Even if we have a cached one, we call enable() again.
      // This re-establishes the bridge if the worker went to sleep.
      const api = await wallet.enable();

      // 3. Get addresses (with a safety check for the API dying mid-call)
      let usedAddresses;
      try {
        usedAddresses = await api.getUsedAddresses();
      } catch (innerError: any) {
        // If this fails with "shutdown", we just bubble up a clear error
        if (innerError.message?.includes('shutdown') || innerError.message?.includes('RemoteApiShutdownError')) {
          throw new Error('Wallet connection expired. Please click "Connect" again to refresh.');
        }
        throw innerError;
      }

      if (!usedAddresses || usedAddresses.length === 0) {
        throw new Error('No addresses found in wallet.');
      }
      const firstAddress = usedAddresses[0];

      // 4. Get balance
      const rawBalance = await api.getBalance();
      const formattedBalance = parseBalance(rawBalance);

      // 5. Update State
      setAddress(firstAddress);
      setBalance(`${formattedBalance} ₳`);
      setIsConnected(true);
      localStorage.setItem('walletAddress', firstAddress);
      window.__walletApi = api; // Store it, but remember it might die later

    } catch (err: any) {
      console.error('Wallet connection error:', err);
      
      // Special friendly message for the shutdown error
      let errorMessage = err.message || 'Failed to connect wallet.';
      if (errorMessage.includes('shutdown') || errorMessage.includes('RemoteApiShutdownError')) {
        errorMessage = 'Wallet connection expired. Please click "Connect" again to refresh.';
      }
      
      setError(errorMessage);
      setIsConnected(false);
      setAddress(null);
      setBalance(null);
      // Clear any stale cached API
      window.__walletApi = undefined;
    } finally {
      setConnecting(false);
    }
  };

  // --- DISCONNECT ---
  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setBalance(null);
    setError(null);
    localStorage.removeItem('walletAddress');
    window.__walletApi = undefined;
  };

  // --- AUTO-CONNECT ON MOUNT (with a delay to let the extension wake up) ---
  useEffect(() => {
    // Only run once
    if (autoConnectAttempted.current) return;
    autoConnectAttempted.current = true;

    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress && window.cardano) {
      // Give the browser/wallet extension 500ms to fully initialize its background worker
      const timer = setTimeout(() => {
        connect().catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []); // Empty dependency array ensures it runs once

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        balance,
        connecting,
        connect,
        disconnect,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Extend the Window interface
declare global {
  interface Window {
    cardano: any;
    __walletApi: any;
  }
}