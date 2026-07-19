'use client';

import { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

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
  image?: string;
}

// Mock data - replace with real data from your API
const mockBusinesses: BusinessCard[] = [
  {
    id: '1',
    name: 'TechFarm Solutions',
    sector: 'Agriculture',
    location: 'Lagos',
    tier: 'Tier 1',
    description: 'Leading agricultural technology provider for sustainable farming.',
    image: '🌾',
  },
  {
    id: '2',
    name: 'Fashion Forward Ltd',
    sector: 'Retail',
    location: 'Lagos',
    tier: 'Tier 2',
    description: 'Premium fashion and lifestyle retail chain.',
    image: '👗',
  },
  {
    id: '3',
    name: 'CloudBase Systems',
    sector: 'Tech',
    location: 'Kwara',
    tier: 'Tier 1',
    description: 'Enterprise cloud infrastructure and SaaS solutions.',
    image: '☁️',
  },
  {
    id: '4',
    name: 'AutoParts Nigeria',
    sector: 'Manufacturing',
    location: 'Ogun',
    tier: 'Tier 3',
    description: 'Automotive parts manufacturing and distribution.',
    image: '🔧',
  },
  {
    id: '5',
    name: 'Green Harvest Co',
    sector: 'Agriculture',
    location: 'Ogun',
    tier: 'Tier 2',
    description: 'Organic produce cultivation and export services.',
    image: '🌱',
  },
  {
    id: '6',
    name: 'Digital Commerce Hub',
    sector: 'Tech',
    location: 'Lagos',
    tier: 'Tier 1',
    description: 'E-commerce platform and digital payment solutions.',
    image: '💳',
  },
  {
    id: '7',
    name: 'MetalWorks Industries',
    sector: 'Manufacturing',
    location: 'Lagos',
    tier: 'Tier 2',
    description: 'Industrial metal fabrication and welding services.',
    image: '⚙️',
  },
  {
    id: '8',
    name: 'Retail Express Group',
    sector: 'Retail',
    location: 'Kwara',
    tier: 'Tier 2',
    description: 'Multi-category retail with strong distribution network.',
    image: '🛍️',
  },
];

const SECTORS = ['Agriculture', 'Retail', 'Tech', 'Manufacturing'];
const LOCATIONS = ['Lagos', 'Kwara', 'Ogun'];
const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];

export default function MarketplaceView() {
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

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
              <p className="mt-2 text-muted-foreground">
                Discover businesses and opportunities across key sectors
              </p>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Sector Filter */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Sector
              </label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((sector) => (
                  <button
                    key={sector}
                    onClick={() => handleFilterChange('sector', sector)}
                    className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      filters.sector === sector
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            {/* Location and Tier Filters */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Location / State
                </label>
                <div className="relative">
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background px-4 py-2 pr-8 text-sm text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All Locations</option>
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Tier Filter */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Tier Rating
                </label>
                <div className="relative">
                  <select
                    value={filters.tier}
                    onChange={(e) => handleFilterChange('tier', e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background px-4 py-2 pr-8 text-sm text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
      </div>

      {/* Results Section */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Results Info */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Results
              <span className="ml-2 text-muted-foreground">
                ({filteredBusinesses.length} businesses)
              </span>
            </h2>
          </div>
        </div>

        {/* Grid Layout */}
        {filteredBusinesses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBusinesses.map((business) => (
              <div
                key={business.id}
                className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
              >
                {/* Image Section */}
                <div className="flex h-40 items-center justify-center bg-muted text-5xl transition-colors group-hover:bg-muted/80">
                  {business.image}
                </div>

                {/* Content Section */}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {business.name}
                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {business.description}
                  </p>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {business.sector}
                    </span>
                    <span className="inline-block rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-foreground">
                      {business.location}
                    </span>
                  </div>

                  {/* Tier Badge */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className="inline-block rounded-md bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
                      {business.tier}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-foreground">No results found</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your filters to find more businesses
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
