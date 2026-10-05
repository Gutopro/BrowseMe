import WalletCard from '../WalletCard';
import { useWallet } from '../WalletContext';

export default function WalletPage() {
  const {
    isConnected,
    walletAddress,
    contractError,
    connectionError,
    connecting,
    connect,
    disconnect,
  } = useWallet();

  return (
    <>
      {contractError && (
        <p className="bm-field-error" style={{ textAlign: 'center' }} role="alert">
          Connected to wallet, but couldn't join the contract: {contractError}
        </p>
      )}
      <WalletCard
        isConnected={isConnected}
        walletAddress={walletAddress}
        connecting={connecting}
        connectionError={connectionError}
        onConnect={connect}
        onDisconnect={disconnect}
      />
    </>
  );
}
