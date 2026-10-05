import { useNavigate } from 'react-router-dom';
import Homepage from '../Homepage';
import { useWallet } from '../WalletContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { isConnected, connect, connecting, connectionError, contractError } = useWallet();

  const goRegisterBusiness = async () => {
    const ok = isConnected || (await connect());
    if (ok) navigate('/register-business');
  };

  const goRegisterInvestor = async () => {
    const ok = isConnected || (await connect());
    if (ok) navigate('/register-investor');
  };

  return (
    <Homepage
      onConnectWallet={connect}
      onRegisterBusiness={goRegisterBusiness}
      onRegisterInvestor={goRegisterInvestor}
      connectionError={connectionError}
      contractError={contractError}
      connecting={connecting}
    />
  );
}
