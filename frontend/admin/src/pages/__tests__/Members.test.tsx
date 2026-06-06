import type { MembersDesktopTableProps } from "@/components/members/MembersDesktopTable";
import { useAuth } from "@/hooks";
import {
  useMembers,
  useMembersFilters,
  usePendingMembers,
} from "@/hooks/members";
import type { MemberDoc } from "@repo/types";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Members from "../Members";

const mockMembers: MemberDoc[] = [
  {
    id: "1",
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
    id: "2",
    firstName: "Bob",
    lastName: "Jones",
    email: "bob@example.com",
    region: "San Jose",
    superRegion: "South Bay",
    pledge: 0,
  },
];

vi.mock("@/hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router", () => ({
  useParams: () => ({ tenantId: "test-tenant" }),
}));

vi.mock("@/components/members/MemberDetailsModal", () => ({
  default: ({ member, onClose, onEdit }: any) => {
    if (!member) return null;
    return (
      <div data-testid="member-details-modal">
        <div>Member ID: {member.individualId}</div>
        <button data-testid="details-close-button" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="details-edit-button"
          onClick={() => onEdit(member)}
        >
          Edit Details
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/members/MemberFormModal", () => {
  return {
    default: ({
      isOpen,
      onClose,
      onSuccess,
      mode,
      initialData,
      isRedirected,
    }: any) => {
      const { role } = useAuth();
      if (!isOpen) return null;

      let headerTitle = "";
      if (mode === "create") {
        headerTitle =
          role === "editor" ? "Request Add Member" : "Add New Member";
      } else if (mode === "edit-pending") {
        headerTitle = "Edit Pending Request";
      } else if (mode === "edit-member") {
        headerTitle =
          role === "editor" ? "Request Edit Member" : "Edit Member Details";
      }

      return (
        <div data-testid="member-form-modal">
          <div>{headerTitle}</div>
          {isRedirected && (
            <div>You are editing an existing pending request</div>
          )}
          <label>
            First Name
            <input readOnly value={initialData?.firstName || ""} />
          </label>
          <label>
            Last Name
            <input readOnly value={initialData?.lastName || ""} />
          </label>
          <label>
            Email Address
            <input readOnly value={initialData?.email || ""} />
          </label>
          <button aria-label="Close" onClick={onClose}>
            Close
          </button>
          <button data-testid="mock-submit-success" onClick={onSuccess}>
            Submit Form
          </button>
        </div>
      );
    },
  };
});

const mockSetSearchTerm = vi.fn();
const mockSetRegionFilter = vi.fn();
const mockSetSuperRegionFilter = vi.fn();
const mockSetMinistryFilter = vi.fn();
const mockResetFilters = vi.fn();

vi.mock("@/hooks/members", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/members")>();
  return {
    ...actual,
    useMembers: vi.fn(),
    usePendingMembers: vi.fn(),
    useMembersFilters: vi.fn((members) => {
      const totalCount = members.length;
      const totalPledged = members.reduce(
        (sum: number, m: any) => sum + (m.pledge || 0),
        0,
      );
      const uniqueRegions = new Set(
        members.map((m: any) => m.region).filter(Boolean),
      ).size;
      const regionOptions = Array.from(
        new Set(members.map((m: any) => m.region).filter(Boolean)),
      ) as string[];
      const superRegionOptions = Array.from(
        new Set(members.map((m: any) => m.superRegion).filter(Boolean)),
      ) as string[];
      const ministryOptions = Array.from(
        new Set(members.map((m: any) => m.ministry).filter(Boolean)),
      ) as string[];

      return {
        searchTerm: "",
        setSearchTerm: mockSetSearchTerm,
        regionFilter: "",
        setRegionFilter: mockSetRegionFilter,
        superRegionFilter: "",
        setSuperRegionFilter: mockSetSuperRegionFilter,
        ministryFilter: "",
        setMinistryFilter: mockSetMinistryFilter,
        filteredMembers: members,
        regionOptions,
        superRegionOptions,
        ministryOptions,
        totalCount,
        totalPledged,
        uniqueRegions,
        resetFilters: mockResetFilters,
      };
    }),
  };
});

vi.mock("@/components/members/MembersDesktopTable", () => ({
  default: (props: MembersDesktopTableProps) => (
    <div data-testid="members-desktop-table">
      {props.members.map((member) => (
        <button
          key={member.id}
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
          key={member.id}
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSearchTerm.mockClear();
    mockSetRegionFilter.mockClear();
    mockSetSuperRegionFilter.mockClear();
    mockSetMinistryFilter.mockClear();
    mockResetFilters.mockClear();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "admin@test.com",
        displayName: "Admin",
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      isAuthorized: true,
      role: "admin",
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: [],
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    });
  });

  it("renders a loading spinner when data is fetching", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: true,
      error: null,
      members: [],
      refetch: vi.fn(),
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
      refetch: vi.fn(),
    });

    render(<Members />);

    expect(screen.getByText(/Failed to load members/i)).toBeInTheDocument();
  });

  it("renders members list and KPI stats cards correctly when loaded", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
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
      refetch: vi.fn(),
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

    // Verify that useMembersFilters was called
    expect(vi.mocked(useMembersFilters)).toHaveBeenCalledWith(
      expect.arrayContaining(mockMembers),
    );
  });

  it("should call useMembersFilters when region filter changes", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
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

    // Verify that useMembersFilters was called
    expect(vi.mocked(useMembersFilters)).toHaveBeenCalledWith(
      expect.arrayContaining(mockMembers),
    );
  });

  it("paginates the members list correctly", () => {
    // Generate 12 mock members (will be sorted alphabetically: User 1, User 10, User 11, User 12, User 2, User 3...)
    const mockMembers: MemberDoc[] = Array.from({ length: 12 }, (_, i) => ({
      id: `id-${i + 1}`,
      firstName: "User",
      lastName: `${String(i + 1).padStart(2, "0")}`, // padded so alphabetical sort is predictable: 01, 02...
      email: `user${i + 1}@example.com`,
    }));

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
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

  it("allows editors to view Pending Approvals tab but hides action buttons", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "editor@test.com",
        displayName: "Editor",
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      isAuthorized: true,
      role: "editor",
      login: vi.fn(),
      logout: vi.fn(),
    });

    const mockPendingMembers = [
      {
        id: "pending-1",
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
        createdBy: "editor@test.com",
        requestType: "create" as const,
        status: "pending" as const,
      },
    ];

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: mockPendingMembers,
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });

    render(<Members />);

    // Verify the "Pending Approvals" tab is visible
    const pendingTab = screen.getByRole("button", {
      name: /Pending Approvals/i,
    });
    expect(pendingTab).toBeInTheDocument();

    // Click the Pending Approvals tab
    fireEvent.click(pendingTab);

    // Verify the pending member name is displayed
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();

    // Verify the Approve and Reject buttons are NOT present
    expect(screen.queryByTestId("approve-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reject-button")).not.toBeInTheDocument();
  });

  it("allows admins to view Pending Approvals tab and shows action buttons", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "admin@test.com",
        displayName: "Admin",
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      isAuthorized: true,
      role: "admin",
      login: vi.fn(),
      logout: vi.fn(),
    });

    const mockPendingMembers = [
      {
        id: "pending-1",
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
        createdBy: "editor@test.com",
        requestType: "create" as const,
        status: "pending" as const,
      },
    ];

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: mockPendingMembers,
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });

    render(<Members />);

    // Verify the "Pending Approvals" tab is visible
    const pendingTab = screen.getByRole("button", {
      name: /Pending Approvals/i,
    });
    expect(pendingTab).toBeInTheDocument();

    // Click the Pending Approvals tab
    fireEvent.click(pendingTab);

    // Verify the pending member name is displayed
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();

    // Verify the Approve and Reject buttons are present
    expect(screen.getByTestId("approve-button")).toBeInTheDocument();
    expect(screen.getByTestId("reject-button")).toBeInTheDocument();
  });

  it("redirects editors to edit-pending mode with info banner if member has a pending update request", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "editor@test.com",
        displayName: "Editor",
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      isAuthorized: true,
      role: "editor",
      login: vi.fn(),
      logout: vi.fn(),
    });

    const mockPendingMembers = [
      {
        id: "pending-1",
        firstName: "Alice",
        lastName: "Smith-Pending",
        gender: "Female",
        email: "alice-pending@example.com",
        region: "San Francisco" as const,
        superRegion: "Peninsula" as const,
        ministry: "Singles" as const,
        type: "Baptism" as const,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
        createdBy: "editor@test.com",
        requestType: "update" as const,
        status: "pending" as const,
        targetMemberId: "1",
      },
    ];

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: mockPendingMembers,
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    render(<Members />);

    // Click Alice Smith row in table to open details modal
    fireEvent.click(screen.getAllByText("Alice Smith")[0]);

    // Verify Details modal is open
    expect(screen.getByText("Member ID: 1")).toBeInTheDocument();

    // Click Edit button inside details modal
    fireEvent.click(screen.getByTestId("details-edit-button"));

    // Verify Form modal opens in edit-pending mode and displays the warning info alert
    expect(screen.getByText("Edit Pending Request")).toBeInTheDocument();
    expect(
      screen.getByText(/You are editing an existing pending request/i),
    ).toBeInTheDocument();

    // Verify it loaded the pending request's data (Smith-Pending and alice-pending@example.com) instead of the active member's data
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue("Smith-Pending");
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue(
      "alice-pending@example.com",
    );
  });

  it("does not display the info banner when editing a pending request directly from the Pending tab", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "editor@test.com",
        displayName: "Editor",
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      isAuthorized: true,
      role: "editor",
      login: vi.fn(),
      logout: vi.fn(),
    });

    const mockPendingMembers = [
      {
        id: "pending-1",
        firstName: "Charlie",
        lastName: "Brown",
        gender: "Male",
        email: "charlie@example.com",
        region: "San Francisco" as const,
        superRegion: "Peninsula" as const,
        ministry: "Singles" as const,
        type: "Baptism" as const,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
        createdBy: "editor@test.com",
        requestType: "create" as const,
        status: "pending" as const,
      },
    ];

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: mockPendingMembers,
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });

    render(<Members />);

    // Click the Pending Approvals tab
    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));

    // Click the Edit button on Charlie Brown request card
    fireEvent.click(screen.getByTestId("edit-button"));

    // Verify Form modal opens in edit-pending mode
    expect(screen.getByText("Edit Pending Request")).toBeInTheDocument();

    // Verify it does NOT display the warning info alert
    expect(
      screen.queryByText(/You are editing an existing pending request/i),
    ).not.toBeInTheDocument();
  });

  it("allows admins to approve a pending member request successfully", async () => {
    const mockApprove = vi.fn().mockResolvedValue(undefined);
    const mockRefetch = vi.fn();

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: [
        {
          id: "pending-1",
          firstName: "Charlie",
          lastName: "Brown",
          email: "charlie@example.com",
          createdAt: "2026-05-29T00:00:00.000Z",
          updatedAt: "2026-05-29T00:00:00.000Z",
          createdBy: "editor@test.com",
          requestType: "create" as const,
          status: "pending" as const,
        },
      ],
      loading: false,
      error: null,
      approveMember: mockApprove,
      rejectMember: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: mockRefetch,
    });

    render(<Members />);

    // Go to Pending Approvals tab
    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));

    // Click approve button
    const approveBtn = screen.getByTestId("approve-button");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(
        expect.objectContaining({ id: "pending-1", firstName: "Charlie" }),
      );
    });

    // Check toast message
    expect(
      screen.getByText(/Charlie Brown approved successfully/i),
    ).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("handles failure when approving a pending member request", async () => {
    const mockApprove = vi.fn().mockRejectedValue(new Error("Firebase error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: [
        {
          id: "pending-1",
          firstName: "Charlie",
          lastName: "Brown",
          email: "charlie@example.com",
          createdAt: "2026-05-29T00:00:00.000Z",
          updatedAt: "2026-05-29T00:00:00.000Z",
          createdBy: "editor@test.com",
          requestType: "create" as const,
          status: "pending" as const,
        },
      ],
      loading: false,
      error: null,
      approveMember: mockApprove,
      rejectMember: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });

    render(<Members />);

    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));
    fireEvent.click(screen.getByTestId("approve-button"));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/Failed to approve member request/i),
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("allows admins to reject a pending member request successfully", async () => {
    const mockReject = vi.fn().mockResolvedValue(undefined);

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: [
        {
          id: "pending-1",
          firstName: "Charlie",
          lastName: "Brown",
          email: "charlie@example.com",
          createdAt: "2026-05-29T00:00:00.000Z",
          updatedAt: "2026-05-29T00:00:00.000Z",
          createdBy: "editor@test.com",
          requestType: "create" as const,
          status: "pending" as const,
        },
      ],
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: mockReject,
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });

    render(<Members />);

    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));

    const rejectBtn = screen.getByTestId("reject-button");
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith(
        expect.objectContaining({ id: "pending-1", firstName: "Charlie" }),
      );
    });

    expect(
      screen.getByText(/Request for Charlie Brown rejected/i),
    ).toBeInTheDocument();
  });

  it("handles failure when rejecting a pending member request", async () => {
    const mockReject = vi.fn().mockRejectedValue(new Error("Firebase error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: [
        {
          id: "pending-1",
          firstName: "Charlie",
          lastName: "Brown",
          email: "charlie@example.com",
          createdAt: "2026-05-29T00:00:00.000Z",
          updatedAt: "2026-05-29T00:00:00.000Z",
          createdBy: "editor@test.com",
          requestType: "create" as const,
          status: "pending" as const,
        },
      ],
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: mockReject,
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });

    render(<Members />);

    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));
    fireEvent.click(screen.getByTestId("reject-button"));

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/Failed to reject member request/i),
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("allows admins to edit an active member directly and updates successfully", async () => {
    const mockRefetch = vi.fn();

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: mockRefetch,
    });

    render(<Members />);

    // Click Alice Smith row in table to open details modal
    fireEvent.click(screen.getAllByText("Alice Smith")[0]);

    // Click Edit button inside details modal
    fireEvent.click(screen.getByTestId("details-edit-button"));

    // Verify form modal is opened with Edit Member Details header
    expect(screen.getByText("Edit Member Details")).toBeInTheDocument();

    // Verify it doesn't show redirection warning
    expect(
      screen.queryByText(/You are editing an existing pending request/i),
    ).not.toBeInTheDocument();

    // Trigger onSuccess by clicking our mock submit button
    fireEvent.click(screen.getByTestId("mock-submit-success"));

    expect(
      screen.getByText(/Member updated successfully/i),
    ).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("closes the MemberFormModal when onClose is triggered", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    render(<Members />);

    // Click Add Member to open modal
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    expect(screen.getByTestId("member-form-modal")).toBeInTheDocument();

    // Click close button inside form modal
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));

    expect(screen.queryByTestId("member-form-modal")).not.toBeInTheDocument();
  });

  it("shows editor toast notification when submitting request to add or edit a member", async () => {
    const mockEditorUser = {
      email: "editor@test.com",
      displayName: "Editor",
    } as any;

    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockEditorUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    const { unmount } = render(<Members />);

    // Test request to add member
    fireEvent.click(
      screen.getByRole("button", { name: /Request Add Member/i }),
    );
    fireEvent.click(screen.getByTestId("mock-submit-success"));

    await waitFor(() => {
      expect(
        screen.getByText(/Request to add member submitted for admin review/i),
      ).toBeInTheDocument();
    });

    unmount();

    // Test request to edit member
    render(<Members />);
    fireEvent.click(screen.getAllByText("Alice Smith")[0]);
    fireEvent.click(screen.getByTestId("details-edit-button"));

    expect(screen.getByText("Request Edit Member")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("mock-submit-success"));

    await waitFor(() => {
      expect(
        screen.getByText(/Request to edit member submitted for admin review/i),
      ).toBeInTheDocument();
    });
  });

  it("allows admins to add an active member directly and updates successfully", async () => {
    const mockRefetch = vi.fn();
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: mockRefetch,
    });

    render(<Members />);

    // Click Add Member
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    // Verify creation modal is open
    expect(screen.getByText("Add New Member")).toBeInTheDocument();

    // Trigger success callback
    fireEvent.click(screen.getByTestId("mock-submit-success"));

    expect(screen.getByText(/Member added successfully/i)).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("allows editing a pending request and updates successfully", async () => {
    const mockPending: any[] = [
      {
        id: "pending-123",
        firstName: "Lucy",
        lastName: "Van Pelt",
        status: "pending",
        requestType: "create",
      },
    ];

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });
    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: mockPending,
      loading: false,
      error: null,
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    });

    render(<Members />);

    // Switch to Pending tab
    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));

    // Click edit request button
    fireEvent.click(screen.getByTestId("edit-button"));

    // Verify it opened edit pending modal
    expect(screen.getByText("Edit Pending Request")).toBeInTheDocument();

    // Click submit success
    fireEvent.click(screen.getByTestId("mock-submit-success"));

    expect(
      screen.getByText(/Pending request updated successfully/i),
    ).toBeInTheDocument();
  });

  it("closes the MemberDetailsModal when onClose is triggered", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    render(<Members />);

    // Open details modal
    fireEvent.click(screen.getAllByText("Alice Smith")[0]);
    expect(screen.getByTestId("member-details-modal")).toBeInTheDocument();

    // Click close button inside details modal
    fireEvent.click(screen.getByTestId("details-close-button"));
    expect(
      screen.queryByTestId("member-details-modal"),
    ).not.toBeInTheDocument();
  });

  it("toggles back to active tab from pending tab", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    render(<Members />);

    // Switch to Pending tab
    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));

    // Switch back to Active tab
    fireEvent.click(screen.getByRole("button", { name: /Active Members/i }));

    // Verify Active view is active
    expect(screen.getAllByText("Alice Smith")[0]).toBeInTheDocument();
  });

  it("dismisses toast automatically after timeout", async () => {
    vi.useFakeTimers();
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    render(<Members />);

    // Trigger toast by clicking Add Member and submitting
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));
    fireEvent.click(screen.getByTestId("mock-submit-success"));

    expect(screen.getByText(/Member added successfully/i)).toBeInTheDocument();

    // Advance fake timers inside act to flush React state updates
    await act(async () => {
      vi.runAllTimers();
    });

    // Toast should be gone
    expect(
      screen.queryByText(/Member added successfully/i),
    ).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("handles edit of member with missing individualId fallback", () => {
    const mockMemberNoId: MemberDoc[] = [
      {
        firstName: "Dave",
        lastName: "NoId",
        email: "dave@example.com",
        region: "Berkeley",
        superRegion: "East Bay",
        ministry: "Campus",
      },
    ];

    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMemberNoId,
      refetch: vi.fn(),
    });

    render(<Members />);

    // Open details
    fireEvent.click(screen.getAllByText("Dave NoId")[0]);
    // Edit details
    fireEvent.click(screen.getByTestId("details-edit-button"));

    expect(screen.getByText("Edit Member Details")).toBeInTheDocument();
  });

  it("filters active list by Super Region, Ministry, and resets filters", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: mockMembers,
      refetch: vi.fn(),
    });

    vi.mocked(useMembersFilters).mockImplementationOnce((members: any) => {
      return {
        searchTerm: "",
        setSearchTerm: mockSetSearchTerm,
        regionFilter: "San Francisco",
        setRegionFilter: mockSetRegionFilter,
        superRegionFilter: "",
        setSuperRegionFilter: mockSetSuperRegionFilter,
        ministryFilter: "",
        setMinistryFilter: mockSetMinistryFilter,
        filteredMembers: members,
        regionOptions: ["San Francisco"],
        superRegionOptions: ["Peninsula"],
        ministryOptions: ["Singles"],
        totalCount: members.length,
        totalPledged: 0,
        uniqueRegions: 1,
        resetFilters: mockResetFilters,
      };
    });

    render(<Members />);

    // Reset Filters button should be visible because regionFilter is "San Francisco"
    const resetBtn = screen.getByRole("button", { name: /Reset Filters/i });
    fireEvent.click(resetBtn);
    expect(mockResetFilters).toHaveBeenCalled();

    // Show filter bar
    fireEvent.click(screen.getByRole("button", { name: /^filters/i }));

    // Change Super Region
    const superRegionSelect = screen.getByLabelText(/Filter by Super Region/i);
    fireEvent.change(superRegionSelect, { target: { value: "Peninsula" } });
    expect(mockSetSuperRegionFilter).toHaveBeenCalledWith("Peninsula");

    // Change Ministry
    const ministrySelect = screen.getByLabelText(/Filter by Ministry/i);
    fireEvent.change(ministrySelect, { target: { value: "Singles" } });
    expect(mockSetMinistryFilter).toHaveBeenCalledWith("Singles");
  });
});
