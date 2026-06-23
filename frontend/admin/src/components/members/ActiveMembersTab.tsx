import Pagination from "@/components/Pagination";
import { useMembersFilters } from "@/hooks/members";
import type { MemberDoc } from "@repo/types";
import { DollarSign, MapPin, Users } from "lucide-react";
import { useState } from "react";
import MembersDesktopTable from "./MembersDesktopTable";
import MembersFilterBar from "./MembersFilterBar";
import MembersMobileTable from "./MembersMobileTable";

type ActiveFiltersType = Omit<
  ReturnType<typeof useMembersFilters>,
  "filteredMembers"
> & {
  filteredMembers: MemberDoc[];
};

interface ActiveMembersTabProps {
  activeFilters: ActiveFiltersType;
  setSelectedMember: (member: MemberDoc) => void;
}

export default function ActiveMembersTab({
  activeFilters,
  setSelectedMember,
}: ActiveMembersTabProps) {
  const [currentPage, setCurrentPage] = useState(1);

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
  } = activeFilters;

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

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <>
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

      <MembersFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        regionFilter={regionFilter}
        onRegionChange={handleRegionChange}
        superRegionFilter={superRegionFilter}
        onSuperRegionChange={handleSuperRegionChange}
        ministryFilter={ministryFilter}
        onMinistryChange={handleMinistryChange}
        regionOptions={regionOptions}
        superRegionOptions={superRegionOptions}
        ministryOptions={ministryOptions}
        onResetFilters={handleResetFilters}
      />

      <div className="card bg-base-100 border border-base-200 shadow-lg overflow-hidden">
        <MembersMobileTable
          members={paginatedMembers}
          setSelectedMember={setSelectedMember}
        />

        <MembersDesktopTable
          members={paginatedMembers}
          setSelectedMember={setSelectedMember}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredMembers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemName="members"
        />
      </div>
    </>
  );
}
