import {
  MemberDetailsModal,
  MembersDesktopTable,
  MembersMobileTable,
} from "@/components/members";
import { useMembers, useMembersFilters } from "@/hooks/members";
import type { MemberDoc } from "@repo/types";
import {
  DollarSign,
  MapPin,
  Search,
  Users,
  Funnel,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export default function Members() {
  const { members, loading, error } = useMembers();
  const {
    filteredMembers,
    totalCount,
    totalPledged,
    uniqueRegions,
    resetFilters,
    setSearchTerm,
    setRegionFilter,
    setSuperRegionFilter,
    setMinistryFilter,
    regionOptions,
    superRegionOptions,
    ministryOptions,
    searchTerm,
    regionFilter,
    superRegionFilter,
    ministryFilter,
  } = useMembersFilters(members);

  // Search & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handleRegionChange = (value: string) => {
    setRegionFilter(value);
    setCurrentPage(1);
  };
  const handleSuperRegionChange = (value: string) => {
    setSuperRegionFilter(value);
    setCurrentPage(1);
  };
  const handleMinistryChange = (value: string) => {
    setMinistryFilter(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    resetFilters();
    setCurrentPage(1);
  };

  // Selected Member for Modal
  const [selectedMember, setSelectedMember] = useState<MemberDoc | null>(null);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div
          data-testid="loading-spinner"
          className="loading loading-spinner loading-lg text-primary"
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error shadow-lg">
          <div className="flex gap-2">
            <span className="font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  // Paginated list
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Members
          </h1>
          <p className="text-base opacity-75">
            Browse, search, and manage church members, households, and pledges.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="card bg-base-100/60 backdrop-blur border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-6 flex flex-row items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Total Members
              </p>
              <h3 className="text-3xl font-bold mt-1">{totalCount}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100/60 backdrop-blur border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-6 flex flex-row items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Total Pledged
              </p>
              <h3 className="text-3xl font-bold mt-1 text-primary">
                $
                {totalPledged.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card bg-base-100/60 backdrop-blur border border-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="card-body p-6 flex flex-row items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Regions Represented
              </p>
              <h3 className="text-3xl font-bold mt-1">{uniqueRegions}</h3>
            </div>
            <div className="p-3 bg-info/10 text-info rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

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
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </label>
        </div>

        {/* Actions Row */}
        <div className="flex gap-2 justify-end">
          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-neutral shadow-md gap-2 ${
              showFilters || regionFilter || superRegionFilter || ministryFilter
                ? "btn-active"
                : "btn-outline"
            }`}
          >
            <Funnel className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Filters"}
            {(regionFilter || superRegionFilter || ministryFilter) && (
              <span className="badge badge-sm badge-primary">
                {
                  [regionFilter, superRegionFilter, ministryFilter].filter(
                    Boolean,
                  ).length
                }
              </span>
            )}
          </button>

          {/* Reset Filters Option */}
          {(searchTerm ||
            regionFilter ||
            superRegionFilter ||
            ministryFilter) && (
            <button
              onClick={handleResetFilters}
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
                  onChange={(e) => handleSuperRegionChange(e.target.value)}
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
                  onChange={(e) => handleRegionChange(e.target.value)}
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
                  onChange={(e) => handleMinistryChange(e.target.value)}
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

      {/* Members Table */}
      <div className="card bg-base-100 border border-base-200 shadow-lg overflow-hidden">
        {/* Mobile View List (hidden on md and up) */}
        <MembersMobileTable
          members={paginatedMembers}
          setSelectedMember={setSelectedMember}
        />

        {/* Desktop View Table (hidden on mobile) */}
        <MembersDesktopTable
          members={paginatedMembers}
          setSelectedMember={setSelectedMember}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-base-100 border-t border-base-200">
            <div className="text-sm opacity-70">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
              <span className="font-semibold">
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredMembers.length)}
              </span>{" "}
              of <span className="font-semibold">{filteredMembers.length}</span>{" "}
              members
            </div>
            <div className="join">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="join-item btn btn-outline btn-sm"
                data-testid="prev-page-button"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="join-item btn btn-outline btn-sm bg-base-100">
                Page {currentPage} of {totalPages}
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="join-item btn btn-outline btn-sm"
                data-testid="next-page-button"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      <MemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
