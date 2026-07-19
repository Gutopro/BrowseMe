'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Menu, X, Store, User, Handshake, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    {
      icon: <Store />,
      label: 'Marketplace',
      href: '#',
      active: true,
    },
    {
      icon: <User />,
      label: 'My Profile',
      href: '#',
      active: false,
    },
    {
      icon: <Handshake />,
      label: 'Active Handshakes',
      href: '#',
      active: false,
    },
    {
      icon: <Bell />,
      label: 'Notifications',
      href: '#',
      active: false,
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
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 pt-20 lg:pt-0',
          !isOpen && '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="px-6 py-8 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow group-hover:shadow-glow-sm transition-shadow">
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
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'text-sm font-medium cursor-pointer group',
                item.active
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
              {item.active && (
                <div className="ml-auto w-2 h-2 rounded-full bg-primary shadow-glow-sm" />
              )}
            </Link>
          ))}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-border/50 px-4 py-4">
          <Button
            variant="outline"
            className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
          >
            Upgrade to Pro
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
