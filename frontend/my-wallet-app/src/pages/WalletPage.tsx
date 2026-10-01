import WalletCard from '../WalletCard';
import { useWallet } from '../WalletContext';

export default function WalletPage() {
  const { isConnected, walletAddress, contractError, connect, disconnect } = useWallet();
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
        onConnect={connect}
        onDisconnect={disconnect}
      />
    </>
  );
}
