import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdmin } from "../../../config/firebase.js";
import { SyncMonitor } from "../../../utils/sync-monitor.js";
import { loadMemberLookup } from "../members.js";

// Mock dependencies
vi.mock("../../../utils/cache.js");
vi.mock("../../../utils/github-cache.js");
vi.mock("../../../services/member-loader.js");
vi.mock("../../../utils/sync-monitor.js");

describe("giving-members", () => {
  let firebaseAdmin: FirebaseAdmin;
  let monitor: SyncMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAdmin = {} as FirebaseAdmin;
    monitor = {
      recordCacheHit: vi.fn(),
      recordCacheMiss: vi.fn(),
      recordFirestoreReads: vi.fn(),
    } as unknown as SyncMonitor;
  });

  describe("loadMemberLookup", () => {
    it("should load from GitHub cache when available", async () => {
      const { loadGitHubCacheMemberData } =
        await import("../../../utils/github-cache.js");
      vi.mocked(loadGitHubCacheMemberData).mockReturnValue({
        member1: {
          individualId: "member1",
          firstName: "John",
          lastName: "Doe",
        },
      });

      const result = await loadMemberLookup(
        firebaseAdmin,
        DateTime.now(),
        monitor,
      );

      expect(result).toEqual({
        member1: {
          individualId: "member1",
          firstName: "John",
          lastName: "Doe",
        },
      });
      expect(monitor.recordCacheHit).toHaveBeenCalled();
      expect(monitor.recordCacheMiss).not.toHaveBeenCalled();
    });

    it("should load from local cache when GitHub cache not available", async () => {
      const { loadGitHubCacheMemberData } =
        await import("../../../utils/github-cache.js");
      const { loadCachedMemberData } = await import("../../../utils/cache.js");

      vi.mocked(loadGitHubCacheMemberData).mockReturnValue(null);
      vi.mocked(loadCachedMemberData).mockReturnValue({
        member1: {
          individualId: "member1",
          firstName: "Jane",
          lastName: "Smith",
        },
      });

      const result = await loadMemberLookup(
        firebaseAdmin,
        DateTime.now(),
        monitor,
      );

      expect(result).toEqual({
        member1: {
          individualId: "member1",
          firstName: "Jane",
          lastName: "Smith",
        },
      });
      expect(monitor.recordCacheHit).toHaveBeenCalled();
      expect(monitor.recordCacheMiss).not.toHaveBeenCalled();
    });

    it("should load from Firestore when no cache available", async () => {
      const { loadGitHubCacheMemberData } =
        await import("../../../utils/github-cache.js");
      const { loadCachedMemberData } = await import("../../../utils/cache.js");
      const { loadMappingData } =
        await import("../../../services/member-loader.js");
      const { saveMemberDataToCache } = await import("../../../utils/cache.js");
      const { saveMemberDataToGitHubCache } =
        await import("../../../utils/github-cache.js");

      vi.mocked(loadGitHubCacheMemberData).mockReturnValue(null);
      vi.mocked(loadCachedMemberData).mockReturnValue(null);
      vi.mocked(loadMappingData).mockResolvedValue({
        member1: {
          individualId: "member1",
          firstName: "Bob",
          lastName: "Wilson",
        },
      });

      const to = DateTime.fromISO("2023-01-01");
      const result = await loadMemberLookup(firebaseAdmin, to, monitor);

      expect(result).toEqual({
        member1: {
          individualId: "member1",
          firstName: "Bob",
          lastName: "Wilson",
        },
      });
      expect(monitor.recordCacheMiss).toHaveBeenCalled();
      expect(monitor.recordFirestoreReads).toHaveBeenCalled();
      expect(saveMemberDataToCache).toHaveBeenCalledWith(
        {
          member1: {
            individualId: "member1",
            firstName: "Bob",
            lastName: "Wilson",
          },
        },
        "2023-01-01",
      );
      expect(saveMemberDataToGitHubCache).toHaveBeenCalledWith(
        {
          member1: {
            individualId: "member1",
            firstName: "Bob",
            lastName: "Wilson",
          },
        },
        "2023-01-01",
      );
    });
  });
});
