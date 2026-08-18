import React from "react";
import type { WalletCardProps } from "./types";

const WalletCard: React.FC<WalletCardProps> = ({
  isConnected,
  walletAddress,
  onConnect,
  onDisconnect,
}) => {
  return (
    <div>
      <div>
        <h2>Connection Status</h2>
        <div>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <div>
        {isConnected && walletAddress ? (
          <>
            <p>Wallet Address:</p>
            <p title={walletAddress}>{walletAddress}</p>
          </>
        ) : (
          <p>Please connect your wallet to proceed.</p>
        )}
      </div>

      <div>
        {isConnected ? (
          <button onClick={onDisconnect}>Disconnect Wallet</button>
        ) : (
          <button onClick={onConnect}>Connect Wallet</button>
        )}
      </div>
    </div>
  );
};

export default WalletCard;
