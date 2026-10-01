import { useNavigate } from 'react-router-dom';
import Homepage from '../Homepage';
import { useWallet } from '../WalletContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { isConnected, connect } = useWallet();

  const goRegisterBusiness = async () => {
    if (!isConnected) await connect();
    navigate('/register-business');
  };
  const goRegisterInvestor = async () => {
    if (!isConnected) await connect();
    navigate('/register-investor');
  };

  return (
    <Homepage
      onConnectWallet={connect}
      onRegisterBusiness={goRegisterBusiness}
      onRegisterInvestor={goRegisterInvestor}
    />
  );
}
