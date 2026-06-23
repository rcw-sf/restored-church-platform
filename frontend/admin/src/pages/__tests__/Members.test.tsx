import { useAuth } from "@/hooks";
import { useMembers, usePendingMembers } from "@/hooks/members";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Members from "../Members";

vi.mock("@/hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/members", () => ({
  useMembers: vi.fn(),
  usePendingMembers: vi.fn(),
  useMembersFilters: vi.fn((members) => ({
    filteredMembers: members,
    totalCount: members.length,
    totalPledged: 0,
    uniqueRegions: 0,
    searchTerm: "",
    setSearchTerm: vi.fn(),
    regionFilter: "",
    setRegionFilter: vi.fn(),
    superRegionFilter: "",
    setSuperRegionFilter: vi.fn(),
    ministryFilter: "",
    setMinistryFilter: vi.fn(),
    resetFilters: vi.fn(),
    regionOptions: [],
    superRegionOptions: [],
    ministryOptions: [],
  })),
}));

vi.mock("@/components/members/ActiveMembersTab", () => ({
  default: () => <div data-testid="active-members-tab" />,
}));

vi.mock("@/components/members/PendingMembersTab", () => ({
  default: () => <div data-testid="pending-members-tab" />,
}));

vi.mock("@/components/members/MemberDetailsModal", () => ({
  default: ({
    member,
    onClose,
    onEdit,
  }: {
    member: { id?: string } | null;
    onClose: () => void;
    onEdit: (member: { id?: string }) => void;
  }) =>
    member ? (
      <div data-testid="member-details-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onEdit(member)}>Edit</button>
      </div>
    ) : null,
}));

vi.mock("@/components/members/MemberFormModal", () => ({
  default: ({
    isOpen,
    onSuccess,
  }: {
    isOpen: boolean;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="member-form-modal">
        <button onClick={onSuccess}>Success</button>
      </div>
    ) : null,
}));

describe("Members Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "admin@test.com" },
      role: "admin",
    } as ReturnType<typeof useAuth>);
    vi.mocked(usePendingMembers).mockReturnValue({
      pendingMembers: [],
      pendingCount: 0,
      loading: false,
      error: null,
      approveMember: vi.fn(async () => {}),
      rejectMember: vi.fn(async () => {}),
      pendingStatus: "pending",
      setPendingStatus: vi.fn(),
    } as ReturnType<typeof usePendingMembers>);
  });

  it("renders a loading spinner when data is fetching", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: true,
      error: null,
      members: [],
      refetch: vi.fn(),
    });
    render(<Members />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders an error message when loading fails", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: "Failed to load",
      members: [],
      refetch: vi.fn(),
    });
    render(<Members />);
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });

  it("renders active members tab by default", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });
    render(<Members />);
    expect(screen.getByTestId("active-members-tab")).toBeInTheDocument();
  });

  it("switches to pending tab", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });
    render(<Members />);
    fireEvent.click(screen.getByRole("button", { name: /Pending Approvals/i }));
    expect(screen.getByTestId("pending-members-tab")).toBeInTheDocument();
  });

  it("opens member form modal when adding a member", () => {
    vi.mocked(useMembers).mockReturnValue({
      loading: false,
      error: null,
      members: [],
      refetch: vi.fn(),
    });
    render(<Members />);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));
    expect(screen.getByTestId("member-form-modal")).toBeInTheDocument();
  });
});
