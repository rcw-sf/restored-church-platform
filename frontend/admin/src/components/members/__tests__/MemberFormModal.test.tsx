import { useAuth } from "@/hooks";
import { useMemberForm } from "@/hooks/members";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MemberFormModal from "../MemberFormModal";

vi.mock("@/hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router", () => ({
  useParams: () => ({ tenantId: "test-tenant" }),
}));

vi.mock("@/hooks/members", () => ({
  useMemberForm: vi.fn(),
}));

vi.mock("@/components/DatePicker", () => ({
  DatePicker: ({
    id,
    value,
    onChange,
  }: {
    id?: string;
    value: string;
    onChange: (val: string) => void;
  }) => (
    <input
      id={id}
      data-testid="date-picker"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("MemberFormModal", () => {
  const mockSaveMember = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMemberForm).mockReturnValue({
      saveMember: mockSaveMember,
      submitting: false,
      error: null,
      setError: mockSetError,
    });
  });

  const mockUser = { email: "editor@test.com" } as User;

  it("does not render when closed", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("member-form-modal")).not.toBeInTheDocument();
  });

  it("renders standard creation headers and buttons for editor", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    expect(screen.getByTestId("member-form-modal")).toBeInTheDocument();
    expect(screen.getByText("Request Add Member")).toBeInTheDocument();
    expect(screen.getByText("Submit Request")).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Pushpay ChMS Individual ID/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Pushpay Community Member Key/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Spouse Pushpay Community Member Key/),
    ).not.toBeInTheDocument();
  });

  it("renders standard creation headers and buttons for admin", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    expect(screen.getByTestId("member-form-modal")).toBeInTheDocument();
    expect(screen.getByText("Add New Member")).toBeInTheDocument();
    expect(screen.getByText("Add Member")).toBeInTheDocument();
  });

  it("renders edit-pending layout and pre-populates fields", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const initialData = {
      firstName: "Lucy",
      lastName: "Van Pelt",
      email: "lucy@example.com",
      gender: "F",
      superRegion: "East Bay" as const,
      region: "Berkeley" as const,
      ministry: "Marrieds" as const,
    };

    render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="edit-pending"
        initialData={initialData}
        pendingId="pending-abc"
      />,
    );

    expect(screen.getByText("Edit Pending Request")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Lucy");
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue("Van Pelt");
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue(
      "lucy@example.com",
    );
  });

  it("renders the redirect warning alert only when isRedirected is true", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const initialData = {
      firstName: "Lucy",
      lastName: "Van Pelt",
      gender: "Female",
    };

    const { rerender } = render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="edit-pending"
        initialData={initialData}
        isRedirected={false}
      />,
    );

    // Verify banner is not present
    expect(
      screen.queryByText(/You are editing an existing pending request/i),
    ).not.toBeInTheDocument();

    rerender(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="edit-pending"
        initialData={initialData}
        isRedirected={true}
      />,
    );

    // Verify banner is present
    expect(
      screen.getByText(/You are editing an existing pending request/i),
    ).toBeInTheDocument();
  });

  it("submits edited fields in edit-pending mode", async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const handleSuccess = vi.fn();
    render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
        mode="edit-pending"
        initialData={{
          firstName: "Lucy",
          lastName: "Van Pelt",
          gender: "Female",
          superRegion: "East Bay",
          region: "Berkeley",
          ministry: "Marrieds",
          type: "Baptism",
        }}
        pendingId="pending-abc"
      />,
    );

    // Make an edit
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: "Lucille" },
    });

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockSaveMember).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Lucille",
          lastName: "Van Pelt",
        }),
        expect.objectContaining({
          mode: "edit-pending",
          pendingId: "pending-abc",
        }),
      );
    });
    expect(handleSuccess).toHaveBeenCalled();
  });

  it("formats standard and international phone inputs correctly", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} />);

    const phoneInput = screen.getByLabelText(
      /Phone Number/i,
    ) as HTMLInputElement;

    // Standard 10 digit number
    fireEvent.change(phoneInput, { target: { value: "5550199000" } });
    expect(phoneInput.value).toBe("(555) 019-9000");

    // US number starting with 1
    fireEvent.change(phoneInput, { target: { value: "15550199000" } });
    expect(phoneInput.value).toBe("+1 (555) 019-9000");
  });

  it("auto-fills Super Region when Region is selected and resets when empty", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    const regionSelect = screen.getByLabelText(
      /^Region\*$/,
    ) as HTMLSelectElement;
    const superRegionSelect = screen.getByLabelText(
      /^Super Region\*$/,
    ) as HTMLSelectElement;

    // Initially they are empty
    expect(regionSelect.value).toBe("");
    expect(superRegionSelect.value).toBe("");

    // Select San Francisco -> Auto-fills Peninsula
    fireEvent.change(regionSelect, { target: { value: "San Francisco" } });
    expect(regionSelect.value).toBe("San Francisco");
    expect(superRegionSelect.value).toBe("Peninsula");
    fireEvent.change(regionSelect, { target: { value: "" } });
    expect(superRegionSelect.value).toBe("");

    // Select San Mateo -> Auto-fills Peninsula
    fireEvent.change(regionSelect, { target: { value: "San Mateo" } });
    expect(superRegionSelect.value).toBe("Peninsula");
    fireEvent.change(regionSelect, { target: { value: "" } });

    // Select San Jose -> Auto-fills South Bay
    fireEvent.change(regionSelect, { target: { value: "San Jose" } });
    expect(superRegionSelect.value).toBe("South Bay");
    fireEvent.change(regionSelect, { target: { value: "" } });

    // Select Silicon Valley -> Auto-fills South Bay
    fireEvent.change(regionSelect, { target: { value: "Silicon Valley" } });
    expect(superRegionSelect.value).toBe("South Bay");
    fireEvent.change(regionSelect, { target: { value: "" } });

    // Select Berkeley -> Auto-fills East Bay
    fireEvent.change(regionSelect, { target: { value: "Berkeley" } });
    expect(superRegionSelect.value).toBe("East Bay");
    fireEvent.change(regionSelect, { target: { value: "" } });

    // Select Contra Costa -> Auto-fills East Bay
    fireEvent.change(regionSelect, { target: { value: "Contra Costa" } });
    expect(superRegionSelect.value).toBe("East Bay");
    fireEvent.change(regionSelect, { target: { value: "" } });

    // Select Hayward -> Auto-fills East Bay
    fireEvent.change(regionSelect, { target: { value: "Hayward" } });
    expect(superRegionSelect.value).toBe("East Bay");
    fireEvent.change(regionSelect, { target: { value: "" } });
  });

  it("filters Region options based on Super Region selection", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    const superRegionSelect = screen.getByLabelText(
      /^Super Region\*$/,
    ) as HTMLSelectElement;
    const regionSelect = screen.getByLabelText(
      /^Region\*$/,
    ) as HTMLSelectElement;

    // Filter by Peninsula
    fireEvent.change(superRegionSelect, { target: { value: "Peninsula" } });

    // Get all options in regionSelect
    const options = Array.from(regionSelect.options).map((o) => o.value);
    expect(options).toContain("San Francisco");
    expect(options).toContain("San Mateo");
    expect(options).not.toContain("San Jose");
    expect(options).not.toContain("Berkeley");

    // Filter by South Bay
    fireEvent.change(superRegionSelect, { target: { value: "South Bay" } });
    const optionsSouth = Array.from(regionSelect.options).map((o) => o.value);
    expect(optionsSouth).toContain("San Jose");
    expect(optionsSouth).toContain("Silicon Valley");
    expect(optionsSouth).not.toContain("San Francisco");

    // Filter by East Bay
    fireEvent.change(superRegionSelect, { target: { value: "East Bay" } });
    const optionsEast = Array.from(regionSelect.options).map((o) => o.value);
    expect(optionsEast).toContain("Berkeley");
    expect(optionsEast).toContain("Contra Costa");
    expect(optionsEast).toContain("Hayward");
    expect(optionsEast).not.toContain("San Jose");
  });

  it("updates and submits form with all fields successfully", async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const handleSuccess = vi.fn();
    render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
        mode="create"
      />,
    );

    // Fill standard fields
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Pledge Amount/i), {
      target: { value: "250.75" },
    });

    // Change select fields
    fireEvent.change(screen.getByLabelText(/Gender/i), {
      target: { value: "Male" },
    });
    fireEvent.change(screen.getByLabelText(/Ministry/i), {
      target: { value: "Teens" },
    });
    fireEvent.change(screen.getByLabelText(/Addition Type/i), {
      target: { value: "Place Membership" },
    });
    fireEvent.change(screen.getByLabelText(/^Super Region\*$/), {
      target: { value: "Peninsula" },
    });
    fireEvent.change(screen.getByLabelText(/^Region\*$/), {
      target: { value: "San Francisco" },
    });
    fireEvent.change(screen.getByLabelText(/^Pushpay ChMS Individual ID$/i), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByLabelText(/^Pushpay Community Member Key$/i), {
      target: { value: "pp-id-123" },
    });
    fireEvent.change(
      screen.getByLabelText(/^Spouse Pushpay Community Member Key$/i),
      {
        target: { value: "pp-spouse-123" },
      },
    );

    // Submit form
    const form = screen.getByTestId("member-form-modal").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSaveMember).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          pledge: 250.75,
          gender: "Male",
          ministry: "Teens",
          type: "Place Membership",
          superRegion: "Peninsula",
          region: "San Francisco",
          pushpayIndividualId: "123",
          pushpayCommunityMemberKey: "pp-id-123",
          pushpaySpouseCommunityMemberKey: "pp-spouse-123",
        }),
        expect.any(Object),
      );
    });
    expect(handleSuccess).toHaveBeenCalled();
  });

  it("renders edit-member layout and displays initial data for admin", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const initialData = {
      firstName: "Charlie",
      lastName: "Brown",
      pledge: 150,
      gender: "Male",
      superRegion: "South Bay" as const,
      region: "San Jose" as const,
      ministry: "Teens" as const,
    };

    render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="edit-member"
        initialData={initialData}
        memberId="member-123"
      />,
    );

    expect(screen.getByText("Edit Member Details")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Directly update this member's details in the church directory.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByLabelText(/Pledge Amount/i)).toHaveValue(150);
  });

  it("renders edit-member layout for editor", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "editor",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="edit-member"
        memberId="member-123"
      />,
    );

    expect(screen.getByText("Request Edit Member")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Submit a request to update this member's details for administrator review.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Submit Edit Request")).toBeInTheDocument();
  });

  it("handles form submission error and loading states", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(useMemberForm).mockReturnValue({
      saveMember: mockSaveMember,
      submitting: true,
      error: "Failed to save member",
      setError: mockSetError,
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    expect(screen.getByText("Failed to save member")).toBeInTheDocument();

    const submitBtn = screen
      .getByTestId("member-form-modal")
      .querySelector("button[type='submit']") as HTMLButtonElement;
    expect(submitBtn).toBeDisabled();
    expect(submitBtn.querySelector(".loading-spinner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("does not submit if user is not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: null,
      loading: false,
      isAuthorized: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    const form = screen.getByTestId("member-form-modal").querySelector("form")!;
    fireEvent.submit(form);

    expect(mockSaveMember).not.toHaveBeenCalled();
  });

  it("submits with default userEmail when user email is missing", async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: {} as User,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    const form = screen.getByTestId("member-form-modal").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSaveMember).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userEmail: "unknown",
        }),
      );
    });
  });

  it("falls back to returning true for all regions when super region is unknown", () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode="create"
        initialData={
          {
            superRegion: "UnknownRegion",
          } as unknown as React.ComponentProps<
            typeof MemberFormModal
          >["initialData"]
        }
      />,
    );

    const regionSelect = screen.getByLabelText(
      /^Region\*$/,
    ) as HTMLSelectElement;
    const options = Array.from(regionSelect.options).map((o) => o.value);
    expect(options).toContain("San Francisco");
    expect(options).toContain("San Mateo");
    expect(options).toContain("San Jose");
    expect(options).toContain("Berkeley");
  });

  it("handles edge cases for unknown mode, unknown region, and falsy membership start date", async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: "admin",
      user: mockUser,
      loading: false,
      isAuthorized: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    // Render with an unknown mode
    const { rerender } = render(
      <MemberFormModal
        isOpen={true}
        onClose={vi.fn()}
        mode={
          "unknown-mode" as unknown as React.ComponentProps<
            typeof MemberFormModal
          >["mode"]
        }
      />,
    );

    // Verify Cancel button is rendered (proves component rendered despite unknown mode)
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    // Rerender with normal mode to check other inputs
    rerender(<MemberFormModal isOpen={true} onClose={vi.fn()} mode="create" />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: "Doe" },
    });

    const regionSelect = screen.getByLabelText(
      /^Region\*$/,
    ) as HTMLSelectElement;
    // Bypassing JSDOM validation for select options to cover implicit else branch
    Object.defineProperty(regionSelect, "value", {
      value: "UnknownRegion",
      writable: true,
    });
    fireEvent.change(regionSelect);

    // Clear membership start date to cover falsy fallback branch in submit
    const startDateInput = screen.getByLabelText(
      /Membership Start Date/i,
    ) as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: "" } });

    const form = screen.getByTestId("member-form-modal").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSaveMember).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          membershipStartDate: undefined,
          region: "UnknownRegion",
        }),
        expect.any(Object),
      );
    });
  });
});
