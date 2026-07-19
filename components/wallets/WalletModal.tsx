'use client';

import { useEffect, useState } from 'react';
import { X, Wallet, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';


// Wallet metadata for display
const WALLET_METADATA: Record<string, { name: string; icon: string; color: string }> = {
  nami: { name: 'Nami', icon: '🟠', color: 'bg-orange-500' },
  eternl: { name: 'Eternl', icon: '🔵', color: 'bg-blue-500' },
  flint: { name: 'Flint', icon: '🔴', color: 'bg-red-500' },
  lace: { name: 'Lace', icon: '🟣', color: 'bg-purple-500' },
  typhon: { name: 'Typhon', icon: '🐉', color: 'bg-teal-500' },
  gerowallet: { name: 'GeroWallet', icon: '🟢', color: 'bg-green-500' },
};

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletName: string) => Promise<void>;
  connecting: boolean;
  error?: string | null;
}

export function WalletModal({ isOpen, onClose, onConnect, connecting, error }: WalletModalProps) {
  const [installedWallets, setInstalledWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Detect installed wallets when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.cardano) {
        const wallets = Object.keys(window.cardano);
        setInstalledWallets(wallets);
      } else {
        setInstalledWallets([]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const hasWallets = installedWallets.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Connect Wallet</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-surface-alt text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Detecting wallets...</p>
              </div>
            ) : !hasWallets ? (
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <div>
                  <p className="text-foreground font-medium">No Wallet Found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please install a Cardano/Midnight wallet extension to continue.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() =>
                      window.open('https://chrome.google.com/webstore/detail/nami/ldfbacdbackkjhclmhnjabngnppnkfgh', '_blank')
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    Install Nami
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() =>
                      window.open('https://chrome.google.com/webstore/detail/eternl/kmhcihpebfmpgmihbkipmjlmmioameka', '_blank')
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    Install Eternl
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Select a wallet to connect to BrowseMe
                </p>
                {installedWallets.map((walletKey) => {
                  const meta = WALLET_METADATA[walletKey.toLowerCase()] || {
                    name: walletKey.charAt(0).toUpperCase() + walletKey.slice(1),
                    icon: '💳',
                    color: 'bg-gray-500',
                  };

                  return (
                    <button
                      key={walletKey}
                      onClick={() => onConnect(walletKey)}
                      disabled={connecting}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-4 rounded-xl',
                        'border border-border/50 bg-surface/30 hover:bg-surface',
                        'transition-all duration-200 cursor-pointer',
                        'hover:border-primary/50 hover:shadow-glow-sm',
                        connecting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-lg',
                          meta.color,
                          'text-white'
                        )}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-foreground font-medium">{meta.name}</p>
                        <p className="text-xs text-muted-foreground">Cardano/Midnight Wallet</p>
                      </div>
                      {connecting && (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      )}
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </button>
                  );
                })}

                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-surface/50 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              By connecting, you agree to the BrowseMe Terms of Service
            </p>
          </div>
        </div>
      </div>
    </>
  );
}