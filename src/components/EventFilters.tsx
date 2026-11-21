import React, { useMemo } from 'react';
import { FilterState, EventCategory, EventItem } from '../types/event';
import { extractLocationOptions, formatLocationFilterLabel } from '../utils/eventUtils';
import { Search, X, SlidersHorizontal, RotateCcw, MapPin } from 'lucide-react';

interface EventFiltersProps {
  filters: FilterState;
  events: EventItem[];
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
  totalResultsCount: number;
}

const CATEGORIES: EventCategory[] = [
  'All',
  'Technology',
  'Music & Concerts',
  'Business & Leadership',
  'Design & Arts',
  'Sports & Wellness',
  'Culinary & Culture',
];

export const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  events,
  onChange,
  onReset,
  totalResultsCount,
}) => {
  const { cities, regions } = useMemo(() => extractLocationOptions(events), [events]);

  const isFiltered = Boolean(
    filters.search ||
    filters.category !== 'All' ||
    filters.location !== 'All' ||
    filters.priceFilter !== 'All' ||
    filters.sortBy !== 'upcoming'
  );

  return (
    <div className="space-y-4">
      {/* Search Bar & Secondary Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Search Input with Clear Button */}
        <div className="relative flex-1 lg:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by name, city, venue, or keyword..."
            className="w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            aria-label="Filter events by keyword"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Location, Price & Sort Selectors */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Location (City / Region) Filter */}
          <div className="relative flex items-center">
            <label htmlFor="location-select" className="sr-only">Filter by Location</label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                id="location-select"
                value={filters.location}
                onChange={(e) => onChange({ location: e.target.value })}
                className="bg-transparent border-none text-xs text-stone-800 dark:text-stone-200 focus:outline-none cursor-pointer max-w-[165px]"
                aria-label="Filter events by location"
              >
                <option value="All">All Locations</option>
                {regions.length > 0 && (
                  <optgroup label="Regions">
                    {regions.map((region) => (
                      <option key={`region:${region}`} value={`region:${region}`}>
                        {region}
                      </option>
                    ))}
                  </optgroup>
                )}
                {cities.length > 0 && (
                  <optgroup label="Cities">
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Price Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-lg border border-stone-200/60 dark:border-stone-800 text-xs">
            {(['All', 'Free', 'Paid'] as const).map((price) => (
              <button
                key={price}
                onClick={() => onChange({ priceFilter: price })}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  filters.priceFilter === price
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {price === 'All' ? 'All Prices' : price}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <label htmlFor="sort-select" className="sr-only">Sort Events</label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                id="sort-select"
                value={filters.sortBy}
                onChange={(e) => onChange({ sortBy: e.target.value as FilterState['sortBy'] })}
                className="bg-transparent border-none text-xs text-stone-800 dark:text-stone-200 focus:outline-none cursor-pointer"
              >
                <option value="upcoming">Upcoming Date</option>
                <option value="popular">Most Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors cursor-pointer"
              aria-label="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

      </div>

      {/* Category Segmented Scrollable Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
        {CATEGORIES.map((cat) => {
          const isActive = filters.category === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange({ category: cat })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border border-stone-200 dark:border-stone-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Results Count Line */}
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
        <div>
          Showing <span className="font-semibold text-stone-800 dark:text-stone-200 tabular-nums">{totalResultsCount}</span> {totalResultsCount === 1 ? 'event' : 'events'}
          {filters.category !== 'All' && <span> in <strong className="text-stone-700 dark:text-stone-300">{filters.category}</strong></span>}
          {filters.location !== 'All' && <span> near <strong className="text-stone-700 dark:text-stone-300">{formatLocationFilterLabel(filters.location)}</strong></span>}
          {filters.search && <span> matching "<strong className="text-stone-700 dark:text-stone-300">{filters.search}</strong>"</span>}
        </div>
      </div>
    </div>
  );
};
