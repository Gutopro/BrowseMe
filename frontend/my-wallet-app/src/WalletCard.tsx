import React, { useState } from "react";
import type { WalletCardProps } from "./types";
import "./WalletCard.css";

type Props = WalletCardProps & {
  connecting?: boolean;
  connectionError?: string | null;
};

const truncateAddress = (address: string): string => {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}…${address.slice(-8)}`;
};

const WalletCard: React.FC<Props> = ({
  isConnected,
  walletAddress,
  connecting = false,
  connectionError,
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

  const dotClass = connecting
    ? "wc-dot--connecting"
    : isConnected
    ? "wc-dot--live"
    : "wc-dot--off";

  const statusLabel = connecting
    ? "Connecting…"
    : isConnected
    ? "Wallet connected"
    : "Wallet disconnected";

  return (
    <div className="wc-card" aria-busy={connecting}>
      <div className="wc-status-row" role="status" aria-live="polite">
        <span className={`wc-dot ${dotClass}`} aria-hidden="true" />
        <span className="wc-status-label">{statusLabel}</span>
      </div>

      <div className="wc-body">
        {connecting ? (
          <p className="wc-empty">
            Waiting for your wallet. Approve the request in the extension popup — it may be
            sitting behind this window.
          </p>
        ) : isConnected && walletAddress ? (
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
          <p className="wc-empty">
            Connect your wallet to register a business, browse listings, or pick up a pending
            handshake.
          </p>
        )}

        {connectionError && !connecting && (
          <p className="wc-error" role="alert">
            {connectionError}
          </p>
        )}
      </div>

      <div className="wc-action-row">
        {isConnected ? (
          <button type="button" className="wc-btn wc-btn-ghost" onClick={onDisconnect}>
            Disconnect wallet
          </button>
        ) : (
          <button
            type="button"
            className="wc-btn wc-btn-primary"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <span className="wc-spinner" aria-hidden="true" /> Connecting…
              </>
            ) : connectionError ? (
              "Try again"
            ) : (
              "Connect wallet"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default WalletCard;
