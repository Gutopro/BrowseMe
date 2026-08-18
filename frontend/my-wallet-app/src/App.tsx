import React, { useState } from 'react';
import WalletCard from './WalletCard';
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

      // Connect to the specified network (use 'undeployed' for local development)
      const connectedApi = await wallet.connect('undeployed');

      // Retrieve the unshielded address from the wallet
      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      address = unshieldedAddress;

      // Optional: Get the service URI configuration
      const serviceUriConfig = await connectedApi.getConfiguration();
      console.log('Service URI Config:', serviceUriConfig);

      // Check if the connection is established
      const connectionStatus = await connectedApi.getConnectionStatus();
      if (connectionStatus.status === 'connected') {
        isConnected = true;
        console.log("Connected to the wallet:", address);
      }
    } catch (error) {
      console.log("An error occurred:", error);
    }

    setIsConnected(isConnected);
    setWalletAddress(address);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
  };

  return (
    <div>
      <header>
        <h1>Midnight Wallet Connector</h1>
      </header>
      <main>
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
