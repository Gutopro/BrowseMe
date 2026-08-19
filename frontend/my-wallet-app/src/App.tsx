import React, { useState } from 'react';
import WalletCard from './WalletCard';
import Homepage from './Homepage';
import '@midnight-ntwrk/dapp-connector-api';
import { selectWallet } from './selectWallet';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleConnect = async () => {
    console.log('Connect button clicked');
    let isConnected = false;
    let address = null;

    try {
      const wallet = selectWallet();
      const connectedApi = await wallet.connect('undeployed');
      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      address = unshieldedAddress;

      const serviceUriConfig = await connectedApi.getConfiguration();
      console.log('Service URI Config:', serviceUriConfig);

      const connectionStatus = await connectedApi.getConnectionStatus();
      if (connectionStatus.status === 'connected') {
        isConnected = true;
        console.log('Connected to the wallet:', address);
      }
    } catch (error) {
      console.log('An error occurred:', error);
    }

    setIsConnected(isConnected);
    setWalletAddress(address);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
  };

  if (!isConnected) {
    return <Homepage onConnectWallet={handleConnect} />;
  }

  return (
    <div className="bm-home" style={{ minHeight: '100vh' }}>
      <header className="bm-section" style={{ textAlign: 'center', paddingBottom: 0 }}>
        <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
          Midnight Wallet Connector
        </h1>
      </header>
      <main className="bm-section">
        <WalletCard
          isConnected={isConnected}
          walletAddress={walletAddress}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </main>
    </div>
  );
};

export default App;
