import React, { useState, useRef } from 'react';
import WalletCard from './WalletCard';
import Homepage from './Homepage';
import RegistrationForm from './RegistrationForm';
import type { RegistrationPayload } from './RegistrationForm';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { selectWallet } from './selectWallet';
import { ContractAPI } from './contract/ContractAPI';
import { initializeProviders, callerAddressBytesFromWallet } from './providers';

type View = 'wallet' | 'register';

// ── TEMPORARY: no real commitment scheme exists yet (no circuit verifies
// commitments against disclosed fields, per ContractAPI.ts / main.compact).
// This is NOT a real hash — it's a deterministic 32-byte stand-in so the
// registration path works end-to-end. Replace once a real Bytes<32> hashing
// scheme (matching persistentHash if a verify circuit is ever added) exists.
function placeholderCommitment(preimage: Record<string, string>): Uint8Array {
  const encoded = new TextEncoder().encode(JSON.stringify(preimage));
  const out = new Uint8Array(32);
  out.set(encoded.slice(0, 32));
  return out;
}

// BrowseMePrivateState is { callerAddress: Uint8Array } — confirmed against
// common-types.ts.
function buildInitialPrivateState(callerAddress: Uint8Array) {
  return { callerAddress };
}

// Deployed contract address isn't captured anywhere else in the frontend —
// deploy.ts only console.logs it. Wired as a Vite env var; swap for your
// actual convention if this isn't a Vite project.
const CONTRACT_ADDRESS = import.meta.env.VITE_BROWSEME_CONTRACT_ADDRESS as string;

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [view, setView] = useState<View>('wallet');
  const [contractAPI, setContractAPI] = useState<ContractAPI | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Kept as a ref, not state: the ConnectedAPI session object itself is only
  // needed synchronously inside handleConnect to build providers — nothing
  // else in this component reads it directly.
  const connectedApiRef = useRef<ConnectedAPI | null>(null);

  const handleConnect = async () => {
    console.log('Connect button clicked');
    let connected = false;
    let address: string | null = null;

    try {
      const wallet = selectWallet();
      const connectedApi = await wallet.connect('undeployed');
      connectedApiRef.current = connectedApi;

      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      address = unshieldedAddress;

      const serviceUriConfig = await connectedApi.getConfiguration();
      console.log('Service URI Config:', serviceUriConfig);

      const connectionStatus = await connectedApi.getConnectionStatus();
      if (connectionStatus.status === 'connected') {
        connected = true;
        console.log('Connected to the wallet:', address);
      }

      // Build providers + join the deployed contract right after connecting,
      // so contractAPI is ready before the user ever hits the register form.
      if (connected) {
        if (!CONTRACT_ADDRESS) {
          throw new Error(
            'VITE_BROWSEME_CONTRACT_ADDRESS is not set — cannot join the deployed contract.',
          );
        }
        const providers = await initializeProviders(connectedApi);
        const callerAddress = await callerAddressBytesFromWallet(connectedApi);
        const initialPrivateState = buildInitialPrivateState(callerAddress);
        const api = await ContractAPI.join(providers, CONTRACT_ADDRESS, initialPrivateState);
        setContractAPI(api);
      }
    } catch (error) {
      console.log('An error occurred:', error);
    }

    setIsConnected(connected);
    setWalletAddress(address);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setContractAPI(null);
    connectedApiRef.current = null;
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

  const handleRegisterSubmit = async (payload: RegistrationPayload) => {
    if (!contractAPI) {
      setRegisterError('Wallet not connected to the contract yet.');
      return;
    }
    setSubmitting(true);
    setRegisterError(null);
    try {
      const commitment = placeholderCommitment(payload.commitmentPreimage);
      if (payload.track === 'TRACK_A') {
        await contractAPI.registerBusinessTrackA(commitment, payload.sector, payload.location);
      } else {
        await contractAPI.registerBusinessTrackB(commitment, payload.sector, payload.location);
      }
      setView('wallet');
    } catch (error) {
      console.log('registerBusiness failed:', error);
      setRegisterError('Registration failed — check the console for details.');
    } finally {
      setSubmitting(false);
    }
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
          <>
            {registerError && (
              <p className="bm-field-error" style={{ marginBottom: '1rem' }}>
                {registerError}
              </p>
            )}
            <RegistrationForm onSubmit={handleRegisterSubmit} submitting={submitting} />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
