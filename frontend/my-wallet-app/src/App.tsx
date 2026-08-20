import React, { useState } from 'react';
import WalletCard from './WalletCard';
import Homepage from './Homepage';
import RegistrationForm from './RegistrationForm';
import '@midnight-ntwrk/dapp-connector-api';
import { selectWallet } from './selectWallet';

type View = 'wallet' | 'register';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [view, setView] = useState<View>('wallet');

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
    setView('wallet');
  };

  // Used by Homepage's "Register a business" CTA — connects if needed,
  // then jumps straight to the registration form.
  const handleRegisterBusiness = async () => {
    if (!isConnected) {
      await handleConnect();
    }
    setView('register');
  };

  if (!isConnected) {
    return <Homepage onConnectWallet={handleConnect} onRegisterBusiness={handleRegisterBusiness} />;
  }

  return (
    <div className="bm-home" style={{ minHeight: '100vh' }}>
      <header className="bm-section" style={{ textAlign: 'center', paddingBottom: 0 }}>
        <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
          Midnight Wallet Connector
        </h1>
      </header>

      <nav className="bm-cta-row" style={{ justifyContent: 'center', padding: '2rem 1.5rem 0' }}>
        <button
          type="button"
          className={`bm-btn ${view === 'wallet' ? 'bm-btn-primary' : 'bm-btn-ghost'}`}
          onClick={() => setView('wallet')}
        >
          Wallet
        </button>
        <button
          type="button"
          className={`bm-btn ${view === 'register' ? 'bm-btn-primary' : 'bm-btn-ghost'}`}
          onClick={() => setView('register')}
        >
          Register a business
        </button>
      </nav>

      <main className="bm-section">
        {view === 'wallet' ? (
          <WalletCard
            isConnected={isConnected}
            walletAddress={walletAddress}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <RegistrationForm />
        )}
      </main>
    </div>
  );
};

export default App;
