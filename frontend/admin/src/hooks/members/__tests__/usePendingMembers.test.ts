import { renderHook, act } from "@testing-library/react";
import { updateDoc, where } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePendingMembers } from "../usePendingMembers";

let mockTenantId: string | undefined = "test-tenant";

vi.mock("react-router", () => ({
  useParams: () => ({ tenantId: mockTenantId }),
}));

vi.mock("@/lib/firestore", () => ({
  db: {},
}));

type MockDoc = { id: string; data: () => Record<string, unknown> };
type MockSnapshot = { forEach: (cb: (doc: MockDoc) => void) => void };

let snapshotCallback: ((snapshot: MockSnapshot) => void) | null = null;
let snapshotErrorCallback: ((error: Error) => void) | null = null;
const unsubscribeMock = vi.fn();

const batchSetMock = vi.fn();
const batchUpdateMock = vi.fn();
const batchCommitMock = vi.fn();

vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn((...args) => {
      const segments = args.slice(1).filter(Boolean);
      return { path: segments.join("/") };
    }),
    doc: vi.fn((...args) => {
      const firstArg = args[0];
      if (firstArg && typeof firstArg === "object" && "path" in firstArg) {
        const id = args[1] || "mock-id";
        return { id, path: `${firstArg.path}/${id}` };
      }
      const segments = args.slice(1).filter(Boolean);
      return {
        id: segments[segments.length - 1] || "mock-id",
        path: segments.join("/"),
      };
    }),
    query: vi.fn((q) => q),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    writeBatch: vi.fn(() => ({
      set: batchSetMock,
      update: batchUpdateMock,
      commit: batchCommitMock,
    })),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn((_, onNext, onError) => {
      snapshotCallback = onNext;
      snapshotErrorCallback = onError;
      return unsubscribeMock;
    }),
  };
});

describe("usePendingMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantId = "test-tenant";
    snapshotCallback = null;
    snapshotErrorCallback = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should initialize with loading state and empty array", () => {
    const { result } = renderHook(() => usePendingMembers());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.pendingMembers).toEqual([]);
  });

  it("should handle empty tenantId by not initializing snapshot", () => {
    mockTenantId = undefined;
    const { result } = renderHook(() => usePendingMembers());

    expect(result.current.loading).toBe(false);
    expect(result.current.pendingMembers).toEqual([]);
    expect(snapshotCallback).toBeNull();
  });

  it("should fetch, sort, and display pending members correctly when onSnapshot fires", () => {
    const { result } = renderHook(() => usePendingMembers());

    expect(result.current.loading).toBe(true);
    expect(snapshotCallback).not.toBeNull();

    const mockDocs = [
      {
        id: "doc-1",
        data: () => ({
          firstName: "Bob",
          lastName: "Smith",
          status: "pending",
        }),
      },
      {
        id: "doc-2",
        data: () => ({
          firstName: "Alice",
          lastName: "Smith",
          status: "pending",
        }),
      },
      {
        id: "doc-3",
        data: () => ({
          firstName: "Charlie",
          lastName: "Brown",
          status: "pending",
        }),
      },
    ];

    const mockSnapshot: MockSnapshot = {
      forEach: (cb) => mockDocs.forEach(cb),
    };

    act(() => {
      snapshotCallback?.(mockSnapshot);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pendingMembers).toEqual([
      {
        id: "doc-3",
        firstName: "Charlie",
        lastName: "Brown",
        status: "pending",
      },
      { id: "doc-2", firstName: "Alice", lastName: "Smith", status: "pending" },
      { id: "doc-1", firstName: "Bob", lastName: "Smith", status: "pending" },
    ]);
  });

  it("should set error state when onSnapshot fails", () => {
    const { result } = renderHook(() => usePendingMembers());

    expect(result.current.loading).toBe(true);

    act(() => {
      snapshotErrorCallback?.(new Error("Test firestore error"));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Failed to load pending members.");
    expect(result.current.pendingMembers).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it("should unsubscribe from snapshot listener on unmount", () => {
    const { unmount } = renderHook(() => usePendingMembers());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("should call writeBatch, set addition, set member, and update pending status on approveMember", async () => {
    const { result } = renderHook(() => usePendingMembers());

    const pendingMember = {
      id: "pending-id-123",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      email: "john@example.com",
      phone: "1234567890",
      birthdate: "1990-01-01",
      baptizedDate: "2010-01-01",
      type: "Baptism" as const,
      pledge: 100,
      region: "Region 1" as const,
      superRegion: "Super Region A" as const,
      ministry: "Youth" as const,
      membershipStartDate: "2026-05-29",
      requestType: "create" as const,
      status: "pending" as const,
      createdAt: "2026-05-28T00:00:00Z",
      updatedAt: "2026-05-28T00:00:00Z",
      createdBy: "admin@example.com",
    };

    batchCommitMock.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.approveMember(
        pendingMember as unknown as Parameters<
          typeof result.current.approveMember
        >[0],
      );
    });

    expect(batchSetMock).toHaveBeenCalledTimes(2);
    expect(batchSetMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: "tenants/test-tenant/members/mock-id" }),
      expect.objectContaining({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        email: "john@example.com",
        phone: "1234567890",
        birthdate: "1990-01-01",
        baptizedDate: "2010-01-01",
        type: "Baptism",
        pledge: 100,
        region: "Region 1",
        superRegion: "Super Region A",
        ministry: "Youth",
        membershipStartDate: "2026-05-29",
      }),
    );
    expect(batchSetMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: "tenants/test-tenant/additions/mock-id",
      }),
      expect.objectContaining({
        id: "mock-id",
        firstName: "John",
        lastName: "Doe",
        type: "Baptism",
        baptizedDate: "2010-01-01",
        membershipStartDate: "2026-05-29",
        region: "Region 1",
        superRegion: "Super Region A",
        ministry: "Youth",
        createdAt: expect.any(String),
      }),
    );
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/pending_members/pending-id-123",
      }),
      expect.objectContaining({
        status: "approved",
      }),
    );
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("should update existing member and update pending status on approveMember when requestType is update", async () => {
    const { result } = renderHook(() => usePendingMembers());

    const pendingMember = {
      id: "pending-id-123",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      email: "john@example.com",
      phone: "1234567890",
      birthdate: "1990-01-01",
      baptizedDate: "2010-01-01",
      type: "Baptism" as const,
      pledge: 100,
      region: "Region 1" as const,
      superRegion: "Super Region A" as const,
      ministry: "Youth" as const,
      membershipStartDate: "2026-05-29",
      requestType: "update" as const,
      status: "pending" as const,
      targetMemberId: "target-member-abc",
      createdAt: "2026-05-28T00:00:00Z",
      updatedAt: "2026-05-28T00:00:00Z",
      createdBy: "editor@example.com",
    };

    batchCommitMock.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.approveMember(
        pendingMember as unknown as Parameters<
          typeof result.current.approveMember
        >[0],
      );
    });

    expect(batchSetMock).toHaveBeenCalledTimes(0);
    expect(batchUpdateMock).toHaveBeenCalledTimes(2);
    expect(batchUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: "tenants/test-tenant/members/target-member-abc",
      }),
      expect.objectContaining({
        firstName: "John",
        lastName: "Doe",
        gender: "Male",
        email: "john@example.com",
        phone: "1234567890",
        birthdate: "1990-01-01",
        baptizedDate: "2010-01-01",
        type: "Baptism",
        pledge: 100,
        region: "Region 1",
        superRegion: "Super Region A",
        ministry: "Youth",
        membershipStartDate: "2026-05-29",
      }),
    );
    expect(batchUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: "tenants/test-tenant/pending_members/pending-id-123",
      }),
      expect.objectContaining({
        status: "approved",
      }),
    );
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("should call updateDoc on rejectMember", async () => {
    const { result } = renderHook(() => usePendingMembers());

    const pendingMember = {
      id: "pending-id-123",
      firstName: "John",
      lastName: "Doe",
      requestType: "create" as const,
      status: "pending" as const,
      createdAt: "2026-05-28T00:00:00Z",
      updatedAt: "2026-05-28T00:00:00Z",
      createdBy: "admin@example.com",
    };

    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.rejectMember(pendingMember);
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pending-id-123",
        path: "tenants/test-tenant/pending_members/pending-id-123",
      }),
      expect.objectContaining({
        status: "rejected",
        updatedAt: expect.any(String),
      }),
    );
  });

  it("should throw an error on approveMember if tenantId is missing", async () => {
    mockTenantId = undefined;
    const { result } = renderHook(() => usePendingMembers());

    const pendingMember = {
      id: "pending-id-123",
      firstName: "John",
      lastName: "Doe",
      requestType: "create" as const,
      status: "pending" as const,
      createdAt: "2026-05-28T00:00:00Z",
      updatedAt: "2026-05-28T00:00:00Z",
      createdBy: "admin@example.com",
    };

    await expect(result.current.approveMember(pendingMember)).rejects.toThrow(
      "Tenant ID is not available",
    );
  });

  it("should throw an error on rejectMember if tenantId is missing", async () => {
    mockTenantId = undefined;
    const { result } = renderHook(() => usePendingMembers());

    const pendingMember = {
      id: "pending-id-123",
      firstName: "John",
      lastName: "Doe",
      requestType: "create" as const,
      status: "pending" as const,
      createdAt: "2026-05-28T00:00:00Z",
      updatedAt: "2026-05-28T00:00:00Z",
      createdBy: "admin@example.com",
    };

    await expect(result.current.rejectMember(pendingMember)).rejects.toThrow(
      "Tenant ID is not available",
    );
  });

  it("should query with the correct pendingStatus and update when setPendingStatus is called", () => {
    const { result } = renderHook(() => usePendingMembers());

    // Initial render should query with "pending"
    expect(where).toHaveBeenCalledWith("status", "==", "pending");

    act(() => {
      result.current.setPendingStatus("approved");
    });

    // Changing state should re-run the effect and query with "approved"
    expect(where).toHaveBeenLastCalledWith("status", "==", "approved");
  });
});
