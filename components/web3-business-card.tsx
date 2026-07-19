'use client';

import { useState } from 'react';
import { ChevronDown, Handshake, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

type HandshakeState = 'default' | 'pending' | 'completed';

interface Web3BusinessCardProps {
  businessId: string;
  tier: 1 | 2 | 3;
  status: string;
  sector: string;
  location: string;
  businessName: string;
  exactAddress: string;
  estimatedRevenue: string;
}

export function Web3BusinessCard({
  businessId,
  tier,
  status,
  sector,
  location,
  businessName,
  exactAddress,
  estimatedRevenue,
}: Web3BusinessCardProps) {
  const [handshakeState, setHandshakeState] = useState<HandshakeState>('default');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleHandshake = () => {
    if (handshakeState === 'default') {
      // Transition to pending
      setHandshakeState('pending');
      // Simulate network delay
      setTimeout(() => {
        setHandshakeState('completed');
        setIsExpanded(true);
      }, 2000);
    } else if (handshakeState === 'completed') {
      // Toggle expanded state
      setIsExpanded(!isExpanded);
    }
  };

  const tierColors = {
    1: 'from-cyan-400/20 to-blue-500/20 border-cyan-400/40',
    2: 'from-blue-400/20 to-purple-500/20 border-blue-400/40',
    3: 'from-purple-400/20 to-pink-500/20 border-purple-400/40',
  };

  const tierLabels = {
    1: 'Tier 1',
    2: 'Tier 2',
    3: 'Tier 3',
  };

  return (
    <div className="w-full max-w-md">
      {/* Main Card */}
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Card Container */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-black backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-5">
          {/* Header with ID */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">
                Business ID
              </span>
              <h2 className="text-2xl font-bold text-white mt-1 font-mono">
                {businessId}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Handshake className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2">
            {/* Tier Badge */}
            <div
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${tierColors[tier]} border`}
            >
              <div className="w-2 h-2 rounded-full bg-current mr-2" />
              {tierLabels[tier]}
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 text-green-300">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
              {status}
            </div>
          </div>

          {/* Public Data Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sector */}
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Sector
              </span>
              <p className="text-sm font-semibold text-slate-100 mt-1.5">
                {sector}
              </p>
            </div>

            {/* Location */}
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Location
              </span>
              <p className="text-sm font-semibold text-slate-100 mt-1.5">
                {location}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

          {/* Handshake Button */}
          <Button
            onClick={handleHandshake}
            disabled={handshakeState === 'pending'}
            className={`w-full h-11 font-semibold rounded-lg transition-all duration-300 ${
              handshakeState === 'default'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                : handshakeState === 'pending'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-green-500/20'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {handshakeState === 'default' && (
                <>
                  <Handshake className="w-4 h-4" />
                  <span>Initiate Handshake</span>
                </>
              )}
              {handshakeState === 'pending' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Staged / Waiting...</span>
                </>
              )}
              {handshakeState === 'completed' && (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Handshake Successful</span>
                </>
              )}
            </div>
          </Button>

          {/* Expandable Private Data Section */}
          {handshakeState === 'completed' && (
            <div className="space-y-3 overflow-hidden">
              {/* Collapse trigger */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-all duration-300 group"
              >
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  Private Data
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-cyan-400 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

                  {/* Full Business Name */}
                  <div>
                    <span className="text-xs text-cyan-400/70 uppercase tracking-wider font-medium">
                      Full Business Name
                    </span>
                    <p className="text-sm font-semibold text-slate-100 mt-1.5 break-words">
                      {businessName}
                    </p>
                  </div>

                  {/* Exact Address */}
                  <div>
                    <span className="text-xs text-cyan-400/70 uppercase tracking-wider font-medium">
                      Exact Address
                    </span>
                    <p className="text-sm font-semibold text-slate-100 mt-1.5 break-words">
                      {exactAddress}
                    </p>
                  </div>

                  {/* Estimated Revenue */}
                  <div>
                    <span className="text-xs text-cyan-400/70 uppercase tracking-wider font-medium">
                      Estimated Annual Revenue
                    </span>
                    <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mt-1.5">
                      {estimatedRevenue}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-4 text-center text-xs text-slate-500">
        <p>🔐 Private data revealed only after successful handshake</p>
      </div>
    </div>
  );
}
