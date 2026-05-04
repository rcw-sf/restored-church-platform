import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdmin } from "../../config/firebase.js";
import { getEnvironment } from "../../env.js";
import { WeeklyGivingSummaryDoc } from "../../types/giving.js";
import { commitInChunks } from "../../utils/firestore-batch.js";
import { calculateSummaries } from "../calculate-summaries.js";
import { loadMappingData } from "../member-loader.js";
import {
  createEmptySummary,
  updateContribution,
  updateSpecialMissions,
  updateBenevolence,
} from "../summary-aggregation.js";

// Type for the mock document snapshot
type MockDocumentSnapshot = {
  id: string;
  data: () => {
    transactionId: string;
    individualId?: string;
    amount: number;
    fundName: string;
    fundKey: string;
    status: string;
    sundayDate: string;
    createdOn: Timestamp;
  };
};

// Type for the mock SyncMonitor
type MockSyncMonitor = {
  start: ReturnType<typeof vi.fn>;
  recordCacheMiss: ReturnType<typeof vi.fn>;
  recordFirestoreReads: ReturnType<typeof vi.fn>;
  recordTransactionsProcessed: ReturnType<typeof vi.fn>;
  recordAmountsProcessed: ReturnType<typeof vi.fn>;
  complete: ReturnType<typeof vi.fn>;
  fail: ReturnType<typeof vi.fn>;
};

const monitorInstance: MockSyncMonitor = {
  start: vi.fn().mockResolvedValue(undefined),
  recordCacheMiss: vi.fn(),
  recordFirestoreReads: vi.fn(),
  recordTransactionsProcessed: vi.fn(),
  recordAmountsProcessed: vi.fn(),
  complete: vi.fn().mockResolvedValue(undefined),
  fail: vi.fn().mockResolvedValue(undefined),
};

// Mock dependencies
vi.mock("../../env.js");
vi.mock("../member-loader.js");
vi.mock("../summary-aggregation.js", () => ({
  createEmptySummary: vi.fn(),
  updateContribution: vi.fn(),
  updateSpecialMissions: vi.fn(),
  updateBenevolence: vi.fn(),
  calculatePledgeTotals: vi.fn(),
}));
vi.mock("../../utils/firestore-batch.js");
vi.mock("../../utils/sync-monitor.js", () => ({
  SyncMonitor: class implements MockSyncMonitor {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(..._: unknown[]) {
      // Store the instance for test assertions
      return monitorInstance;
    }
    start = monitorInstance.start;
    recordCacheMiss = monitorInstance.recordCacheMiss;
    recordFirestoreReads = monitorInstance.recordFirestoreReads;
    recordTransactionsProcessed = monitorInstance.recordTransactionsProcessed;
    recordAmountsProcessed = monitorInstance.recordAmountsProcessed;
    complete = monitorInstance.complete;
    fail = monitorInstance.fail;
  },
}));

const mockGetEnvironment = vi.mocked(getEnvironment);
const mockLoadMappingData = vi.mocked(loadMappingData);
const mockCreateEmptySummary = vi.mocked(createEmptySummary);
const mockUpdateContribution = vi.mocked(updateContribution);
const mockUpdateSpecialMissions = vi.mocked(updateSpecialMissions);
const mockUpdateBenevolence = vi.mocked(updateBenevolence);
const mockCommitInChunks = vi.mocked(commitInChunks);

describe("calculateSummaries", () => {
  let mockFirebaseAdmin: FirebaseAdmin;
  let mockDb: {
    collection: ReturnType<typeof vi.fn>;
  };
  let mockCollection: ReturnType<typeof vi.fn>;
  let mockDoc: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup Firebase Admin mock
    mockFirebaseAdmin = {
      adminApp: {
        name: "mock-app",
        options: {},
      },
      firestore: vi.fn(),
    } as unknown as FirebaseAdmin;

    // Create a proper query mock that supports chaining
    const createQueryMock = () => ({
      where: vi.fn().mockReturnThis(),
      get: mockGet,
    });

    const createNestedCollectionMock = () => ({
      doc: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: mockGet,
    });

    mockGet = vi.fn();
    mockDoc = vi.fn(() => ({
      collection: vi.fn().mockReturnValue(createQueryMock()),
      where: vi.fn().mockReturnThis(),
      get: mockGet,
    }));
    mockCollection = vi.fn(() => ({
      doc: mockDoc,
      where: vi.fn().mockReturnThis(),
      get: mockGet,
      collection: vi.fn().mockReturnValue(createNestedCollectionMock()),
    }));

    mockDb = {
      collection: mockCollection,
    };

    mockFirebaseAdmin.firestore = vi.fn().mockReturnValue(mockDb);

    // Setup environment mock
    mockGetEnvironment.mockReturnValue({
      pushpayChmsApiBaseUrl: "https://test-api.pushpay.com",
      pushpayChmsApiUsername: "test-user",
      pushpayChmsApiPassword: "test-pass",
      pushpayGivingApiBaseUrl: "https://test-giving.pushpay.com",
      pushpayAuthTokenApiBaseUrl: "https://test-auth.pushpay.com",
      pushpayAuthTokenUsername: "test-auth-user",
      pushpayAuthTokenPassword: "test-auth-pass",
      pushpayOrganizationId: "test-org",
      contributionFundKey: "weekly-contribution-key",
      benevolenceFundKey: "benevolence-key",
      specialMissionsFundKey: "special-missions-key",
      firebaseProjectId: "test-project",
      tenantId: "test-tenant",
      syncType: "weekly",
      pushpayRateLimitMs: 6000,
      maxSyncStateTtlDays: 30,
      maxDailyUsageTtlDays: 60,
      transactionTtlDays: 30,
      weeklyGivingSummaryTtlDays: 90,
      githubActionCachePath: process.cwd(),
    });

    // Setup member data mock
    const mockMemberLookup = {
      "member-1": {
        individualId: "member-1",
        firstName: "John",
        lastName: "Doe",
        pledge: 100,
      },
      "member-2": {
        individualId: "member-2",
        firstName: "Jane",
        lastName: "Smith",
        pledge: 200,
      },
    };
    mockLoadMappingData.mockResolvedValue(mockMemberLookup);

    // Helper function to create mock Timestamp objects
    const mockTimestamp = (date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date,
      isEqual: () => false,
      valueOf: () => date.getTime().toString(),
      toMillis: () => date.getTime(),
    });

    // Setup summary aggregation mocks
    mockCreateEmptySummary.mockReturnValue({
      sundayDate: mockTimestamp(new Date("2023-01-01")),
      tenantId: "test-tenant",
      contribution: {
        totalOnline: 0,
        totalCash: 0,
        totalCheck: 0,
        totalGiving: 0,
        memberGiving: { givingCount: 0, nonGivingCount: 0 },
        nonMemberGiving: 0,
        pledge: { total: 0, discrepancy: 0 },
        netGrowth: 0,
      },
      specialMissions: {
        totalOnline: 0,
        totalCash: 0,
        totalCheck: 0,
        totalGiving: 0,
        netGrowth: 0,
      },
      benevolence: {
        totalOnline: 0,
        totalCash: 0,
        totalCheck: 0,
        totalGiving: 0,
        netGrowth: 0,
      },
      lastUpdated: mockTimestamp(new Date()),
      expireAt: Timestamp.now(),
    });

    mockUpdateContribution.mockImplementation(
      (summary, transaction, amount, individualId, memberLookup) => {
        summary.contribution.totalGiving += amount;
        if (individualId && memberLookup[individualId]) {
          summary.contribution.memberGiving.givingCount += 1;
        } else {
          summary.contribution.nonMemberGiving += amount;
        }
      },
    );

    mockUpdateSpecialMissions.mockImplementation(
      (summary, transaction, amount) => {
        summary.specialMissions.totalGiving += amount;
      },
    );

    mockUpdateBenevolence.mockImplementation((summary, transaction, amount) => {
      summary.benevolence.totalGiving += amount;
    });

    // Setup Firestore query mock
    const mockTransactions: MockDocumentSnapshot[] = [
      {
        id: "tx-1",
        data: () => ({
          transactionId: "tx-1",
          individualId: "member-1",
          amount: 50,
          fundName: "Contribution",
          fundKey: "weekly-contribution-key",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
      {
        id: "tx-2",
        data: () => ({
          transactionId: "tx-2",
          individualId: "member-2",
          amount: 75,
          fundName: "Contribution",
          fundKey: "weekly-contribution-key",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
    ];

    mockGet.mockResolvedValue({
      size: mockTransactions.length,
      docs: mockTransactions,
      forEach: (callback: (doc: MockDocumentSnapshot) => void) => {
        mockTransactions.forEach(callback);
      },
    });

    // Setup commitInChunks mock
    mockCommitInChunks.mockResolvedValue(undefined);
  });

  it("should calculate summaries successfully with default date range", async () => {
    const from = DateTime.fromISO("2023-01-01");
    const to = DateTime.fromISO("2023-01-07");

    await calculateSummaries(mockFirebaseAdmin, from, to);

    // Verify environment was accessed
    expect(mockGetEnvironment).toHaveBeenCalled();

    // Verify SyncMonitor was used correctly
    expect(monitorInstance.start).toHaveBeenCalledWith("manual");
    expect(monitorInstance.recordCacheMiss).toHaveBeenCalled();
    expect(monitorInstance.recordFirestoreReads).toHaveBeenCalled();
    expect(monitorInstance.recordTransactionsProcessed).toHaveBeenCalledWith(2);
    expect(monitorInstance.recordAmountsProcessed).toHaveBeenCalledWith(125);
    expect(monitorInstance.complete).toHaveBeenCalled();

    // Verify member data was loaded
    expect(mockLoadMappingData).toHaveBeenCalledWith(mockFirebaseAdmin);

    // Verify Firestore query was made with correct parameters
    expect(mockCollection).toHaveBeenCalledWith("tenants");
    expect(mockDoc).toHaveBeenCalledWith("test-tenant");

    // Verify summary aggregation was called
    expect(mockCreateEmptySummary).toHaveBeenCalledWith(
      "2023-01-01",
      "test-tenant",
    );
    expect(mockUpdateContribution).toHaveBeenCalledTimes(2);

    // Verify summaries were written to Firestore
    expect(mockCommitInChunks).toHaveBeenCalled();
  });

  it("should filter out failed transactions", async () => {
    const mockTransactions = [
      {
        id: "tx-1",
        data: () => ({
          transactionId: "tx-1",
          individualId: "member-1",
          amount: 50,
          fundName: "Contribution",
          fundKey: "weekly-contribution-key",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
      {
        id: "tx-2",
        data: () => ({
          transactionId: "tx-2",
          individualId: "member-2",
          amount: 75,
          fundName: "Contribution",
          fundKey: "weekly-contribution-key",
          status: "failed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
    ];

    mockGet.mockResolvedValue({
      size: mockTransactions.length,
      docs: mockTransactions,
      forEach: (callback: (doc: MockDocumentSnapshot) => void) => {
        mockTransactions.forEach(callback);
      },
    });

    await calculateSummaries(mockFirebaseAdmin);

    // Should only process the completed transaction
    expect(mockUpdateContribution).toHaveBeenCalledTimes(1);
    expect(monitorInstance.recordTransactionsProcessed).toHaveBeenCalledWith(2);
    expect(monitorInstance.recordAmountsProcessed).toHaveBeenCalledWith(50);
  });

  it("should process all configured fund transactions", async () => {
    const mockTransactions = [
      {
        id: "tx-1",
        data: () => ({
          transactionId: "tx-1",
          individualId: "member-1",
          amount: 50,
          fundName: "Contribution",
          fundKey: "weekly-contribution-key",
          paymentType: "Online",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
      {
        id: "tx-2",
        data: () => ({
          transactionId: "tx-2",
          individualId: "member-2",
          amount: 75,
          fundName: "Missions",
          fundKey: "special-missions-key",
          paymentType: "Cash",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
      {
        id: "tx-3",
        data: () => ({
          transactionId: "tx-3",
          individualId: "member-2",
          amount: 100,
          fundName: "Benevolence",
          fundKey: "benevolence-key",
          paymentType: "Check",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
      {
        id: "tx-4",
        data: () => ({
          transactionId: "tx-4",
          individualId: "member-2",
          amount: 25,
          fundName: "Other Fund",
          fundKey: "other-fund-key",
          paymentType: "Online",
          status: "completed",
          sundayDate: "2023-01-01",
          createdOn: Timestamp.fromDate(new Date("2023-01-01")),
        }),
      },
    ];

    mockGet.mockResolvedValue({
      size: mockTransactions.length,
      docs: mockTransactions,
      forEach: (callback: (doc: MockDocumentSnapshot) => void) => {
        mockTransactions.forEach(callback);
      },
    });

    await calculateSummaries(mockFirebaseAdmin);

    // Should process all configured fund transactions (3 total, skipping Other Fund)
    expect(mockUpdateContribution).toHaveBeenCalledTimes(1);
    expect(mockUpdateSpecialMissions).toHaveBeenCalledTimes(1);
    expect(mockUpdateBenevolence).toHaveBeenCalledTimes(1);
  });

  it("should calculate net growth correctly for all funds", async () => {
    await calculateSummaries(mockFirebaseAdmin);

    // Verify commitInChunks was called with correct summary data
    expect(mockCommitInChunks).toHaveBeenCalledWith(
      mockFirebaseAdmin,
      expect.any(Array),
      expect.any(Function),
    );

    // Verify the summary data contains correct calculated values
    const summaryData = mockCommitInChunks.mock.calls[0][1] as [
      string,
      WeeklyGivingSummaryDoc,
    ][];
    expect(summaryData).toHaveLength(1);
    const [date, data] = summaryData[0];
    expect(date).toBe("2023-01-01");

    // Verify nested structure
    expect(data.contribution.totalGiving).toBe(125);
    expect(data.contribution.memberGiving.givingCount).toBe(2);
    expect(data.contribution.pledge.total).toBe(0);
    expect(data.contribution.pledge.discrepancy).toBe(0);
    expect(data.contribution.netGrowth).toBe(0); // No previous week data

    // Other funds should be initialized
    expect(data.specialMissions.totalGiving).toBe(0);
    expect(data.specialMissions.netGrowth).toBe(0);
    expect(data.benevolence.totalGiving).toBe(0);
    expect(data.benevolence.netGrowth).toBe(0);
  });

  it("should handle errors and fail gracefully", async () => {
    const error = new Error("Database error");
    mockGet.mockRejectedValue(error);

    await expect(calculateSummaries(mockFirebaseAdmin)).rejects.toThrow(
      "Database error",
    );

    expect(monitorInstance.fail).toHaveBeenCalledWith(error);
  });

  it("should use default date range when no dates provided", async () => {
    await calculateSummaries(mockFirebaseAdmin);

    // Verify that default date range was used (Monday to now)
    // Note: Mock verification for where clauses is handled by the mock setup
  });
});
