import { renderHook, waitFor, act } from "@testing-library/react";
import { setDoc, updateDoc } from "firebase/firestore";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useMemberForm } from "../useMemberForm";

vi.mock("@/lib/firestore", () => ({
  default: {},
}));

vi.mock("react-router", () => ({
  useParams: () => ({ tenantId: "test-tenant" }),
}));

const batchSetMock = vi.fn();
const batchCommitMock = vi.fn();

vi.mock("firebase/firestore", () => {
  return {
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    collection: vi.fn((...args) => {
      const segments = args.slice(1).filter(Boolean);
      return { path: segments.join("/") };
    }),
    doc: vi.fn((...args) => {
      const firstArg = args[0];
      if (firstArg && typeof firstArg === "object" && "path" in firstArg) {
        const parentPath = firstArg.path;
        const subPath = args.slice(1).join("/");
        return {
          id: args[1] || "mock-id",
          path: subPath ? `${parentPath}/${subPath}` : `${parentPath}/mock-id`,
        };
      }
      const segments = args.slice(1).filter(Boolean);
      return {
        id: segments[segments.length - 1] || "mock-id",
        path: segments.join("/"),
      };
    }),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: batchSetMock,
      commit: batchCommitMock,
    })),
  };
});

describe("useMemberForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const memberData = {
    firstName: "Charlie",
    lastName: "Brown",
    email: "charlie@test.com",
    gender: "M",
    region: "San Francisco" as const,
    superRegion: "Peninsula" as const,
    ministry: "Campus" as const,
    pushpayIndividualId: "1241",
    pushpayCommunityMemberKey: "pp-id-123",
    pushpaySpouseCommunityMemberKey: "pp-spouse-123",
  };

  it("submits creation request to pending_members for editor", async () => {
    const { result } = renderHook(() => useMemberForm());

    await act(async () => {
      await result.current.saveMember(memberData, {
        mode: "create",
        role: "editor",
        userEmail: "editor@test.com",
      });
    });

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/pending_members/mock-id",
      }),
      expect.objectContaining({
        firstName: "Charlie",
        lastName: "Brown",
        requestType: "create",
        status: "pending",
        createdBy: "editor@test.com",
        pushpayIndividualId: "1241",
        pushpayCommunityMemberKey: "pp-id-123",
        pushpaySpouseCommunityMemberKey: "pp-spouse-123",
      }),
    );
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submits creation request directly to members and additions log for admin", async () => {
    const { result } = renderHook(() => useMemberForm());

    batchCommitMock.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.saveMember(memberData, {
        mode: "create",
        role: "admin",
        userEmail: "admin@test.com",
      });
    });

    expect(batchSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/members/mock-id",
      }),
      expect.objectContaining({
        firstName: "Charlie",
        lastName: "Brown",
        pushpayIndividualId: "1241",
        pushpayCommunityMemberKey: "pp-id-123",
        pushpaySpouseCommunityMemberKey: "pp-spouse-123",
      }),
    );
    expect(batchSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/additions/mock-id",
      }),
      expect.objectContaining({
        firstName: "Charlie",
        lastName: "Brown",
        id: "mock-id",
      }),
    );
    expect(batchCommitMock).toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("updates pending request directly on edit-pending mode", async () => {
    const { result } = renderHook(() => useMemberForm());

    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.saveMember(memberData, {
        mode: "edit-pending",
        role: "editor",
        userEmail: "editor@test.com",
        pendingId: "pending-123",
      });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/pending_members/pending-123",
      }),
      expect.objectContaining({
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@test.com",
        pushpayIndividualId: "1241",
        pushpayCommunityMemberKey: "pp-id-123",
        pushpaySpouseCommunityMemberKey: "pp-spouse-123",
      }),
    );
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("updates active member directly on edit-member mode for admin", async () => {
    const { result } = renderHook(() => useMemberForm());

    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.saveMember(memberData, {
        mode: "edit-member",
        role: "admin",
        userEmail: "admin@test.com",
        memberId: "member-123",
      });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/members/member-123",
      }),
      expect.objectContaining({
        firstName: "Charlie",
        lastName: "Brown",
        pushpayIndividualId: "1241",
        pushpayCommunityMemberKey: "pp-id-123",
        pushpaySpouseCommunityMemberKey: "pp-spouse-123",
      }),
    );
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submits edit request to pending_members on edit-member mode for editor", async () => {
    const { result } = renderHook(() => useMemberForm());

    await act(async () => {
      await result.current.saveMember(memberData, {
        mode: "edit-member",
        role: "editor",
        userEmail: "editor@test.com",
        memberId: "member-123",
      });
    });

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "tenants/test-tenant/pending_members/mock-id",
      }),
      expect.objectContaining({
        firstName: "Charlie",
        lastName: "Brown",
        requestType: "update",
        status: "pending",
        targetMemberId: "member-123",
        createdBy: "editor@test.com",
        pushpayIndividualId: "1241",
        pushpayCommunityMemberKey: "pp-id-123",
        pushpaySpouseCommunityMemberKey: "pp-spouse-123",
      }),
    );
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error when Firestore operation fails", async () => {
    vi.mocked(setDoc).mockRejectedValue(new Error("Firestore error"));
    const { result } = renderHook(() => useMemberForm());

    let threw = false;
    try {
      await result.current.saveMember(memberData, {
        mode: "create",
        role: "editor",
        userEmail: "editor@test.com",
      });
    } catch (err: unknown) {
      threw = true;
      expect((err as Error).message).toBe(
        "Failed to save member details. Please try again.",
      );
    }

    expect(threw).toBe(true);
    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
      expect(result.current.error).toBe(
        "Failed to save member details. Please try again.",
      );
    });
  });
});
