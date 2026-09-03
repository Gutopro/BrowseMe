import React, { useState, useRef } from 'react';
import WalletCard from './WalletCard';
import Homepage from './Homepage';
import RegistrationForm from './RegistrationForm';
import type { RegistrationPayload } from './RegistrationForm';
import InvestorRegistrationForm from './InvestorRegistrationForm';
import type { InvestorRegistrationPayload } from './InvestorRegistrationForm';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { selectWallet } from './selectWallet';
import { ContractAPI } from './contract/ContractAPI';
import { initializeProviders, callerAddressBytesFromWallet } from './providers';

type View = 'home' | 'wallet' | 'register' | 'register-investor';

// ── TEMPORARY: no real commitment scheme exists yet (no circuit verifies
// commitments against disclosed fields, per ContractAPI.ts / main.compact).
// This is NOT a real hash — it's a deterministic 32-byte stand-in so the
// registration path works end-to-end. Replace once a real Bytes<32> hashing
// scheme (matching persistentHash if a verify circuit is ever added) exists.
//
// NOTE: takes `object` rather than `Record<string, string>` — concrete
// interfaces (like InvestorFormValues) without an index signature aren't
// structurally assignable to Record<string, string>, but JSON.stringify
// only needs a plain object.
function placeholderCommitment(preimage: object): Uint8Array {
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

// Best-effort detection of an expired/dropped wallet session vs. a genuine
// registration failure, so the user gets "reconnect your wallet" instead of
// a generic error. Tighten this pattern once you've confirmed the exact
// wording your wallet SDK throws on session expiry.
function isLikelySessionExpiry(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /session|expired|timeout|not connected|disconnected/i.test(message);
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
  const [investorSubmitting, setInvestorSubmitting] = useState(false);
  const [investorError, setInvestorError] = useState<string | null>(null);

  // Surfaced on the wallet view when the wallet connects fine but joining
  // the deployed contract fails — distinct from isConnected so a contract
  // join failure doesn't silently masquerade as a successful connection.
  const [contractError, setContractError] = useState<string | null>(null);

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
    } catch (error) {
      console.log('Wallet connection failed:', error);
      connected = false;
      address = null;
    }

    setIsConnected(connected);
    setWalletAddress(address);
    setContractError(null);
    setContractAPI(null);

    // Joining the contract is a separate step with its own failure mode:
    // the wallet can connect fine while the contract join fails (bad
    // address, indexer down, etc). Kept in its own try/catch so a join
    // failure can't get masked by `connected` already being true.
    if (connected) {
      try {
        if (!CONTRACT_ADDRESS) {
          throw new Error(
            'VITE_BROWSEME_CONTRACT_ADDRESS is not set — cannot join the deployed contract.',
          );
        }
        const providers = await initializeProviders(connectedApiRef.current!);
        const callerAddress = await callerAddressBytesFromWallet(connectedApiRef.current!);
        const initialPrivateState = buildInitialPrivateState(callerAddress);
        const api = await ContractAPI.join(providers, CONTRACT_ADDRESS, initialPrivateState);
        setContractAPI(api);
      } catch (error) {
        console.log('Joining the BrowseMe contract failed:', error);
        setContractError(
          error instanceof Error ? error.message : 'Failed to join the deployed contract.',
        );
      }
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setContractAPI(null);
    setContractError(null);
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

  // Used by Homepage's "Register as an investor" CTA — same pattern as
  // handleRegisterBusiness, just a different destination view.
  const handleRegisterInvestor = async () => {
    if (!isConnected) {
      await handleConnect();
    }
    setView('register-investor');
  };

  // Used by the "Home" nav tab and by each form's "Back to Home" button on
  // its success screen. Doesn't touch the wallet/contract connection —
  // just changes which view is shown.
  const handleGoHome = () => {
    setView('home');
  };

  const handleRegisterSubmit = async (payload: RegistrationPayload) => {
    if (!contractAPI) {
      const message = 'Wallet not connected to the contract yet.';
      setRegisterError(message);
      // Throw so the form's own try/catch treats this as a failure instead
      // of resolving normally and showing a false success state.
      throw new Error(message);
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
      // No setView here — RegistrationForm shows its own success state
      // and its "Register another business" button resets it locally.
    } catch (error) {
      console.log('registerBusiness failed:', error);
      setRegisterError(
        isLikelySessionExpiry(error)
          ? 'Your wallet session expired — please reconnect and try again.'
          : 'Registration failed — check the console for details.',
      );
      throw error; // re-throw so the form's catch block fires too
    } finally {
      setSubmitting(false);
    }
  };

  // Mirrors handleRegisterSubmit: hash the preimage into a placeholder
  // commitment and call the single-argument registerInvestor circuit.
  const handleInvestorSubmit = async (payload: InvestorRegistrationPayload) => {
    if (!contractAPI) {
      const message = 'Wallet not connected to the contract yet.';
      setInvestorError(message);
      // Throw so InvestorRegistrationForm's own try/catch treats this as a
      // failure instead of resolving normally and flipping to the success
      // screen with no transaction ever sent.
      throw new Error(message);
    }
    setInvestorSubmitting(true);
    setInvestorError(null);
    try {
      const commitment = placeholderCommitment(payload.commitmentPreimage);
      await contractAPI.registerInvestor(commitment);
      // No setView here — InvestorRegistrationForm shows its own success
      // state and its "Register another investor profile" button resets
      // it locally.
    } catch (error) {
      console.log('registerInvestor failed:', error);
      setInvestorError(
        isLikelySessionExpiry(error)
          ? 'Your wallet session expired — please reconnect and try again.'
          : 'Registration failed — check the console for details.',
      );
      throw error; // re-throw so the form's catch block fires too
    } finally {
      setInvestorSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <Homepage
        onConnectWallet={handleConnect}
        onRegisterBusiness={handleRegisterBusiness}
        onRegisterInvestor={handleRegisterInvestor}
      />
    );
  }

  return (
    <div className="bm-home" style={{ minHeight: '100vh' }}>
      <header className="bm-section" style={{ textAlign: 'center', paddingBottom: 0 }}>
        <h1 className="bm-h1" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
          Midnight Wallet Connector
        </h1>
      </header>

      {contractError && (
        <p
          className="bm-field-error"
          style={{ textAlign: 'center', margin: '1rem 1.5rem 0' }}
          role="alert"
        >
          Connected to wallet, but couldn't join the contract: {contractError}
        </p>
      )}

      <nav className="bm-cta-row" style={{ justifyContent: 'center', padding: '2rem 1.5rem 0' }}>
        <button
          type="button"
          className={`bm-btn ${view === 'home' ? 'bm-btn-primary' : 'bm-btn-ghost'}`}
          onClick={handleGoHome}
        >
          Home
        </button>
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
        <button
          type="button"
          className={`bm-btn ${view === 'register-investor' ? 'bm-btn-primary' : 'bm-btn-ghost'}`}
          onClick={() => setView('register-investor')}
        >
          Register as investor
        </button>
      </nav>

      <main className="bm-section">
        {view === 'home' ? (
          <Homepage
            onConnectWallet={handleConnect}
            onRegisterBusiness={handleRegisterBusiness}
            onRegisterInvestor={handleRegisterInvestor}
          />
        ) : view === 'wallet' ? (
          <WalletCard
            isConnected={isConnected}
            walletAddress={walletAddress}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ) : view === 'register' ? (
          <>
            {registerError && (
              <p className="bm-field-error" style={{ marginBottom: '1rem' }}>
                {registerError}
              </p>
            )}
            <RegistrationForm
              onSubmit={handleRegisterSubmit}
              submitting={submitting}
              onHome={handleGoHome}
            />
          </>
        ) : (
          <>
            {investorError && (
              <p className="bm-field-error" style={{ marginBottom: '1rem' }}>
                {investorError}
              </p>
            )}
            <InvestorRegistrationForm
              onSubmit={handleInvestorSubmit}
              submitting={investorSubmitting}
              onHome={handleGoHome}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
