import type { MemberDoc } from "@repo/types";
import { renderHook, waitFor } from "@testing-library/react";
import { getDocs, type QuerySnapshot } from "firebase/firestore";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMembers } from "../useMembers";

// Mock the firestore db instance
vi.mock("@/lib/firestore", () => ({
  default: {},
}));

vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => ({ tenantId: "test-tenant" }),
  };
});

describe("useMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should initialize with default empty values and loading state", async () => {
    vi.mocked(getDocs).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMembers());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.members).toEqual([]);
  });

  it("should fetch, sort and set members correctly", async () => {
    const mockMembers: MemberDoc[] = [
      { individualId: "1", firstName: "Alice", lastName: "Smith" },
      { individualId: "2", firstName: "Charlie", lastName: "Brown" },
      { individualId: "3", firstName: "Bob", lastName: "Smith" },
    ];

    const mockDocs = mockMembers.map((m) => ({
      data: () => m,
    }));

    const mockSnapshot = {
      forEach: (callback: (doc: { data: () => MemberDoc }) => void) => {
        mockDocs.forEach(callback);
      },
    } as unknown as QuerySnapshot;

    vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

    const { result } = renderHook(() => useMembers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    // Sorted by lastName (Brown first, then Smith) and then firstName (Alice before Bob)
    expect(result.current.members).toEqual([
      { individualId: "2", firstName: "Charlie", lastName: "Brown" },
      { individualId: "1", firstName: "Alice", lastName: "Smith" },
      { individualId: "3", firstName: "Bob", lastName: "Smith" },
    ]);
  });

  it("should set error state when fetching fails", async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error("Firestore fetch failure"));

    const { result } = renderHook(() => useMembers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toContain("Failed to load members");
    expect(result.current.members).toEqual([]);
  });
});
