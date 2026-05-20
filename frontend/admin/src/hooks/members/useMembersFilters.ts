import type { MemberDoc, Ministry, Region, SuperRegion } from "@repo/types";
import { useState } from "react";

export const useMembersFilters = (members: MemberDoc[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [superRegionFilter, setSuperRegionFilter] = useState("");
  const [ministryFilter, setMinistryFilter] = useState("");

  // Derived calculations (KPIs) - Filtered by dropdown selections, ignoring search
  const filteredForKpis = members.filter((member) => {
    const matchesRegion = !regionFilter || member.region === regionFilter;
    const matchesSuperRegion =
      !superRegionFilter || member.superRegion === superRegionFilter;
    const matchesMinistry =
      !ministryFilter || member.ministry === ministryFilter;

    return matchesRegion && matchesSuperRegion && matchesMinistry;
  });

  const totalCount = filteredForKpis.length;
  const totalPledged = filteredForKpis.reduce(
    (sum, m) => sum + (m.pledge || 0),
    0,
  );
  const uniqueRegions = Array.from(
    new Set(
      filteredForKpis.map((m) => m.region).filter((r): r is Region => !!r),
    ),
  ).length;

  // Filter list
  const filteredMembers = members.filter((member) => {
    // Search filter (name, email, phone, ministry)
    const fullName =
      `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
    const email = (member.email || "").toLowerCase();
    const phone = (member.phone || "").toLowerCase();
    const ministry = (member.ministry || "").toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      phone.includes(searchLower) ||
      ministry.includes(searchLower);

    // Dropdown filters
    const matchesRegion = !regionFilter || member.region === regionFilter;
    const matchesSuperRegion =
      !superRegionFilter || member.superRegion === superRegionFilter;
    const matchesMinistry =
      !ministryFilter || member.ministry === ministryFilter;

    return (
      matchesSearch && matchesRegion && matchesSuperRegion && matchesMinistry
    );
  });

  // Extract unique filter options for dropdowns
  const regionOptions = Array.from(
    new Set(
      filteredMembers.map((m) => m.region).filter((r): r is Region => !!r),
    ),
  ).sort();

  const superRegionOptions = Array.from(
    new Set(
      filteredMembers
        .map((m) => m.superRegion)
        .filter((sr): sr is SuperRegion => !!sr),
    ),
  ).sort();

  const ministryOptions = Array.from(
    new Set(
      filteredMembers
        .map((m) => m.ministry)
        .filter((min): min is Ministry => !!min),
    ),
  ).sort();

  const resetFilters = () => {
    setSearchTerm("");
    setRegionFilter("");
    setSuperRegionFilter("");
    setMinistryFilter("");
  };

  return {
    searchTerm,
    setSearchTerm,
    regionFilter,
    setRegionFilter,
    superRegionFilter,
    setSuperRegionFilter,
    ministryFilter,
    setMinistryFilter,
    filteredMembers,
    regionOptions,
    superRegionOptions,
    ministryOptions,
    totalCount,
    totalPledged,
    uniqueRegions,
    resetFilters,
  };
};
