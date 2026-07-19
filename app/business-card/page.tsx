'use client';

import { Web3BusinessCard } from "../../components/web3-business-card";


export default function Page() {
  const mockBusinesses = [
    {
      businessId: '#BM-4082',
      tier: 1 as const,
      status: 'Open for Investment',
      sector: 'AI/ML',
      location: 'San Francisco, CA',
      businessName: 'NeuralFlow Technologies Inc.',
      exactAddress: '2847 Lakeshore Boulevard, Suite 402, San Francisco, CA 94105',
      estimatedRevenue: '$2.4M - $3.2M ARR',
    },
    {
      businessId: '#BM-5021',
      tier: 2 as const,
      status: 'Open for Investment',
      sector: 'Web3',
      location: 'New York, NY',
      businessName: 'Quantum Ventures Digital Assets',
      exactAddress: '1501 Broadway, Floor 28, New York, NY 10036',
      estimatedRevenue: '$5.6M - $8.2M ARR',
    },
    {
      businessId: '#BM-3156',
      tier: 3 as const,
      status: 'Open for Investment',
      sector: 'FinTech',
      location: 'Singapore',
      businessName: 'Apex Financial Systems Pte Ltd',
      exactAddress: '72 Raffles Road, Marina Bay Tower, Singapore 018956',
      estimatedRevenue: '$12M - $18M ARR',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 py-12 px-4">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="text-center mb-12">
          {/* <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-mono">
            Web3 Business Cards
          </h1> */}
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Secure, verified digital credentials for exclusive business partnerships. 
            Initiate handshakes to unlock verified business data.
          </p>
        </div>

        {/* Grid of Business Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockBusinesses.map((business) => (
            <div key={business.businessId} className="flex justify-center">
              <Web3BusinessCard {...business} />
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-4xl mx-auto mt-20 pt-16 border-t border-slate-800">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-4">
              <span className="text-cyan-400 font-bold">🔐</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Private Data Protection</h3>
            <p className="text-slate-400 text-sm">
              Sensitive business information remains encrypted until handshake is completed.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-4">
              <span className="text-blue-400 font-bold">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Handshake Protocol</h3>
            <p className="text-slate-400 text-sm">
              Multi-step verification process with visual feedback and loading states.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-4">
              <span className="text-purple-400 font-bold">✨</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Tier Classification</h3>
            <p className="text-slate-400 text-sm">
              Three-tier system with distinct visual indicators based on business scale.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
              <span className="text-emerald-400 font-bold">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Expandable Details</h3>
            <p className="text-slate-400 text-sm">
              Smooth transitions reveal detailed business metrics after successful handshake.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
