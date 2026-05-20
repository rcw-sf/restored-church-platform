import { AuthContext } from "@/context/AuthContext";
import { AuthProvider } from "@/providers/AuthProvider";
import { render, screen, act } from "@testing-library/react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { useContext } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the internal lib for auth and googleProvider
vi.mock("../../lib", () => ({
  auth: { currentUser: null },
  googleProvider: {},
  db: {}, // add db mock
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ tenantId: "test-tenant" }),
  };
});

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
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    // Initial state: loading should be true, user should be null
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    expect(screen.getByTestId("user")).toHaveTextContent("no-user");

    // Mock getDoc to simulate an authorized user with a role
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "admin" }),
    } as Awaited<ReturnType<typeof getDoc>>);

    // Simulate auth state change (user logs in)
    await act(async () => {
      authStateCallback({
        email: "admin@restoredchurch.com",
        uid: "123",
      } as User);
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    expect(screen.getByTestId("user")).toHaveTextContent(
      "admin@restoredchurch.com",
    );
  });

  it("executes login via signInWithPopup", async () => {
    vi.mocked(onAuthStateChanged).mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
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
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    const logoutButton = screen.getByText("Logout");
    await act(async () => {
      logoutButton.click();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
