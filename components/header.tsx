'use client';

import { Search, Wallet, Bell } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';

export function Header() {
  return (
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
          <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-background shadow-glow hover:shadow-glow-sm transition-all">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
          </Button>

          {/* Profile Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center cursor-pointer hover:shadow-glow-sm transition-shadow">
            <span className="text-sm font-bold text-background">U</span>
          </div>
        </div>
      </div>
    </header>
  );
}
