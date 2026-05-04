import * as FirebaseFirestore from "@google-cloud/firestore";
import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdmin } from "../../../config/firebase.js";
import { getEnvironment } from "../../../env.js";
import {
  TransactionDoc,
  WeeklyMemberGivingDoc,
  WeeklyNonMemberGivingDoc,
  MemberLookup,
} from "../../../types/giving.js";
import { MemberDoc } from "../../../types/members.js";
import { commitInChunks } from "../../../utils/firestore-batch.js";
import { SyncMonitor } from "../../../utils/sync-monitor.js";
import {
  loadExistingGivingRecords,
  writeTransactionsToFirestore,
  writeGivingRecords,
  markNonGivers,
} from "../firestore.js";

// Mock dependencies
vi.mock("../../../utils/firestore-batch.js");
vi.mock("../../../utils/sync-monitor.js");
vi.mock("../../../env.js");

describe("giving-firestore", () => {
  let firebaseAdmin: FirebaseAdmin;
  let monitor: SyncMonitor;
  let env: ReturnType<typeof getEnvironment>;

  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAdmin = {
      firestore: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn(),
            set: vi.fn(),
            update: vi.fn(),
          }),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            empty: true,
          }),
        }),
      }),
    } as unknown as FirebaseAdmin;

    monitor = {
      recordFirestoreReads: vi.fn(),
    } as unknown as SyncMonitor;

    env = {
      tenantId: "test-tenant",
      transactionTtlDays: 30,
    } as ReturnType<typeof getEnvironment>;

    vi.mocked(getEnvironment).mockReturnValue(env);
  });

  describe("loadExistingGivingRecords", () => {
    it("should load existing giving records", async () => {
      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-07");

      const mockMemberDoc = {
        data: () => ({ individualId: "member1", sundayDate: "2023-01-01" }),
      } as unknown;
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          docs: [mockMemberDoc],
        }),
      };
      const mockEmptyQuery = {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          docs: [],
        }),
      };
      const mockDoc = {
        collection: vi.fn().mockImplementation((collectionName) => {
          if (collectionName === "weekly_member_giving") {
            return mockQuery;
          }
          return mockEmptyQuery;
        }),
      };
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue(mockDoc),
        }),
      };

      const result = await loadExistingGivingRecords(
        mockDb as unknown as FirebaseFirestore.Firestore,
        "test-tenant",
        from,
        to,
        monitor,
      );

      expect(result.memberGivingAggregates).toEqual([
        { individualId: "member1", sundayDate: "2023-01-01" },
      ]);
      expect(result.nonMemberGiving).toEqual([]);
      expect(monitor.recordFirestoreReads).toHaveBeenCalled();
    });
  });

  describe("writeTransactionsToFirestore", () => {
    it("should write transactions in chunks", () => {
      const transactions: TransactionDoc[] = [
        {
          transactionId: "txn1",
          individualId: "member1",
          name: "John Doe",
          amount: 100,
          tenantId: "test-tenant",
        } as TransactionDoc,
      ];

      const mockBatch = {
        set: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      } as FirebaseFirestore.WriteBatch;

      vi.mocked(commitInChunks).mockImplementation(
        async (_, items, callback) => {
          items.forEach((item) => callback(mockBatch, item));
        },
      );

      writeTransactionsToFirestore(firebaseAdmin, transactions, env);

      expect(commitInChunks).toHaveBeenCalledWith(
        firebaseAdmin,
        transactions,
        expect.any(Function),
      );
    });
  });

  describe("writeGivingRecords", () => {
    it("should write member and non-member giving records", () => {
      const memberGiving: WeeklyMemberGivingDoc[] = [
        {
          individualId: "member1",
          sundayDate: "2023-01-01",
          name: "John Doe",
          gave: true,
          totalAmount: 100,
          tenantId: "test-tenant",
        } as WeeklyMemberGivingDoc,
      ];
      const nonMemberGiving: WeeklyNonMemberGivingDoc[] = [
        {
          individualId: "nonmember1",
          sundayDate: "2023-01-01",
          name: "Jane Doe",
          totalAmount: 50,
          tenantId: "test-tenant",
        } as WeeklyNonMemberGivingDoc,
      ];

      const mockBatch = {
        set: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      } as FirebaseFirestore.WriteBatch;

      vi.mocked(commitInChunks).mockImplementation(
        async (_, items, callback) => {
          items.forEach((item) => callback(mockBatch, item));
        },
      );

      writeGivingRecords(firebaseAdmin, memberGiving, nonMemberGiving, env);

      expect(commitInChunks).toHaveBeenCalledTimes(2); // Once for members, once for non-members
    });
  });

  describe("markNonGivers", () => {
    it("should mark non-givers", () => {
      const memberLookup: MemberLookup = {
        member1: {
          individualId: "member1",
          firstName: "John",
          lastName: "Doe",
          familyId: "family1",
        } as MemberDoc,
        member2: {
          individualId: "member2",
          firstName: "Jane",
          lastName: "Smith",
          familyId: undefined,
        } as MemberDoc,
      };
      const processedMemberIds = new Set(["member1"]);
      const familyGivingIds = new Set(["family1"]);
      const memberGivingAggregates: WeeklyMemberGivingDoc[] = [];

      markNonGivers(
        memberLookup,
        processedMemberIds,
        familyGivingIds,
        "2023-01-01",
        env,
        memberGivingAggregates,
      );

      expect(memberGivingAggregates).toHaveLength(1);
      expect(memberGivingAggregates[0]).toMatchObject({
        individualId: "member2",
        sundayDate: "2023-01-01",
        name: "Jane Smith",
        gave: false,
      });
    });
  });
});
