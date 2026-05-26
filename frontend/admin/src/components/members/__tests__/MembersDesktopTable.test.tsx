import type { MemberDoc } from "@repo/types";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MembersDesktopTable from "../MembersDesktopTable";

describe("MembersDesktopTable", () => {
  const mockMembers: MemberDoc[] = [
    {
      individualId: "1",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      phone: "555-1234",
      superRegion: "Peninsula",
      region: "San Francisco",
      ministry: "Teens",
    },
    {
      individualId: "2",
      firstName: "Bob",
      lastName: "Jones",
      email: "bob@example.com",
      phone: "555-5678",
      superRegion: "South Bay",
      region: "San Jose",
      ministry: "Marrieds",
    },
  ];

  const mockSetSelectedMember = vi.fn();

  it("renders members correctly", () => {
    render(
      <MembersDesktopTable
        members={mockMembers}
        setSelectedMember={mockSetSelectedMember}
      />,
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("555-1234")).toBeInTheDocument();
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText("Peninsula")).toBeInTheDocument();
    expect(screen.getByText("Teens")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("555-5678")).toBeInTheDocument();
    expect(screen.getByText("San Jose")).toBeInTheDocument();
    expect(screen.getByText("South Bay")).toBeInTheDocument();
    expect(screen.getByText("Marrieds")).toBeInTheDocument();
  });

  it("calls setSelectedMember when a member is clicked", () => {
    render(
      <MembersDesktopTable
        members={mockMembers}
        setSelectedMember={mockSetSelectedMember}
      />,
    );

    fireEvent.click(screen.getByText("Alice Smith"));
    expect(mockSetSelectedMember).toHaveBeenCalledWith(mockMembers[0]);

    fireEvent.click(screen.getByText("Bob Jones"));
    expect(mockSetSelectedMember).toHaveBeenCalledWith(mockMembers[1]);
  });

  it("should be empty when no members are provided", () => {
    render(
      <MembersDesktopTable
        members={[]}
        setSelectedMember={mockSetSelectedMember}
      />,
    );

    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No members match the filter criteria."),
    ).toBeInTheDocument();
  });
});
