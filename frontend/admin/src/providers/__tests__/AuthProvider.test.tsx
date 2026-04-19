import { AuthContext } from "@/context/AuthContext";
import { AuthProvider } from "@/providers/AuthProvider";
import { render, screen, act } from "@testing-library/react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useContext } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the internal lib for auth and googleProvider
vi.mock("../../lib", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

// A simple consumer component to test the context values
const TestConsumer = () => {
  const context = useContext(AuthContext);
  if (!context) return <div>No Context</div>;

  return (
    <div>
      <div data-testid="user">{context.user?.email || "no-user"}</div>
      <div data-testid="loading">{context.loading ? "loading" : "loaded"}</div>
      <button onClick={context.login}>Login</button>
      <button onClick={context.logout}>Logout</button>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially and updates user when auth state changes", async () => {
    let authStateCallback: (user: User | null) => void = () => {};

    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      authStateCallback = callback as (user: User | null) => void;
      return vi.fn(); // unsubscribe mock
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // Initial state: loading should be true, user should be null
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    expect(screen.getByTestId("user")).toHaveTextContent("no-user");

    // Simulate auth state change (user logs in)
    await act(async () => {
      authStateCallback({ email: "admin@restoredchurch.com" } as User);
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    expect(screen.getByTestId("user")).toHaveTextContent(
      "admin@restoredchurch.com",
    );
  });

  it("executes login via signInWithPopup", async () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn());

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    const loginButton = screen.getByText("Login");
    await act(async () => {
      loginButton.click();
    });

    expect(signInWithPopup).toHaveBeenCalled();
  });

  it("executes logout via signOut", async () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn());

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    const logoutButton = screen.getByText("Logout");
    await act(async () => {
      logoutButton.click();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
