'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, X, Store, User, Handshake, Bell, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  const menuItems = [
    {
      icon: <LayoutDashboard className="transition-transform group-hover:scale-110" />,
      label: 'Dashboard',
      href: '/',
    },
    {
      icon: <Store className="transition-transform group-hover:scale-110" />,
      label: 'Marketplace',
      href: '/marketplace-content-view',
    },
    {
      icon: <User className="transition-transform group-hover:scale-110" />,
      label: 'My Profile',
      href: '/profile',
    },
    {
      icon: <Handshake className="transition-transform group-hover:scale-110" />,
      label: 'Active Handshakes',
      href: '/handshakes',
    },
    {
      icon: <Bell className="transition-transform group-hover:scale-110" />,
      label: 'Notifications',
      href: '/notifications',
    },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 hover:bg-surface-alt"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-card border-r border-border glass',
          'flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'lg:translate-x-0 pt-20 lg:pt-0',
          !isOpen && '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="px-6 py-8 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow group-hover:shadow-glow-sm transition-shadow duration-300">
              <Zap className="w-6 h-6 text-background" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">BrowseMe</span>
              <span className="text-xs text-muted-foreground">Fintech Ecosystem</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 px-4 py-3 rounded-lg',
                  'text-sm font-medium cursor-pointer',
                  'transition-all duration-200 ease-out', // Smooth transitions
                  // Fixed: Removed opacity-0/animate-in to ensure they are ALWAYS visible
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50 hover:border-border/50 border border-transparent'
                )}
              >
                {/* Left Glow Bar for Active state */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary shadow-glow-sm" />
                )}

                <span className="text-xl relative z-10">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>

                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary shadow-glow-sm animate-[ping_2s_ease-in-out_infinite]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-border/50 px-4 py-4">
          <Button
            variant="outline"
            className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-[1.02]"
          >
            Upgrade to Pro
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden z-40 animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}