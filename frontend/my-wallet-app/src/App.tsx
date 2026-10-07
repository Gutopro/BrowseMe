import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { WalletProvider } from './WalletContext';
import NavBar from './NavBar';
import HomePage from './pages/HomePage';
import WalletPage from './pages/WalletPage';
import RegisterBusinessPage from './pages/RegisterBusinessPage';
import RegisterInvestorPage from './pages/RegisterInvestorPage';
import ListedBusinessesPage from './pages/ListedBusinessesPage';
import DealsPage from './pages/DealsPage';

// Constrained layout for every page except the home page
const PageLayout = () => (
  <main className="bm-section">
    <Outlet />
  </main>
);

const App = () => (
  <WalletProvider>
    <BrowserRouter>
      <NavBar />
      <Routes>
        {/* Home controls its own full-width layout */}
        <Route path="/" element={<HomePage />} />

        <Route element={<PageLayout />}>
          <Route path="/businesses" element={<ListedBusinessesPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/register-business" element={<RegisterBusinessPage />} />
          <Route path="/register-investor" element={<RegisterInvestorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </WalletProvider>
);

export default App;
