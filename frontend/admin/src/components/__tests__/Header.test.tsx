import { useAuth } from "@/hooks";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User } from "firebase/auth";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "../Header";

vi.mock("@/hooks", () => ({
  useAuth: vi.fn(),
}));

describe("Header Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children directly when no user is present", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <Header>
        <div data-testid="child-content">Child Content</div>
      </Header>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.queryByText("Admin Portal")).not.toBeInTheDocument();
  });

  it("renders the navbar and user info when a user is authenticated", () => {
    const mockUser = { displayName: "Test Admin", email: "admin@test.com" };
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as User,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <Header>
        <div>Content</div>
      </Header>,
    );

    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
    expect(screen.getByText("Test Admin")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
  });

  it("calls the logout function when the logout button is clicked", () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "User" } as User,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
    });

    render(
      <Header>
        <div>Content</div>
      </Header>,
    );
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
