'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  connecting: boolean;
  connect: (walletName: string) => Promise<void>;
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
  const autoConnectAttempted = useRef(false);

  // --- SAFE BALANCE PARSING (same as before) ---
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

  // --- CONNECT with wallet selection ---
  const connect = async (walletName: string): Promise<void> => {
    setError(null);
    setConnecting(true);

    try {
      if (!window.cardano) {
        throw new Error('No wallet found. Please install Nami, Eternl, or Flint.');
      }

      const wallet = window.cardano[walletName];
      if (!wallet) {
        throw new Error(`Wallet "${walletName}" not found. Please install it first.`);
      }

      // Request a fresh API connection
      const api = await wallet.enable();

      let usedAddresses;
      try {
        usedAddresses = await api.getUsedAddresses();
      } catch (innerError: any) {
        if (innerError.message?.includes('shutdown') || innerError.message?.includes('RemoteApiShutdownError')) {
          throw new Error('Wallet connection expired. Please try again.');
        }
        throw innerError;
      }

      if (!usedAddresses || usedAddresses.length === 0) {
        throw new Error('No addresses found in wallet.');
      }
      const firstAddress = usedAddresses[0];

      const rawBalance = await api.getBalance();
      const formattedBalance = parseBalance(rawBalance);

      setAddress(firstAddress);
      setBalance(`${formattedBalance} ₳`);
      setIsConnected(true);
      
      // Save both address AND the selected wallet name
      localStorage.setItem('walletAddress', firstAddress);
      localStorage.setItem('selectedWallet', walletName);
      window.__walletApi = api;

    } catch (err: any) {
      console.error('Wallet connection error:', err);
      let errorMessage = err.message || 'Failed to connect wallet.';
      if (errorMessage.includes('shutdown') || errorMessage.includes('RemoteApiShutdownError')) {
        errorMessage = 'Wallet connection expired. Please try again.';
      }
      setError(errorMessage);
      setIsConnected(false);
      setAddress(null);
      setBalance(null);
      window.__walletApi = undefined;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setBalance(null);
    setError(null);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('selectedWallet');
    window.__walletApi = undefined;
  };

  // --- AUTO-CONNECT using the previously selected wallet ---
  useEffect(() => {
    if (autoConnectAttempted.current) return;
    autoConnectAttempted.current = true;

    const savedAddress = localStorage.getItem('walletAddress');
    const savedWallet = localStorage.getItem('selectedWallet');
    
    if (savedAddress && savedWallet && window.cardano) {
      const timer = setTimeout(() => {
        connect(savedWallet).catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

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

declare global {
  interface Window {
    cardano: any;
    __walletApi: any;
  }
}