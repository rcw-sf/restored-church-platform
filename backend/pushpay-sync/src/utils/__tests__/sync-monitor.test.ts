import admin from "firebase-admin";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FirebaseAdmin } from "../../config/firebase.js";
import { SyncMonitor } from "../sync-monitor.js";

// Mock FirebaseAdmin
vi.mock("../../config/firebase.js", () => ({
  FirebaseAdmin: vi.fn().mockImplementation(function () {
    const mockBatchInstance: admin.firestore.WriteBatch = {
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(null),
      // Add other batch methods if they are used in the code under test
      // e.g., update, delete, create
    } as unknown as admin.firestore.WriteBatch; // Cast to satisfy the interface

    const mockFirestoreInstance: admin.firestore.Firestore = {
      batch: vi.fn().mockReturnValue(mockBatchInstance),
      // Add other firestore methods if they are used in the code under test
      // e.g., collection, doc, runTransaction
    } as unknown as admin.firestore.Firestore; // Cast to satisfy the interface

    return {
      firestore: vi.fn().mockReturnValue(mockFirestoreInstance),
    };
  }),
}));

describe("SyncMonitor", () => {
  let mockDb: {
    collection: ReturnType<typeof vi.fn>;
  };
  let mockCollection: {
    doc: ReturnType<typeof vi.fn>;
  };
  let mockDoc: {
    set: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let firebaseAdmin: FirebaseAdmin;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    };

    // Support nested collection().doc().collection().doc() pattern for tenant paths
    const mockTenantCollection = {
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue(mockCollection),
      }),
    };

    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
    };

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "tenants") {
          return mockTenantCollection;
        }
        return mockCollection;
      }),
    };

    firebaseAdmin = new FirebaseAdmin();
    vi.mocked(firebaseAdmin.firestore).mockReturnValue(
      mockDb as unknown as FirebaseFirestore.Firestore,
    );

    // Mock console to keep test output clean
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Metric Recording", () => {
    it("should correctly record various metrics", () => {
      const monitor = new SyncMonitor(firebaseAdmin, "giving");

      monitor.recordFirestoreReads(5);
      monitor.recordFirestoreWrites(3);
      monitor.recordCacheHit();
      monitor.recordCacheMiss();
      monitor.recordPushpayApiCall();
      monitor.recordMembersProcessed(10);
      monitor.recordTransactionsProcessed(20);
      monitor.recordAmountsProcessed(100.5);

      const metrics = monitor.getMetrics();
      expect(metrics.firestoreReads).toBe(5);
      expect(metrics.firestoreWrites).toBe(3);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.pushpayApiCalls).toBe(1);
      expect(metrics.membersProcessed).toBe(10);
      expect(metrics.transactionsProcessed).toBe(20);
      expect(metrics.amountsProcessed).toBe(100.5);
    });

    it("should accumulate metrics on multiple calls", () => {
      const monitor = new SyncMonitor(firebaseAdmin, "member");
      monitor.recordFirestoreReads(2);
      monitor.recordFirestoreReads(3);

      expect(monitor.getMetrics().firestoreReads).toBe(5);
    });
  });

  describe("Lifecycle Methods", () => {
    it("should start monitoring without errors", async () => {
      const monitor = new SyncMonitor(firebaseAdmin, "member");

      // Should not throw
      await expect(monitor.start("manual")).resolves.not.toThrow();
    });

    it("should complete monitoring without errors", async () => {
      const monitor = new SyncMonitor(firebaseAdmin, "giving");
      monitor.recordFirestoreReads(10);

      // Should not throw
      await expect(monitor.complete()).resolves.not.toThrow();
    });

    it("should fail monitoring without errors", async () => {
      const monitor = new SyncMonitor(firebaseAdmin, "member");
      const testError = new Error("Sync failed");

      // Should not throw
      await expect(monitor.fail(testError)).resolves.not.toThrow();
    });
  });

  describe("Daily Usage Tracking", () => {
    it("should track metrics for new daily usage", async () => {
      const monitor = new SyncMonitor(firebaseAdmin, "member");
      monitor.recordFirestoreReads(50);

      // Should not throw when creating new usage doc
      await expect(monitor.complete()).resolves.not.toThrow();
    });

    it("should track metrics for existing daily usage", async () => {
      const monitor = new SyncMonitor(firebaseAdmin, "giving");
      monitor.recordFirestoreWrites(10);

      // Should not throw when updating existing usage doc
      await expect(monitor.complete()).resolves.not.toThrow();
    });
  });

  describe("Static Retrieval Methods", () => {
    it("should fetch recent syncs", async () => {
      const mockSnapshot = {
        docs: [
          { id: "sync-1", data: () => ({ type: "member" }) },
          { id: "sync-2", data: () => ({ type: "giving" }) },
        ],
      };

      const mockOrderedCollection = {
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot),
          }),
        }),
      };

      const mockTenantDoc = {
        collection: vi.fn().mockReturnValue(mockOrderedCollection),
      };

      const mockTenantCollection = {
        doc: vi.fn().mockReturnValue(mockTenantDoc),
      };

      const mockDbWithTenant = {
        collection: vi.fn((name: string) => {
          if (name === "tenants") return mockTenantCollection;
          return mockCollection;
        }),
      };

      vi.mocked(firebaseAdmin.firestore).mockReturnValue(
        mockDbWithTenant as unknown as FirebaseFirestore.Firestore,
      );

      const results = await SyncMonitor.getRecentSyncs(
        firebaseAdmin,
        "test-tenant",
        2,
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("sync-1");
    });
  });
});
