'use client';

import { useState } from 'react'; 
import { Search, Wallet, Bell, LogOut, CheckCircle, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useWallet } from '../app/hooks/use-wallet';
import { WalletModal } from './wallets/WalletModal';

export function Header() {
  const { isConnected, address, balance, connecting, connect, disconnect, error } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const truncatedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-6)}` 
    : '';

  // Handler for when a wallet is selected in the modal
  const handleConnect = async (walletName: string) => {
    await connect(walletName);
    if (!error) {
      setIsModalOpen(false); 
    }
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-card border-b border-border glass z-40">
        <div className="h-full px-6 flex items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search marketplace, profiles..."
                className="w-full pl-10 pr-4 bg-surface border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-10"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-surface-alt text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Button>

            {/* Wallet Connection */}
            {!isConnected ? (
              <Button
                onClick={() => setIsModalOpen(true)} 
                disabled={connecting}
                className="gap-2 bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-background shadow-glow hover:shadow-glow-sm transition-all"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">Connect Wallet</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-surface border border-border/50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-mono text-foreground hidden md:inline-block">
                    {truncatedAddress}
                  </span>
                  {balance && (
                    <span className="text-xs text-muted-foreground hidden lg:inline-block">
                      {balance}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={disconnect}
                  className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md"
                  title="Disconnect wallet"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Profile Avatar */}
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center cursor-pointer hover:shadow-glow-sm transition-shadow">
              <span className="text-sm font-bold text-background">
                {isConnected && address ? address[0].toUpperCase() : 'U'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-4 py-2 bg-destructive/90 text-destructive-foreground text-sm rounded-lg shadow-lg backdrop-blur-sm border border-destructive/30 max-w-sm text-center">
            ⚠️ {error}
          </div>
        )}
      </header>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
        connecting={connecting}
        error={error}
      />
    </>
  );
}