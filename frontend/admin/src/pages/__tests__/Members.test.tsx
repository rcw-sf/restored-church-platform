import type { MembersDesktopTableProps } from "@/components/members/MembersDesktopTable";
import type { MemberDoc } from "@repo/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMembers, useMembersFilters } from "../../hooks/members";
import Members from "../Members";

const mockMembers: MemberDoc[] = [
  {
    individualId: "1",
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    phone: "555-1111",
    region: "San Francisco",
    superRegion: "Peninsula",
    ministry: "Singles",
    pledge: 500,
  },
  {
    individualId: "2",
    firstName: "Bob",
    lastName: "Jones",
    email: "bob@example.com",
    region: "San Jose",
    superRegion: "South Bay",
    pledge: 0,
  },
];

vi.mock("../../hooks/members", async () => {
  return {
    useMembers: vi.fn(),
    useMembersFilters: vi.fn(),
  };
});

vi.mock("@/components/members/MembersDesktopTable", () => ({
  default: (props: MembersDesktopTableProps) => (
    <div data-testid="members-desktop-table">
      {props.members.map((member) => (
        <button
          key={member.individualId}
          data-testid="member-row"
          onClick={() => props.setSelectedMember(member)}
        >
          {member.firstName} {member.lastName}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/members/MembersMobileTable", () => ({
  default: (props: MembersDesktopTableProps) => (
    <div data-testid="members-mobile-table">
      {props.members.map((member) => (
        <button
          key={member.individualId}
          data-testid="member-row"
          onClick={() => props.setSelectedMember(member)}
        >
          {member.firstName} {member.lastName}
        </button>
      ))}
    </div>
  ),
}));

describe("Members Component", () => {
  it("renders a loading spinner when data is fetching", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: true,
      error: null,
      members: [],
    });

    vi.mocked(useMembersFilters).mockReturnValue({
      totalCount: 2,
      totalPledged: 500,
      uniqueRegions: 2,
      filteredMembers: [],
      regionOptions: ["San Francisco", "San Jose"],
      superRegionOptions: ["Peninsula", "South Bay"],
      ministryOptions: ["Singles"],
      searchTerm: "",
      setSearchTerm: vi.fn(),
      regionFilter: "",
      setRegionFilter: vi.fn(),
      superRegionFilter: "",
      setSuperRegionFilter: vi.fn(),
      ministryFilter: "",
      setMinistryFilter: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<Members />);

    const loader = screen.getByTestId("loading-spinner");
    expect(loader).toBeInTheDocument();
  });

  it("renders an error message when loading fails", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: "Failed to load members",
      members: [],
    });

    vi.mocked(useMembersFilters).mockReturnValue({
      totalCount: 2,
      totalPledged: 500,
      uniqueRegions: 2,
      filteredMembers: [],
      regionOptions: ["San Francisco", "San Jose"],
      superRegionOptions: ["Peninsula", "South Bay"],
      ministryOptions: ["Singles"],
      searchTerm: "",
      setSearchTerm: vi.fn(),
      regionFilter: "",
      setRegionFilter: vi.fn(),
      superRegionFilter: "",
      setSuperRegionFilter: vi.fn(),
      ministryFilter: "",
      setMinistryFilter: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<Members />);

    expect(screen.getByText(/Failed to load members/i)).toBeInTheDocument();
  });

  it("renders members list and KPI stats cards correctly when loaded", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
    });

    vi.mocked(useMembersFilters).mockReturnValue({
      totalCount: 2,
      totalPledged: 500,
      uniqueRegions: 2,
      filteredMembers: mockMembers,
      regionOptions: ["San Francisco", "San Jose"],
      superRegionOptions: ["Peninsula", "South Bay"],
      ministryOptions: ["Singles"],
      searchTerm: "",
      setSearchTerm: vi.fn(),
      regionFilter: "",
      setRegionFilter: vi.fn(),
      superRegionFilter: "",
      setSuperRegionFilter: vi.fn(),
      ministryFilter: "",
      setMinistryFilter: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<Members />);

    // KPI cards checks
    const totalMembersCard = screen.getByText("Total Members").closest(".card");
    expect(totalMembersCard).toHaveTextContent("2");

    const totalPledgedCard = screen.getByText("Total Pledged").closest(".card");
    expect(totalPledgedCard).toHaveTextContent("$500.00");

    // Table checks
    expect(screen.getAllByText("Alice Smith")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Bob Jones")[0]).toBeInTheDocument();
  });

  it("should call useMembersFilters when search term changes", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
    });

    vi.mocked(useMembersFilters).mockReturnValue({
      totalCount: 2,
      totalPledged: 500,
      uniqueRegions: 2,
      filteredMembers: mockMembers,
      regionOptions: ["San Francisco", "San Jose"],
      superRegionOptions: ["Peninsula", "South Bay"],
      ministryOptions: ["Singles"],
      searchTerm: "",
      setSearchTerm: vi.fn(),
      regionFilter: "",
      setRegionFilter: vi.fn(),
      superRegionFilter: "",
      setSuperRegionFilter: vi.fn(),
      ministryFilter: "",
      setMinistryFilter: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<Members />);

    // Initial KPI check
    const totalMembersCard = screen.getByText("Total Members").closest(".card");
    expect(totalMembersCard).toHaveTextContent("2");

    expect(screen.getAllByText("Alice Smith")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Bob Jones")[0]).toBeInTheDocument();

    // Find search box
    const searchInput = screen.getByPlaceholderText(
      /Search name, email, phone.../i,
    );
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    // Verify that useMembersFilters was called with the updated search term
    expect(vi.mocked(useMembersFilters)).toHaveBeenCalledWith(
      expect.arrayContaining(mockMembers),
    );
  });

  it("should call useMembersFilters when region filter changes", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
    });

    vi.mocked(useMembersFilters).mockReturnValue({
      totalCount: 2,
      totalPledged: 500,
      uniqueRegions: 2,
      filteredMembers: mockMembers,
      regionOptions: ["San Francisco", "San Jose"],
      superRegionOptions: ["Peninsula", "South Bay"],
      ministryOptions: ["Singles"],
      searchTerm: "",
      setSearchTerm: vi.fn(),
      regionFilter: "",
      setRegionFilter: vi.fn(),
      superRegionFilter: "",
      setSuperRegionFilter: vi.fn(),
      ministryFilter: "",
      setMinistryFilter: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<Members />);

    // Initial KPI check
    const totalMembersCard = screen.getByText("Total Members").closest(".card");
    expect(totalMembersCard).toHaveTextContent("2");

    expect(screen.getAllByText("Alice Smith")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Bob Jones")[0]).toBeInTheDocument();

    // Click Filters toggle button to show dropdowns
    const filtersBtn = screen.getByRole("button", { name: /^filters$/i });
    fireEvent.click(filtersBtn);

    // Region filter select dropdown
    const regionSelect = screen.getByLabelText(/Filter by Region/i);
    fireEvent.change(regionSelect, { target: { value: "San Francisco" } });

    // Verify that useMembersFilters was called with the updated region filter
    expect(vi.mocked(useMembersFilters)).toHaveBeenCalledWith(
      expect.arrayContaining(mockMembers),
    );
  });

  it("paginates the members list correctly", () => {
    // Generate 12 mock members (will be sorted alphabetically: User 1, User 10, User 11, User 12, User 2, User 3...)
    const mockMembers: MemberDoc[] = Array.from({ length: 12 }, (_, i) => ({
      individualId: `id-${i + 1}`,
      firstName: "User",
      lastName: `${String(i + 1).padStart(2, "0")}`, // padded so alphabetical sort is predictable: 01, 02...
      email: `user${i + 1}@example.com`,
    }));

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
    });
    vi.mocked(useMembersFilters).mockReturnValue({
      totalCount: 12,
      totalPledged: 0,
      uniqueRegions: 0,
      filteredMembers: mockMembers,
      regionOptions: [],
      superRegionOptions: [],
      ministryOptions: [],
      searchTerm: "",
      setSearchTerm: vi.fn(),
      regionFilter: "",
      setRegionFilter: vi.fn(),
      superRegionFilter: "",
      setSuperRegionFilter: vi.fn(),
      ministryFilter: "",
      setMinistryFilter: vi.fn(),
      resetFilters: vi.fn(),
    });

    render(<Members />);

    // Verify page 1 items are shown (first 10, i.e., User 01 through User 10)
    expect(screen.getAllByText("User 01")[0]).toBeInTheDocument();
    expect(screen.getAllByText("User 10")[0]).toBeInTheDocument();
    // User 11 and 12 should not be on first page
    expect(screen.queryByText("User 11")).not.toBeInTheDocument();
    expect(screen.queryByText("User 12")).not.toBeInTheDocument();

    // Verify pagination info text
    expect(
      screen.getByText(
        (_, node) => node?.textContent === "Showing 1 to 10 of 12 members",
      ),
    ).toBeInTheDocument();

    // Click next page button
    const nextBtn = screen.getAllByTestId("next-page-button")[0];
    fireEvent.click(nextBtn);

    // Now page 2 items should be shown
    expect(screen.queryByText("User 10")).not.toBeInTheDocument();
    expect(screen.getAllByText("User 11")[0]).toBeInTheDocument();
    expect(screen.getAllByText("User 12")[0]).toBeInTheDocument();

    // Verify updated pagination info text
    expect(
      screen.getByText(
        (_, node) => node?.textContent === "Showing 11 to 12 of 12 members",
      ),
    ).toBeInTheDocument();

    // Click previous page button
    const prevBtn = screen.getAllByTestId("prev-page-button")[0];
    fireEvent.click(prevBtn);

    // Back to page 1
    expect(screen.getAllByText("User 01")[0]).toBeInTheDocument();
  });
});
