import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PendingMembersTab from "../PendingMembersTab";

vi.mock("../MembersFilterBar", () => ({
  default: ({
    onSearchChange,
  }: {
    onSearchChange: (value: string) => void;
  }) => (
    <div data-testid="members-filter-bar">
      <input
        data-testid="search-input"
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("../PendingMembersList", () => ({
  default: () => <div data-testid="pending-members-list" />,
}));

describe("PendingMembersTab", () => {
  const mockFilters = {
    filteredMembers: [],
    searchTerm: "",
    setSearchTerm: vi.fn(),
    regionFilter: "",
    setRegionFilter: vi.fn(),
    superRegionFilter: "",
    setSuperRegionFilter: vi.fn(),
    ministryFilter: "",
    setMinistryFilter: vi.fn(),
    regionOptions: [],
    superRegionOptions: [],
    ministryOptions: [],
    totalCount: 0,
    totalPledged: 0,
    uniqueRegions: 0,
    resetFilters: vi.fn(),
  };

  it("renders status filter buttons and handles clicks", () => {
    const setPendingStatus = vi.fn();
    render(
      <PendingMembersTab
        pendingStatus="pending"
        setPendingStatus={setPendingStatus}
        pendingFilters={mockFilters}
        pendingLoading={false}
        role="admin"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    const approvedBtn = screen.getByRole("button", { name: "approved" });
    fireEvent.click(approvedBtn);
    expect(setPendingStatus).toHaveBeenCalledWith("approved");
  });

  it("renders the filter bar and pending list", () => {
    render(
      <PendingMembersTab
        pendingStatus="pending"
        setPendingStatus={vi.fn()}
        pendingFilters={mockFilters}
        pendingLoading={false}
        role="admin"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("members-filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("pending-members-list")).toBeInTheDocument();
  });
});
