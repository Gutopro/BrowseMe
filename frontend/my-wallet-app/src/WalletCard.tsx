import React, { useState } from "react";
import type { WalletCardProps } from "./types";
import "./WalletCard.css";

const truncateAddress = (address: string): string => {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}…${address.slice(-8)}`;
};

const WalletCard: React.FC<WalletCardProps> = ({
  isConnected,
  walletAddress,
  onConnect,
  onDisconnect,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — fail silently, address is still visible/selectable
    }
  };

  return (
    <div className="wc-card">
      <div className="wc-status-row">
        <span className={`wc-dot ${isConnected ? "wc-dot--live" : "wc-dot--off"}`} aria-hidden="true" />
        <span className="wc-status-label">
          {isConnected ? "Wallet connected" : "Wallet disconnected"}
        </span>
      </div>

      <div className="wc-body">
        {isConnected && walletAddress ? (
          <>
            <span className="wc-eyebrow">Unshielded address</span>
            <div className="wc-address-row">
              <p className="wc-address" title={walletAddress}>
                {truncateAddress(walletAddress)}
              </p>
              <button
                type="button"
                className="wc-copy-btn"
                onClick={handleCopy}
                aria-label="Copy wallet address"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </>
        ) : (
          <p className="wc-empty">Connect your wallet to register a business, browse listings, or pick up a pending handshake.</p>
        )}
      </div>

      <div className="wc-action-row">
        {isConnected ? (
          <button type="button" className="wc-btn wc-btn-ghost" onClick={onDisconnect}>
            Disconnect wallet
          </button>
        ) : (
          <button type="button" className="wc-btn wc-btn-primary" onClick={onConnect}>
            Connect wallet
          </button>
        )}
      </div>
    </div>
  );
};

export default WalletCard;
