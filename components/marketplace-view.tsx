'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Filter,
  ArrowLeft,
  Sprout,
  ShoppingBag,
  Cpu,
  Factory,
  X,
} from 'lucide-react';

export interface FilterState {
  sector: string;
  location: string;
  tier: string;
}

interface BusinessCard {
  id: string;
  name: string;
  sector: string;
  location: string;
  tier: string;
  description: string;
}

// Sector → Lucide Icon mapping
const sectorIcons: Record<string, React.ReactNode> = {
  Agriculture: <Sprout className="h-8 w-8" />,
  Retail: <ShoppingBag className="h-8 w-8" />,
  Tech: <Cpu className="h-8 w-8" />,
  Manufacturing: <Factory className="h-8 w-8" />,
};

// Mock data with sector-based background colors
const mockBusinesses: BusinessCard[] = [
  {
    id: '1',
    name: 'TechFarm Solutions',
    sector: 'Agriculture',
    location: 'Lagos',
    tier: 'Tier 1',
    description: 'Leading agricultural technology provider for sustainable farming.',
  },
  {
    id: '2',
    name: 'Fashion Forward Ltd',
    sector: 'Retail',
    location: 'Lagos',
    tier: 'Tier 2',
    description: 'Premium fashion and lifestyle retail chain.',
  },
  {
    id: '3',
    name: 'CloudBase Systems',
    sector: 'Tech',
    location: 'Kwara',
    tier: 'Tier 1',
    description: 'Enterprise cloud infrastructure and SaaS solutions.',
  },
  {
    id: '4',
    name: 'AutoParts Nigeria',
    sector: 'Manufacturing',
    location: 'Ogun',
    tier: 'Tier 3',
    description: 'Automotive parts manufacturing and distribution.',
  },
  {
    id: '5',
    name: 'Green Harvest Co',
    sector: 'Agriculture',
    location: 'Ogun',
    tier: 'Tier 2',
    description: 'Organic produce cultivation and export services.',
  },
  {
    id: '6',
    name: 'Digital Commerce Hub',
    sector: 'Tech',
    location: 'Lagos',
    tier: 'Tier 1',
    description: 'E-commerce platform and digital payment solutions.',
  },
  {
    id: '7',
    name: 'MetalWorks Industries',
    sector: 'Manufacturing',
    location: 'Lagos',
    tier: 'Tier 2',
    description: 'Industrial metal fabrication and welding services.',
  },
  {
    id: '8',
    name: 'Retail Express Group',
    sector: 'Retail',
    location: 'Kwara',
    tier: 'Tier 2',
    description: 'Multi-category retail with strong distribution network.',
  },
];

const SECTORS = ['Agriculture', 'Retail', 'Tech', 'Manufacturing'];
const LOCATIONS = ['Lagos', 'Kwara', 'Ogun'];
const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];

export default function MarketplaceView() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    sector: '',
    location: '',
    tier: '',
  });

  const filteredBusinesses = mockBusinesses.filter((business) => {
    if (filters.sector && business.sector !== filters.sector) return false;
    if (filters.location && business.location !== filters.location) return false;
    if (filters.tier && business.tier !== filters.tier) return false;
    return true;
  });

  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] === value ? '' : value,
    }));
  };

  const clearFilters = () => {
    setFilters({ sector: '', location: '', tier: '' });
  };

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  // Tier colour mapping
  const tierColors: Record<string, string> = {
    'Tier 1': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    'Tier 2': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    'Tier 3': 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Back Button */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
              <p className="text-sm text-muted-foreground">
                Discover verified businesses across key sectors
              </p>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-[73px] z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Sector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">Sector:</span>
              {SECTORS.map((sector) => {
                const isActive = filters.sector === sector;
                return (
                  <button
                    key={sector}
                    onClick={() => handleFilterChange('sector', sector)}
                    className={`
                      inline-flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-xs font-medium
                      transition-all duration-200 ease-out
                      ${isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 ring-2 ring-primary/40 scale-[1.02]'
                        : 'bg-card/60 text-foreground/70 border border-border/60 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground hover:scale-[1.02]'
                      }
      `}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>

            {/* Dropdowns for Location & Tier */}
            <div className="flex flex-wrap items-center gap-3 ml-auto">
              <div className="relative">
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-7 text-sm text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Locations</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative">
                <select
                  value={filters.tier}
                  onChange={(e) => handleFilterChange('tier', e.target.value)}
                  className="appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-7 text-sm text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Tiers</option>
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Results
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''})
            </span>
          </h2>
        </div>

        {filteredBusinesses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBusinesses.map((business) => {
              const Icon = sectorIcons[business.sector] || <Filter className="h-8 w-8" />;
              const tierBadgeColor =
                tierColors[business.tier] || 'bg-muted text-muted-foreground';

              return (
                <div
                  key={business.id}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Icon Header */}
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/5 via-transparent to-primary/10 text-primary/70 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    {Icon}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {business.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {business.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {business.sector}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {business.location}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span
                        className={`inline-block rounded-md px-3 py-0.5 text-xs font-semibold ${tierBadgeColor}`}
                      >
                        {business.tier}
                      </span>
                      <button className="text-xs font-medium text-primary hover:underline transition-all">
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <Filter className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">No results found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters to see more businesses
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}