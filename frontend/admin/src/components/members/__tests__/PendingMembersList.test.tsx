import type { PendingMemberDoc } from "@/hooks/members";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PendingMembersList from "../PendingMembersList";

describe("PendingMembersList", () => {
  const mockPendingMembers: PendingMemberDoc[] = [
    {
      id: "pending-1",
      firstName: "David",
      lastName: "Green",
      gender: "Male",
      email: "david@example.com",
      phone: "(555) 019-2834",
      birthdate: "1985-05-15",
      baptizedDate: "2015-06-20",
      type: "Baptism",
      pledge: 150.5,
      region: "San Francisco" as const,
      superRegion: "Peninsula" as const,
      ministry: "Singles" as const,
      membershipStartDate: "2026-05-01",
      requestType: "create",
      status: "pending",
      createdAt: "2026-05-28T12:00:00.000Z",
      updatedAt: "2026-05-28T12:00:00.000Z",
      createdBy: "editor@test.com",
    },
  ];

  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  it("renders a loading spinner when loading is true", () => {
    render(
      <PendingMembersList
        pendingMembers={[]}
        loading={true}
        role="admin"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByTestId("pending-loading-spinner")).toBeInTheDocument();
    expect(screen.queryByText("No Pending Approvals")).not.toBeInTheDocument();
  });

  it("renders empty state when pendingMembers is empty and loading is false", () => {
    render(
      <PendingMembersList
        pendingMembers={[]}
        loading={false}
        role="admin"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(
      screen.queryByTestId("pending-loading-spinner"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No Pending Approvals")).toBeInTheDocument();
    expect(
      screen.getByText("There are no new member requests waiting for review."),
    ).toBeInTheDocument();
  });

  it("renders pending member card details correctly", () => {
    render(
      <PendingMembersList
        pendingMembers={mockPendingMembers}
        loading={false}
        role="editor"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.getByText("David Green")).toBeInTheDocument();
    expect(screen.getByText("david@example.com")).toBeInTheDocument();
    expect(screen.getByText("(555) 019-2834")).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("May 15, 1985")).toBeInTheDocument();
    expect(screen.getByText("Jun 20, 2015")).toBeInTheDocument();
    expect(screen.getByText("Baptism")).toBeInTheDocument();
    expect(screen.getByText("$150.50")).toBeInTheDocument();
    expect(screen.getByText("Peninsula")).toBeInTheDocument();
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText("Singles")).toBeInTheDocument();
    expect(screen.getByText("May 1, 2026")).toBeInTheDocument();
    expect(screen.getByText(/editor@test\.com/)).toBeInTheDocument();
  });

  it("hides action buttons for editor role", () => {
    render(
      <PendingMembersList
        pendingMembers={mockPendingMembers}
        loading={false}
        role="editor"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />,
    );

    expect(screen.queryByTestId("reject-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("approve-button")).not.toBeInTheDocument();
  });

  it("shows action buttons for admin and superAdmin roles and calls callbacks on click", () => {
    const mockOnEdit = vi.fn();
    render(
      <PendingMembersList
        pendingMembers={mockPendingMembers}
        loading={false}
        role="admin"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onEdit={mockOnEdit}
      />,
    );

    const approveBtn = screen.getByTestId("approve-button");
    const rejectBtn = screen.getByTestId("reject-button");
    const editBtn = screen.getByTestId("edit-button");

    expect(approveBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);
    expect(mockOnApprove).toHaveBeenCalledWith(mockPendingMembers[0]);

    fireEvent.click(rejectBtn);
    expect(mockOnReject).toHaveBeenCalledWith(mockPendingMembers[0]);

    fireEvent.click(editBtn);
    expect(mockOnEdit).toHaveBeenCalledWith(mockPendingMembers[0]);
  });

  it("shows edit button for editor who created the request, but hides reject/approve buttons", () => {
    const mockOnEdit = vi.fn();
    render(
      <PendingMembersList
        pendingMembers={mockPendingMembers}
        loading={false}
        role="editor"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onEdit={mockOnEdit}
        currentUserEmail="editor@test.com"
      />,
    );

    expect(screen.getByTestId("edit-button")).toBeInTheDocument();
    expect(screen.queryByTestId("reject-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("approve-button")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("edit-button"));
    expect(mockOnEdit).toHaveBeenCalledWith(mockPendingMembers[0]);
  });

  it("hides edit button for editor who did not create the request", () => {
    render(
      <PendingMembersList
        pendingMembers={mockPendingMembers}
        loading={false}
        role="editor"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onEdit={vi.fn()}
        currentUserEmail="another_editor@test.com"
      />,
    );

    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reject-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("approve-button")).not.toBeInTheDocument();
  });
});
