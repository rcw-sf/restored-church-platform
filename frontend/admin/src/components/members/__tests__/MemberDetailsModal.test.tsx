import type { MemberDoc } from "@repo/types";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MemberDetailsModal from "../MemberDetailsModal";

describe("MemberDetailsModal", () => {
  const mockOnClose = vi.fn();

  it("returns null if member is null", () => {
    const { container } = render(
      <MemberDetailsModal member={null} onClose={mockOnClose} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders active member with basic fields correctly", () => {
    const basicMember: MemberDoc = {
      id: "M123",
      firstName: "John",
      lastName: "Doe",
    };

    render(<MemberDetailsModal member={basicMember} onClose={mockOnClose} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Member ID: M123")).toBeInTheDocument();

    // Check placeholders for missing fields
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders member with all fields correctly", () => {
    const fullMember: MemberDoc = {
      id: "M456",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      phone: "555-1234",
      gender: "female",
      birthdate: "1990-05-15",
      baptizedDate: "2010-08-20",
      region: "San Francisco",
      superRegion: "Peninsula",
      ministry: "Singles",
      type: "Restoration",
      pledge: 1250.5,
      membershipStartDate: "2015-01-01",
      familyId: "FAM-123",
      familyPosition: "Spouse",
      familyMembers: [
        {
          pushpayIndividualId: "M789",
          fullName: "Bob Johnson",
          familyPosition: "Head of Household",
        },
      ],
      pushpayCommunityMemberKey: "pp-key-1",
      pushpaySpouseCommunityMemberKey: "pp-key-2",
    };

    render(<MemberDetailsModal member={fullMember} onClose={mockOnClose} />);

    // Basic Header
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Member ID: M456")).toBeInTheDocument();

    // Contact details
    const emailLink = screen.getByText("alice@example.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:alice@example.com",
    );

    const phoneLink = screen.getByText("555-1234");
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink.closest("a")).toHaveAttribute("href", "tel:555-1234");

    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText("May 15, 1990")).toBeInTheDocument();
    expect(screen.getByText("Aug 20, 2010")).toBeInTheDocument();

    // Affiliation / giving
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText("Peninsula")).toBeInTheDocument();
    expect(screen.getByText("Singles")).toBeInTheDocument();
    expect(screen.getByText("Restoration")).toBeInTheDocument();
    expect(screen.getByText("$1,250.50")).toBeInTheDocument();

    // Status dates
    expect(screen.getByText("Jan 1, 2015")).toBeInTheDocument();

    // Family Household
    expect(screen.getByText("FAM-123")).toBeInTheDocument();
    expect(screen.getByText("Spouse")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    expect(screen.getByText("Head of Household")).toBeInTheDocument();
    expect(screen.getByText("M789")).toBeInTheDocument();

    // Pushpay integration keys
    expect(screen.getByText("pp-key-1")).toBeInTheDocument();
    expect(screen.getByText("pp-key-2")).toBeInTheDocument();
  });

  it("renders fallaway member with all fields, reason for fallaway, family members and integration keys", () => {
    const fullMember: MemberDoc = {
      id: "M999",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@smith.org",
      phone: "555-0199",
      gender: "female",
      birthdate: "1990-05-15",
      baptizedDate: "2010-08-20",
      region: "San Francisco",
      superRegion: "Peninsula",
      ministry: "Singles",
      type: "Baptism",
      pledge: 1250.5,
      membershipStartDate: "2015-01-01",
      membershipStopDate: "2023-04-15",
      takeawayType: "Fallaway",
      reasonForFallaway: "Commitment",
      familyId: "FAM-456",
      familyPosition: "Spouse",
      familyMembers: [
        {
          pushpayIndividualId: "M998",
          fullName: "Alex Smith",
          familyPosition: "Head of Household",
        },
      ],
      pushpayCommunityMemberKey: "pp-key-1",
      pushpaySpouseCommunityMemberKey: "pp-key-2",
    };

    render(<MemberDetailsModal member={fullMember} onClose={mockOnClose} />);

    // Basic Header
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Member ID: M999")).toBeInTheDocument();

    // Contact details
    const emailLink = screen.getByText("jane@smith.org");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:jane@smith.org",
    );

    const phoneLink = screen.getByText("555-0199");
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink.closest("a")).toHaveAttribute("href", "tel:555-0199");

    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText("May 15, 1990")).toBeInTheDocument();
    expect(screen.getByText("Aug 20, 2010")).toBeInTheDocument();

    // Affiliation / giving
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText("Peninsula")).toBeInTheDocument();
    expect(screen.getByText("Singles")).toBeInTheDocument();
    expect(screen.getByText("Baptism")).toBeInTheDocument();
    expect(screen.getByText("$1,250.50")).toBeInTheDocument();

    // Status dates
    expect(screen.getByText("Jan 1, 2015")).toBeInTheDocument();
    expect(screen.getByText("Apr 15, 2023")).toBeInTheDocument();
    expect(screen.getByText("Fallaway")).toBeInTheDocument();
    expect(screen.getByText("Reason for Fallaway")).toBeInTheDocument();
    expect(screen.getByText("Commitment")).toBeInTheDocument();

    // Family Household
    expect(screen.getByText("FAM-456")).toBeInTheDocument();
    expect(screen.getByText("Spouse")).toBeInTheDocument();
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText("Head of Household")).toBeInTheDocument();
    expect(screen.getByText("M998")).toBeInTheDocument();

    // Pushpay integration keys
    expect(screen.getByText("pp-key-1")).toBeInTheDocument();
    expect(screen.getByText("pp-key-2")).toBeInTheDocument();
  });

  it("renders moveaway member with movedTo field and no reason for fallaway", () => {
    const moveawayMember: MemberDoc = {
      id: "M777",
      firstName: "Tom",
      lastName: "Brown",
      takeawayType: "Transfer",
      movedTo: "Los Angeles",
    };

    render(
      <MemberDetailsModal member={moveawayMember} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Tom Brown")).toBeInTheDocument();
    expect(screen.getByText("Member ID: M777")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("Moved To")).toBeInTheDocument();
    expect(screen.getByText("Los Angeles")).toBeInTheDocument();

    // Ensure that the reason for fallaway section is not rendered
    expect(screen.queryByText("Reason for Fallaway")).not.toBeInTheDocument();
  });

  it("calls onClose when the close icon button is clicked", () => {
    const basicMember: MemberDoc = {
      id: "M123",
      firstName: "John",
      lastName: "Doe",
    };

    render(<MemberDetailsModal member={basicMember} onClose={mockOnClose} />);

    // Click top '✕' close button
    const closeIconBtn = screen.getByLabelText("Close");
    fireEvent.click(closeIconBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Click bottom Close button
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    const closeBtn = closeButtons[1];
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it("renders Edit Member button and calls onEdit when clicked", () => {
    const basicMember: MemberDoc = {
      individualId: "M123",
      firstName: "John",
      lastName: "Doe",
    };
    const mockOnEdit = vi.fn();

    render(
      <MemberDetailsModal
        member={basicMember}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
      />,
    );

    const editBtn = screen.getByTestId("details-edit-button");
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(mockOnEdit).toHaveBeenCalledWith(basicMember);
  });
});
