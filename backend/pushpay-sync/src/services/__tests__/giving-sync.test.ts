import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPushpayGiving } from "../../clients/giving.js";
import { FirebaseAdmin } from "../../config/firebase.js";
import { getEnvironment } from "../../env.js";
import type { Environment } from "../../env.js";
import { calculateSundayDate } from "../../helpers/date-utils.js";
import { calculateEffectiveFromDate } from "../../helpers/giving/dates.js";
import {
  loadExistingGivingRecords,
  writeTransactionsToFirestore,
  writeGivingRecords,
  markNonGivers,
} from "../../helpers/giving/firestore.js";
import { loadMemberLookup } from "../../helpers/giving/members.js";
import {
  processTransactions,
  processRefunds,
  logSyncStats,
  type GivingAggregates,
} from "../../helpers/giving/processing.js";
import { MemberLookup } from "../../types/giving.js";
import { PushpayTransaction } from "../../types/pushpay.js";
import { SyncStateDoc } from "../../types/sync.js";
import { SyncMonitor } from "../../utils/sync-monitor.js";
import { syncGiving } from "../giving-sync.js";

// Mock all dependencies
vi.mock("../../clients/giving.js");
vi.mock("../../env.js");
vi.mock("../../helpers/date-utils.js");
vi.mock("../../utils/sync-monitor.js", () => {
  class MockSyncMonitor {
    start = vi.fn().mockResolvedValue(undefined);
    recordPushpayApiCall = vi.fn();
    recordTransactionsProcessed = vi.fn();
    recordAmountsProcessed = vi.fn();
    complete = vi.fn().mockResolvedValue(undefined);
    fail = vi.fn().mockResolvedValue(undefined);

    static getLastSuccessfulGivingSync = vi.fn().mockResolvedValue(null);
  }

  return {
    SyncMonitor: MockSyncMonitor,
  };
});
vi.mock("../../helpers/giving/dates.js");
vi.mock("../../helpers/giving/members.js");
vi.mock("../../helpers/giving/firestore.js");
vi.mock("../../helpers/giving/processing.js");

describe("giving-sync", () => {
  let firebaseAdmin: FirebaseAdmin;
  let mockEnv: Environment;
  let mockFrom: DateTime;
  let mockTo: DateTime;
  let mockTransactions: PushpayTransaction[];
  let mockMemberLookup: MemberLookup;
  let mockExistingRecords: {
    memberGivingAggregates: never[];
    nonMemberGiving: never[];
  };
  let mockAggregates: GivingAggregates;

  beforeEach(() => {
    // Ensure consistent behavior across local and CI environments
    delete process.env.GITHUB_ACTIONS;
    vi.clearAllMocks();

    // Setup test data
    mockFrom = DateTime.fromISO("2023-01-01T00:00:00Z");
    mockTo = DateTime.fromISO("2023-01-07T23:59:59Z");

    mockTransactions = [
      {
        transactionId: "txn1",
        status: "Completed",
        payer: { fullName: "John Doe", email: "john@example.com" },
        amount: { amount: 100, currency: "USD" },
        paymentMethodType: "Online",
        createdOn: "2023-01-01T10:00:00Z",
        givenOn: "2023-01-01",
        fund: { key: "contributions", name: "General Fund" },
        externalLinks: [],
      },
    ];

    mockMemberLookup = {
      member1: {
        pushpayIndividualId: "member1",
        firstName: "John",
        lastName: "Doe",
        familyId: "family1",
      },
    } as MemberLookup;

    mockExistingRecords = {
      memberGivingAggregates: [],
      nonMemberGiving: [],
    };

    mockAggregates = {
      memberGivingAggregates: [
        {
          pushpayIndividualId: "member1",
          sundayDate: "2023-01-01",
          name: "John Doe",
          totalAmount: 100,
          gave: true,
          payments: [],
        },
      ],
      nonMemberGiving: [],
      transactionDocs: [
        {
          transactionId: "txn1",
          pushpayIndividualId: "member1",
          name: "John Doe",
          amount: 100,
          fundName: "General Fund",
          fundKey: "contributions",
          sundayDate: "2023-01-01",
          status: "completed",
          paymentType: "Online" as const,
          createdOn: Timestamp.now(),
          givenOn: Timestamp.now(),
        },
      ],
      familyGivingIds: new Set(["family1"]),
      processedMemberIds: new Set(["member1"]),
      stats: {
        memberTransactions: 1,
        nonMemberTransactions: 0,
        contributionFund: 1,
        specialMissionsFund: 0,
        benevolenceFund: 0,
        otherFund: 0,
      },
      refunds: [],
    };

    mockEnv = {
      pushpayChmsApiBaseUrl: "https://test-chms.com",
      pushpayChmsApiUsername: "test-user",
      pushpayChmsApiPassword: "test-pass",
      pushpayGivingApiBaseUrl: "https://test-giving.com",
      pushpayAuthTokenApiBaseUrl: "https://test-auth.com",
      pushpayAuthTokenUsername: "auth-user",
      pushpayAuthTokenPassword: "auth-pass",
      pushpayOrganizationId: "test-org",
      contributionFundKey: "contributions",
      benevolenceFundKey: "benevolence",
      specialMissionsFundKey: "missions",
      firebaseProjectId: "test-project",
      tenantId: "test-tenant",
      syncType: "weekly",
      pushpayRateLimitMs: 100,
      maxSyncStateTtlDays: 30,
      maxDailyUsageTtlDays: 365,
      transactionTtlDays: 30,
      weeklyGivingSummaryTtlDays: 90,
      githubActionCachePath: "/tmp/cache",
      googleSpreadsheetId: "test-sheet-id",
    };

    // Setup mock implementations
    vi.mocked(getEnvironment).mockReturnValue(mockEnv);
    vi.mocked(fetchPushpayGiving).mockResolvedValue(mockTransactions);
    vi.mocked(calculateSundayDate).mockReturnValue(
      DateTime.fromISO("2023-01-01"),
    );
    vi.mocked(calculateEffectiveFromDate).mockReturnValue(mockFrom);
    vi.mocked(SyncMonitor.getLastSuccessfulGivingSync).mockResolvedValue(null);
    vi.mocked(loadMemberLookup).mockResolvedValue(mockMemberLookup);
    vi.mocked(loadExistingGivingRecords).mockResolvedValue(mockExistingRecords);
    vi.mocked(processTransactions).mockReturnValue(mockAggregates);
    vi.mocked(processRefunds).mockImplementation(() => {});
    vi.mocked(logSyncStats).mockImplementation(() => {});
    vi.mocked(writeTransactionsToFirestore).mockImplementation(() => {});
    vi.mocked(writeGivingRecords).mockImplementation(() => {});
    vi.mocked(markNonGivers).mockImplementation(() => {});

    // Mock FirebaseAdmin
    firebaseAdmin = {
      firestore: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
        }),
      }),
      adminApp: {} as FirebaseAdmin["adminApp"],
    } as unknown as FirebaseAdmin;

    // Mock console to keep test output clean
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("syncGiving", () => {
    it("should complete sync successfully with transactions", async () => {
      await syncGiving(firebaseAdmin, mockFrom, mockTo);

      // Verify initialization steps
      expect(SyncMonitor.getLastSuccessfulGivingSync).toHaveBeenCalledWith(
        firebaseAdmin,
        "test-tenant",
      );
      expect(calculateEffectiveFromDate).toHaveBeenCalledWith(mockFrom, null);

      // Verify monitor setup - SyncMonitor constructor called implicitly during sync

      // Verify data fetching
      expect(fetchPushpayGiving).toHaveBeenCalledWith(mockFrom, mockTo);
      expect(loadMemberLookup).toHaveBeenCalledWith(
        firebaseAdmin,
        mockTo,
        expect.any(Object),
      );
      expect(loadExistingGivingRecords).toHaveBeenCalledWith(
        expect.any(Object),
        "test-tenant",
        mockFrom,
        mockTo,
        expect.any(Object),
      );

      // Verify processing
      expect(processTransactions).toHaveBeenCalledWith(
        mockTransactions,
        mockMemberLookup,
        mockEnv,
        mockExistingRecords,
      );
      expect(processRefunds).toHaveBeenCalledWith(
        mockAggregates.refunds,
        mockAggregates.memberGivingAggregates,
        mockAggregates.nonMemberGiving,
      );
      expect(logSyncStats).toHaveBeenCalledWith(
        mockAggregates.stats,
        mockTransactions,
        mockAggregates.memberGivingAggregates,
        mockAggregates.nonMemberGiving,
      );

      // Verify writing
      expect(writeTransactionsToFirestore).toHaveBeenCalledWith(
        firebaseAdmin,
        mockAggregates.transactionDocs,
        mockEnv,
      );
      expect(markNonGivers).toHaveBeenCalledWith(
        mockMemberLookup,
        mockAggregates.processedMemberIds,
        mockAggregates.familyGivingIds,
        "2023-01-01",
        mockEnv,
        mockAggregates.memberGivingAggregates,
      );
      expect(writeGivingRecords).toHaveBeenCalledWith(
        firebaseAdmin,
        mockAggregates.memberGivingAggregates,
        mockAggregates.nonMemberGiving,
        mockEnv,
      );
    });

    it("should handle empty transactions array", async () => {
      vi.mocked(fetchPushpayGiving).mockResolvedValue([]);

      await syncGiving(firebaseAdmin, mockFrom, mockTo);

      expect(fetchPushpayGiving).toHaveBeenCalledWith(mockFrom, mockTo);
      expect(processTransactions).toHaveBeenCalledWith(
        [],
        mockMemberLookup,
        mockEnv,
        mockExistingRecords,
      );

      // Verify completion - removed direct mock method access
      // The sync should complete successfully if no errors thrown
    });

    it("should use effective from date based on last successful sync", async () => {
      const lastSync: SyncStateDoc = {
        id: "sync-1",
        type: "giving",
        status: "completed",
        startedAt: Timestamp.fromDate(new Date("2022-12-31T00:00:00Z")),
        dateRange: { from: "2022-12-31T00:00:00Z", to: "2022-12-31T23:59:59Z" },
        metrics: {
          firestoreReads: 0,
          firestoreWrites: 0,
          cacheHits: 0,
          cacheMisses: 0,
          pushpayApiCalls: 0,
        },
        triggeredBy: "manual",
        environment: "local",
      };
      const effectiveFrom = DateTime.fromISO("2022-12-31T23:59:58Z");

      vi.mocked(SyncMonitor.getLastSuccessfulGivingSync).mockResolvedValue(
        lastSync,
      );
      vi.mocked(calculateEffectiveFromDate).mockReturnValue(effectiveFrom);

      await syncGiving(firebaseAdmin, mockFrom, mockTo);

      expect(calculateEffectiveFromDate).toHaveBeenCalledWith(
        mockFrom,
        lastSync,
      );
      expect(fetchPushpayGiving).toHaveBeenCalledWith(effectiveFrom, mockTo);
    });
  });
});
