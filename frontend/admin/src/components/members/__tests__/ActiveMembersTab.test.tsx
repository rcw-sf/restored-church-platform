import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActiveMembersTab from "../ActiveMembersTab";

vi.mock("../MembersDesktopTable", () => ({
  default: () => <div data-testid="members-desktop-table" />,
}));

vi.mock("../MembersMobileTable", () => ({
  default: () => <div data-testid="members-mobile-table" />,
}));

vi.mock("../MembersFilterBar", () => ({
  default: ({
    onSearchChange,
    onResetFilters,
  }: {
    onSearchChange: (value: string) => void;
    onResetFilters: () => void;
  }) => (
    <div data-testid="members-filter-bar">
      <input
        data-testid="search-input"
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button data-testid="reset-filters" onClick={onResetFilters}>
        Reset
      </button>
    </div>
  ),
}));

vi.mock("@/components/Pagination", () => ({
  default: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button data-testid="next-page" onClick={() => onPageChange(2)}>
      Next Page
    </button>
  ),
}));

describe("ActiveMembersTab", () => {
  const mockFilters = {
    filteredMembers: Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      firstName: `User${i}`,
      lastName: "",
    })),
    totalCount: 15,
    totalPledged: 1000,
    uniqueRegions: 3,
    resetFilters: vi.fn(),
    setSearchTerm: vi.fn(),
    setRegionFilter: vi.fn(),
    setSuperRegionFilter: vi.fn(),
    setMinistryFilter: vi.fn(),
    regionOptions: [],
    superRegionOptions: [],
    ministryOptions: [],
    searchTerm: "",
    regionFilter: "",
    superRegionFilter: "",
    ministryFilter: "",
  };

  it("renders KPI cards with correct stats", () => {
    render(
      <ActiveMembersTab
        activeFilters={mockFilters}
        setSelectedMember={vi.fn()}
      />,
    );
    expect(screen.getByText("Total Members").parentElement).toHaveTextContent(
      "15",
    );
    expect(screen.getByText("Total Pledged").parentElement).toHaveTextContent(
      "$1,000.00",
    );
    expect(
      screen.getByText("Regions Represented").parentElement,
    ).toHaveTextContent("3");
  });

  it("calls filter handlers when filter bar is interacted with", () => {
    render(
      <ActiveMembersTab
        activeFilters={mockFilters}
        setSelectedMember={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "test" },
    });
    expect(mockFilters.setSearchTerm).toHaveBeenCalledWith("test");

    fireEvent.click(screen.getByTestId("reset-filters"));
    expect(mockFilters.resetFilters).toHaveBeenCalled();
  });

  it("handles pagination correctly", () => {
    render(
      <ActiveMembersTab
        activeFilters={mockFilters}
        setSelectedMember={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("members-desktop-table")).toBeInTheDocument();
  });
});
