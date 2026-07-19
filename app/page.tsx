'use client';

// import { DashboardShell } from '@/components/dashboard-shell';
import { TrendingUp, Users, Zap, ArrowRight } from 'lucide-react';
import { DashboardShell } from '../components/dashboard-shell';
import { Button } from '../components/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <DashboardShell>
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold text-balance mb-4">
          Welcome to <span className="gradient-primary bg-clip-text text-transparent">BrowseMe</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">
          Discover opportunities, connect with innovators, and grow your fintech presence in our exclusive marketplace.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass rounded-lg p-6 border border-primary/20 hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Active Users
            </h3>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground mb-2">12,458</p>
          <p className="text-xs text-primary flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 12% increase this month
          </p>
        </div>

        <div className="glass rounded-lg p-6 border border-accent/20 hover:border-accent/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Active Handshakes
            </h3>
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <p className="text-3xl font-bold text-foreground mb-2">847</p>
          <p className="text-xs text-accent flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 28 new today
          </p>
        </div>

        <div className="glass rounded-lg p-6 border border-primary/20 hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Marketplace Volume
            </h3>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground mb-2">$2.4M</p>
          <p className="text-xs text-primary flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 8% from last week
          </p>
        </div>
      </div>

      {/* Featured Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Recent Activity */}
        <div className="glass rounded-lg p-8 border border-border/50">
          <h2 className="text-xl font-bold text-foreground mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 pb-4 border-b border-border/30 last:border-0"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">New handshake initiated</p>
                  <p className="text-sm text-muted-foreground">With Tech Innovators LLC</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">2h ago</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="glass rounded-lg p-8 border border-border/50">
          <h2 className="text-xl font-bold text-foreground mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Button className="w-full justify-between gap-2 cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-background shadow-glow h-12">
              <Link href={"/marketplace-content-view"} className='flex items-center justify-between w-full'>
                Browse Marketplace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between gap-2 border-primary/50 text-primary hover:bg-primary/10 h-12"
            >

              <Link href={"/onboarding-portal"} className='flex items-center justify-between w-full'>
                Create New Profile
                <ArrowRight className="w-4 h-4" />
              </ Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between gap-2 border-border/50 text-foreground hover:bg-surface-alt h-12"
            >
              View My Handshakes
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Opportunities */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Featured Opportunities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {['Venture Capital', 'Tech Partnership', 'Advisory Role'].map((opportunity, index) => (
            <div
              key={index}
              className="glass rounded-lg p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow-sm group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-foreground mb-1">{opportunity}</h3>
                  <p className="text-sm text-muted-foreground">Premium Listing</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Connect with industry leaders and expand your network
              </p>
              <Button
                variant="ghost"
                className="w-full justify-center text-primary hover:bg-primary/10 text-sm"
              >
                Explore
              </Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
