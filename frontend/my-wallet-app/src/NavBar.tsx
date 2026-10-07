import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useWallet } from './WalletContext';
import './NavBar.css';

const truncateAddress = (address: string): string => {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}…${address.slice(-8)}`;
};

/** Close a dropdown on outside click or Escape. */
function useDismiss(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, ref]);
}

/* ---------------- Register menu ---------------- */
const RegisterMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const active = pathname.startsWith('/register');

  return (
    <div className="bm-nav-dropdown" ref={ref}>
      <button
        type="button"
        className={`bm-nav-link bm-nav-trigger${active ? ' is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Register <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="bm-nav-menu" role="menu">
          <Link to="/register-business" role="menuitem" className="bm-nav-menu-item" onClick={close}>
            <strong>Register a business</strong>
            <span>List under Track A or Track B</span>
          </Link>
          <Link to="/register-investor" role="menuitem" className="bm-nav-menu-item" onClick={close}>
            <strong>Register as investor</strong>
            <span>Unlock handshakes</span>
          </Link>
        </div>
      )}
    </div>
  );
};

/* ---------------- Wallet chip ---------------- */
const WalletChip = () => {
  const { isConnected, walletAddress, connecting, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const handleCopy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — address is still visible in the wallet page
    }
  };

  if (connecting) {
    return (
      <button type="button" className="bm-chip" disabled aria-busy="true">
        <span className="bm-chip-dot bm-chip-dot--connecting" aria-hidden="true" />
        Connecting…
      </button>
    );
  }

  if (!isConnected || !walletAddress) {
    return (
      <button type="button" className="bm-chip bm-chip--cta" onClick={() => void connect()}>
        <span className="bm-chip-dot bm-chip-dot--off" aria-hidden="true" />
        Connect wallet
      </button>
    );
  }

  return (
    <div className="bm-nav-dropdown bm-nav-dropdown--right" ref={ref}>
      <button
        type="button"
        className="bm-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="bm-chip-dot bm-chip-dot--live" aria-hidden="true" />
        <span className="bm-chip-address" title={walletAddress}>
          {truncateAddress(walletAddress)}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="bm-nav-menu" role="menu">
          <button type="button" role="menuitem" className="bm-nav-menu-item" onClick={handleCopy}>
            <strong>{copied ? 'Copied' : 'Copy address'}</strong>
            <span>Unshielded address</span>
          </button>
          <Link to="/wallet" role="menuitem" className="bm-nav-menu-item" onClick={close}>
            <strong>Wallet details</strong>
            <span>Open the wallet page</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className="bm-nav-menu-item"
            onClick={() => {
              close();
              disconnect();
            }}
          >
            <strong>Disconnect</strong>
            <span>End this session</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------------- Nav bar ---------------- */
const NavBar = () => (
  <header className="bm-nav">
    <div className="bm-nav-inner">
      <Link to="/" className="bm-nav-brand">
        Browse<em>Me</em>
      </Link>

      <nav className="bm-nav-links" aria-label="Main">
        <NavLink
          to="/businesses"
          className={({ isActive }) => `bm-nav-link${isActive ? ' is-active' : ''}`}
        >
          Browse
        </NavLink>
        <NavLink
          to="/deals"
          className={({ isActive }) => `bm-nav-link${isActive ? ' is-active' : ''}`}
        >
          Deals
        </NavLink>
        <RegisterMenu />
      </nav>

      <WalletChip />
    </div>
  </header>
);

export default NavBar;
