import { Search, Funnel } from "lucide-react";
import { useState } from "react";

export interface MembersFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  regionFilter: string;
  onRegionChange: (value: string) => void;
  superRegionFilter: string;
  onSuperRegionChange: (value: string) => void;
  ministryFilter: string;
  onMinistryChange: (value: string) => void;
  regionOptions: string[];
  superRegionOptions: string[];
  ministryOptions: string[];
  onResetFilters: () => void;
}

export default function MembersFilterBar({
  searchTerm,
  onSearchChange,
  regionFilter,
  onRegionChange,
  superRegionFilter,
  onSuperRegionChange,
  ministryFilter,
  onMinistryChange,
  regionOptions,
  superRegionOptions,
  ministryOptions,
  onResetFilters,
}: MembersFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    regionFilter,
    superRegionFilter,
    ministryFilter,
  ].filter(Boolean).length;

  const hasAnyFilter =
    searchTerm || regionFilter || superRegionFilter || ministryFilter;

  const handleReset = () => {
    onResetFilters();
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toggle Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
        {/* Standalone Search Bar */}
        <div className="form-control flex-1">
          <label className="input input-bordered flex items-center gap-3 bg-base-100 shadow-md border-base-200 w-full">
            <Search className="w-4 h-4 opacity-60" />
            <input
              type="text"
              placeholder="Search name, email, phone..."
              className="grow text-base"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>
        </div>

        {/* Actions Row */}
        <div className="flex gap-2 justify-end">
          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn shadow-md btn-outline gap-2 ${
              showFilters || activeFiltersCount > 0
                ? "btn-secondary"
                : "btn-outline"
            }`}
          >
            <Funnel className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Filters"}
            {activeFiltersCount > 0 && (
              <span className="badge badge-sm badge-primary">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Reset Filters Option */}
          {hasAnyFilter && (
            <button
              onClick={handleReset}
              className="btn btn-ghost text-error hover:bg-error/10"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card bg-base-100 border border-base-200 shadow-md">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Funnel className="w-5 h-5" />
              Filters
            </h2>

            {/* Dropdown Selects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Super Region Filter */}
              <div className="form-control">
                <select
                  aria-label="Filter by Super Region"
                  className="select select-bordered w-full text-base"
                  value={superRegionFilter}
                  onChange={(e) => onSuperRegionChange(e.target.value)}
                >
                  <option value="">All Super Regions</option>
                  {superRegionOptions.map((sr) => (
                    <option key={sr} value={sr}>
                      {sr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div className="form-control">
                <select
                  aria-label="Filter by Region"
                  className="select select-bordered w-full text-base"
                  value={regionFilter}
                  onChange={(e) => onRegionChange(e.target.value)}
                >
                  <option value="">All Regions</option>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ministry Filter */}
              <div className="form-control">
                <select
                  aria-label="Filter by Ministry"
                  className="select select-bordered w-full text-base"
                  value={ministryFilter}
                  onChange={(e) => onMinistryChange(e.target.value)}
                >
                  <option value="">All Ministries</option>
                  {ministryOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
