import { useAuth } from "@/hooks";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User } from "firebase/auth";
import { MemoryRouter } from "react-router";
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
      isAuthorized: false,
      role: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header>
          <div data-testid="child-content">Child Content</div>
        </Header>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.queryByText("Admin Portal")).not.toBeInTheDocument();
  });

  it("renders the navbar and user info when a user is authenticated", () => {
    const mockUser = { displayName: "Test Admin", email: "admin@test.com" };
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as User,
      loading: false,
      isAuthorized: true,
      role: "admin",
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header>
          <div>Content</div>
        </Header>
      </MemoryRouter>,
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
      isAuthorized: true,
      role: "admin",
      login: vi.fn(),
      logout: mockLogout,
    });

    render(
      <MemoryRouter>
        <Header>
          <div>Content</div>
        </Header>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("closes the drawer when clicking the close button or link", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "User", email: "user@test.com" } as User,
      loading: false,
      isAuthorized: true,
      role: "admin",
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header>
          <div>Content</div>
        </Header>
      </MemoryRouter>,
    );

    const drawerToggle = document.getElementById("admin-drawer");
    expect(drawerToggle).toBeInTheDocument();
    const clickSpy = vi.spyOn(drawerToggle!, "click");

    const closeButton = document.querySelector(".drawer-side button");
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const membersLink = screen.getByText("Members");
    fireEvent.click(membersLink);
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });
});
