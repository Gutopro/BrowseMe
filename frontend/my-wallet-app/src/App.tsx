import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { WalletProvider } from './WalletContext';
import HomePage from './pages/HomePage';
import WalletPage from './pages/WalletPage';
import RegisterBusinessPage from './pages/RegisterBusinessPage';
import RegisterInvestorPage from './pages/RegisterInvestorPage';

const NavBar = () => (
  <nav className="bm-cta-row" style={{ justifyContent: 'center', padding: '2rem 1.5rem 0' }}>
    {[
      { to: '/', label: 'Home' },
      { to: '/wallet', label: 'Wallet' },
      { to: '/register-business', label: 'Register a business' },
      { to: '/register-investor', label: 'Register as investor' },
    ].map(({ to, label }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) => `bm-btn ${isActive ? 'bm-btn-primary' : 'bm-btn-ghost'}`}
      >
        {label}
      </NavLink>
    ))}
  </nav>
);

const App = () => (
  <WalletProvider>
    <BrowserRouter>
      <NavBar />
      <main className="bm-section">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/register-business" element={<RegisterBusinessPage />} />
          <Route path="/register-investor" element={<RegisterInvestorPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  </WalletProvider>
);

export default App;
