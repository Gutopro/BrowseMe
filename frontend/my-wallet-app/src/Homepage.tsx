import React from 'react';
import './Homepage.css';

interface HomepageProps {
  onConnectWallet?: () => void;
  onRegisterBusiness: () => void;
  onRegisterInvestor: () => void;
}

const LEDGER_ITEMS = [
  'BUSINESSES REGISTERED',
  'INVESTORS MATCHED',
  'HANDSHAKES SEALED',
  'ATTESTATIONS VERIFIED',
];

// Original flat-shape illustration — a trader balancing a bowl, rendered as
// simple geometric forms. Not a depiction of any real person; built to carry
// the reference photos' mood (market trade, poise, warm light) without
// reproducing any copyrighted photograph.
const MarketFigure: React.FC = () => (
  <svg viewBox="0 0 320 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a market trader balancing goods">
    <defs>
      <linearGradient id="bmSkyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3f5490" />
        <stop offset="100%" stopColor="#2b3a67" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="320" height="400" rx="8" fill="url(#bmSkyGrad)" />

    {/* ground */}
    <rect x="0" y="330" width="320" height="70" fill="#14181c" opacity="0.35" />

    {/* figure silhouette */}
    <g>
      {/* wrapper skirt */}
      <path d="M120 240 L200 240 L220 340 L100 340 Z" fill="#b4553b" />
      {/* torso */}
      <rect x="132" y="150" width="56" height="100" rx="18" fill="#14181c" />
      {/* head */}
      <circle cx="160" cy="120" r="30" fill="#14181c" />
      {/* headwrap, adire-style bands */}
      <path d="M128 108 Q160 78 192 108 L188 120 Q160 96 132 120 Z" fill="#d9a441" />
      <path d="M132 96 Q160 68 188 96 L182 108 Q160 86 138 108 Z" fill="#f0c878" />
      {/* arms raised to bowl */}
      <path d="M136 165 Q108 150 100 108" stroke="#14181c" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M184 165 Q212 150 220 108" stroke="#14181c" strokeWidth="16" fill="none" strokeLinecap="round" />
    </g>

    {/* bowl on head */}
    <ellipse cx="160" cy="98" rx="46" ry="12" fill="#cfc7b4" />
    <path d="M114 98 Q160 122 206 98 L200 108 Q160 128 120 108 Z" fill="#a89d84" />

    {/* goods in bowl — simple stacked forms echoing market wares */}
    <ellipse cx="140" cy="86" rx="10" ry="14" fill="#d9a441" />
    <ellipse cx="160" cy="80" rx="11" ry="16" fill="#f0c878" />
    <ellipse cx="182" cy="87" rx="9" ry="13" fill="#b4553b" />

    {/* ambient market dots */}
    <circle cx="50" cy="60" r="3" fill="#d9a441" opacity="0.7" />
    <circle cx="270" cy="90" r="2.5" fill="#f3ede0" opacity="0.5" />
    <circle cx="260" cy="200" r="3" fill="#d9a441" opacity="0.5" />
  </svg>
);

export const Homepage: React.FC<HomepageProps> = ({ onConnectWallet, onRegisterBusiness, onRegisterInvestor }) => {
  return (
    <div className="bm-home">
      {/* ---------------- Hero ---------------- */}
      <header className="bm-hero">
        <div className="bm-hero-inner">
          <div>
            <span className="bm-eyebrow">Built on Midnight</span>
            <h1 className="bm-h1">
              Own the deal.
              <br />
              Keep the details <em>private</em>.
            </h1>
            <p className="bm-lede">
              BrowseMe lists real businesses and matches them with real investors —
              without putting anyone&rsquo;s financials, identity, or negotiations on a
              public ledger. Only what both sides agree to share ever leaves your
              wallet.
            </p>
            <div className="bm-cta-row">
              <button className="bm-btn bm-btn-primary" onClick={onConnectWallet}>
                Connect Wallet
              </button>
              <a className="bm-btn bm-btn-ghost" href="#process">
                See how the handshake works
              </a>
            </div>
          </div>
          <div className="bm-hero-art">
            <MarketFigure />
          </div>
        </div>
      </header>

      {/* ---------------- Ledger marquee ---------------- */}
      <div className="bm-marquee" aria-hidden="true">
        <div className="bm-marquee-track">
          {[...LEDGER_ITEMS, ...LEDGER_ITEMS, ...LEDGER_ITEMS].map((item, i) => (
            <span className="bm-marquee-item" key={i}>
              <span className="bm-dot">●</span> {item}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- Process ---------------- */}
      <section className="bm-section" id="process">
        <div className="bm-process-head">
          <span className="bm-eyebrow-dark">How it works</span>
          <h2 className="bm-h2">Three steps, each one a transaction you control.</h2>
        </div>
        <div className="bm-process-grid">
          <div className="bm-process-step">
            <span className="bm-process-num">01</span>
            <h3 className="bm-process-title">Register your business</h3>
            <p className="bm-process-body">
              File under Track A to list immediately, or Track B to build credibility
              through community attestation first. Either way, your full business
              details stay private — only a commitment hash goes on-chain.
            </p>
            <span className="bm-process-circuit">registerBusinessTrackA / TrackB</span>
          </div>
          <div className="bm-process-step">
            <span className="bm-process-num">02</span>
            <h3 className="bm-process-title">Get attested</h3>
            <p className="bm-process-body">
              Track B listings unlock once they clear an attestation threshold —
              including a required union attestation — verified without exposing who
              vouched or why.
            </p>
            <span className="bm-process-circuit">submitAttestation</span>
          </div>
          <div className="bm-process-step">
            <span className="bm-process-num">03</span>
            <h3 className="bm-process-title">Shake on it</h3>
            <p className="bm-process-body">
              An investor initiates a handshake. Data unlocks only when the business
              owner shakes back — and either party can unshake at any time, no
              cooperation required.
            </p>
            <span className="bm-process-circuit">initiateHandshake / shake / unshake</span>
          </div>
        </div>
      </section>

      {/* ---------------- Dual audience ---------------- */}
      <section className="bm-split">
        <div className="bm-split-panel bm-split-panel--business">
          <span className="bm-split-track">For business owners</span>
          <h2 className="bm-split-title">List once. Stay in control.</h2>
          <p className="bm-split-body">
            Your sector and location are visible so investors can find you. Your
            financials, ownership structure, and identity are not — until you shake
            on a deal.
          </p>
          <ul className="bm-split-list">
            <li>Choose Track A for instant listing or Track B for attested credibility</li>
            <li>Unshake at any point, no counterparty approval needed</li>
            <li>Tier recalculates automatically as attestations come in</li>
          </ul>
          <button className="bm-btn bm-btn-ghost" onClick={onRegisterBusiness}>
            Register a business
          </button>
        </div>
        <div className="bm-split-panel bm-split-panel--investor">
          <span className="bm-split-track">For investors</span>
          <h2 className="bm-split-title">Find deals worth staking on.</h2>
          <p className="bm-split-body">
            Browse listed businesses by sector and location, then initiate a
            handshake. Your investor commitment stays private until the business
            owner shakes back.
          </p>
          <ul className="bm-split-list">
            <li>Register once as an investor to unlock handshakes</li>
            <li>Track B businesses carry visible attestation tiers</li>
            <li>Nothing about your interest is public until both sides agree</li>
          </ul>
          <button className="bm-btn bm-btn-ghost" onClick={onRegisterInvestor}>
            Register as an investor
          </button>
        </div>
      </section>

      {/* ---------------- Footer CTA ---------------- */}
      <section className="bm-section bm-footer-cta">
        <h2 className="bm-h2">Ready to see what&rsquo;s listed?</h2>
        <p className="bm-lede">
          Connect your wallet to register a business, browse investors, or pick up
          where your last handshake left off.
        </p>
        <div className="bm-cta-row">
          <button className="bm-btn bm-btn-primary" onClick={onConnectWallet}>
            Connect Wallet
          </button>
        </div>
        <p className="bm-foot-note">BrowseMe — built on Midnight · 100 Days of Midnight, Day 16+</p>
      </section>
    </div>
  );
};

export default Homepage;
