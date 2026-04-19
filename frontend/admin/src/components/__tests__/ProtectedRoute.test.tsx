import { useAuth } from "@/hooks";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProtectedRoute } from "../ProtectedRoute";

vi.mock("@/hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router", () => ({
  Outlet: () => <div data-testid="outlet-mock">Outlet Content</div>,
}));

vi.mock("../Header", () => ({
  Header: ({ children }: { children: ReactNode }) => (
    <div data-testid="header-mock">{children}</div>
  ),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while authentication state is resolving", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<ProtectedRoute />);

    // Check for daisyUI loading classes
    const spinner = document.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("loading-lg");
  });

  it("renders a sign-in screen when no user is logged in", () => {
    const mockLogin = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    render(<ProtectedRoute />);

    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
    expect(
      screen.getByText(/Please sign in to access this protected area/i),
    ).toBeInTheDocument();

    const loginBtn = screen.getByText("Sign in with Google");
    fireEvent.click(loginBtn);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("renders the Header layout and the route Outlet when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "test@test.com" } as User,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<ProtectedRoute />);

    // Verify it uses our mocked Header and contains the Outlet
    expect(screen.getByTestId("header-mock")).toBeInTheDocument();
    expect(screen.getByTestId("outlet-mock")).toBeInTheDocument();
    expect(screen.queryByText("Sign in with Google")).not.toBeInTheDocument();
  });
});
