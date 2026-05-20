import type { MemberDoc } from "@repo/types";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMembersFilters } from "../useMembersFilters";

describe("useMembersFilters", () => {
  const mockMembers: MemberDoc[] = [
    {
      individualId: "1",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice.smith@example.com",
      phone: "123-456-7890",
      region: "San Francisco",
      superRegion: "Peninsula",
      ministry: "Teens",
      pledge: 100,
    },
    {
      individualId: "2",
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob.johnson@example.com",
      phone: "987-654-3210",
      region: "San Jose",
      superRegion: "South Bay",
      ministry: "Marrieds",
      pledge: 200,
    },
  ];

  it("should filter members correctly", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    // Initial state
    expect(result.current.filteredMembers).toEqual(mockMembers);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.totalPledged).toBe(300);
    expect(result.current.uniqueRegions).toBe(2);

    // Apply region filter
    act(() => {
      result.current.setRegionFilter("San Francisco");
    });

    expect(result.current.filteredMembers).toEqual([
      {
        individualId: "1",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice.smith@example.com",
        phone: "123-456-7890",
        region: "San Francisco",
        superRegion: "Peninsula",
        ministry: "Teens",
        pledge: 100,
      },
    ]);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.totalPledged).toBe(100);
    expect(result.current.regionFilter).toBe("San Francisco");
    expect(result.current.uniqueRegions).toBe(1);
  });

  it("should filter by superRegion correctly", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    // Apply superRegion filter
    act(() => {
      result.current.setSuperRegionFilter("South Bay");
    });

    expect(result.current.filteredMembers).toEqual([
      {
        individualId: "2",
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob.johnson@example.com",
        phone: "987-654-3210",
        region: "San Jose",
        superRegion: "South Bay",
        ministry: "Marrieds",
        pledge: 200,
      },
    ]);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.totalPledged).toBe(200);
    expect(result.current.superRegionFilter).toBe("South Bay");
    expect(result.current.uniqueRegions).toBe(1);
  });

  it("should filter by ministry correctly", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    // Apply ministry filter
    act(() => {
      result.current.setMinistryFilter("Teens");
    });

    expect(result.current.filteredMembers).toEqual([
      {
        individualId: "1",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice.smith@example.com",
        phone: "123-456-7890",
        region: "San Francisco",
        superRegion: "Peninsula",
        ministry: "Teens",
        pledge: 100,
      },
    ]);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.totalPledged).toBe(100);
    expect(result.current.ministryFilter).toBe("Teens");
    expect(result.current.uniqueRegions).toBe(1);
  });

  it("should set search term correctly and filter members based on it", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    // Apply search term
    act(() => {
      result.current.setSearchTerm("alice");
    });

    expect(result.current.filteredMembers).toEqual([
      {
        individualId: "1",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice.smith@example.com",
        phone: "123-456-7890",
        region: "San Francisco",
        superRegion: "Peninsula",
        ministry: "Teens",
        pledge: 100,
      },
    ]);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.totalPledged).toBe(300);
    expect(result.current.searchTerm).toBe("alice");
    expect(result.current.uniqueRegions).toBe(2);
  });

  it("should return unique filter options correctly", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    expect(result.current.regionOptions).toEqual(["San Francisco", "San Jose"]);
    expect(result.current.superRegionOptions).toEqual([
      "Peninsula",
      "South Bay",
    ]);
    expect(result.current.ministryOptions).toEqual(["Marrieds", "Teens"]);
  });

  it("should filter by multiple criteria correctly", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    // Apply multiple filters
    act(() => {
      result.current.setRegionFilter("San Francisco");
      result.current.setSuperRegionFilter("Peninsula");
      result.current.setMinistryFilter("Teens");
    });

    expect(result.current.filteredMembers).toEqual([
      {
        individualId: "1",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice.smith@example.com",
        phone: "123-456-7890",
        region: "San Francisco",
        superRegion: "Peninsula",
        ministry: "Teens",
        pledge: 100,
      },
    ]);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.totalPledged).toBe(100);
    expect(result.current.regionFilter).toBe("San Francisco");
    expect(result.current.superRegionFilter).toBe("Peninsula");
    expect(result.current.ministryFilter).toBe("Teens");
    expect(result.current.uniqueRegions).toBe(1);
  });

  it("should reset filters correctly", () => {
    const { result } = renderHook(() => useMembersFilters(mockMembers));

    // Apply some filters
    act(() => {
      result.current.setRegionFilter("San Francisco");
      result.current.setSuperRegionFilter("Peninsula");
      result.current.setMinistryFilter("Teens");
    });

    expect(result.current.filteredMembers).toEqual([
      {
        individualId: "1",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice.smith@example.com",
        phone: "123-456-7890",
        region: "San Francisco",
        superRegion: "Peninsula",
        ministry: "Teens",
        pledge: 100,
      },
    ]);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.totalPledged).toBe(100);
    expect(result.current.regionFilter).toBe("San Francisco");
    expect(result.current.superRegionFilter).toBe("Peninsula");
    expect(result.current.ministryFilter).toBe("Teens");
    expect(result.current.uniqueRegions).toBe(1);

    // Reset filters
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filteredMembers).toEqual(mockMembers);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.totalPledged).toBe(300);
    expect(result.current.regionFilter).toBe("");
    expect(result.current.superRegionFilter).toBe("");
    expect(result.current.ministryFilter).toBe("");
    expect(result.current.searchTerm).toBe("");
    expect(result.current.uniqueRegions).toBe(2);
  });
});
