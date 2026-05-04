import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parsePaymentType } from "../../../clients/giving.js";
import { getEnvironment } from "../../../env.js";
import { resolvePayerId } from "../../../services/payer-resolution.js";
import {
  MemberLookup,
  PaymentDetail,
  WeeklyMemberGivingDoc,
  WeeklyNonMemberGivingDoc,
} from "../../../types/giving.js";
import { MemberDoc } from "../../../types/members.js";
import { PushpayTransaction } from "../../../types/pushpay.js";
import {
  processTransactions,
  processMemberGiving,
  processNonMemberGiving,
  processRefunds,
  logSyncStats,
  buildTransactionDoc,
  type SyncStats,
} from "../processing.js";

// Mock dependencies
vi.mock("../../../clients/giving.js");
vi.mock("../../../env.js");
vi.mock("../../../services/payer-resolution.js");

describe("giving-processing", () => {
  let memberLookup: MemberLookup;
  let env: ReturnType<typeof getEnvironment>;

  beforeEach(() => {
    vi.clearAllMocks();
    memberLookup = {
      member1: {
        individualId: "member1",
        firstName: "John",
        lastName: "Doe",
        familyId: "family1",
      } as MemberDoc,
    };
    env = {
      tenantId: "test-tenant",
      transactionTtlDays: 30,
      contributionFundKey: "contributions",
      specialMissionsFundKey: "missions",
      benevolenceFundKey: "benevolence",
    } as ReturnType<typeof getEnvironment>;

    vi.mocked(getEnvironment).mockReturnValue(env);
    vi.mocked(parsePaymentType).mockReturnValue("Online");
    vi.mocked(resolvePayerId).mockReturnValue("member1");
  });

  describe("buildTransactionDoc", () => {
    it("should build transaction document", () => {
      const transaction: PushpayTransaction = {
        transactionId: "txn1",
        status: "Completed",
        payer: { fullName: "John Doe", email: "john@example.com" },
        amount: { amount: 100, currency: "USD" },
        paymentMethodType: "Online",
        createdOn: "2023-01-01T10:00:00Z",
        givenOn: "2023-01-01",
        fund: { key: "contributions", name: "General Fund" },
        externalLinks: [],
      };

      const givenDate = DateTime.fromISO("2023-01-01");
      const sundayDate = "2023-01-01";

      const result = buildTransactionDoc(
        transaction,
        "member1",
        givenDate,
        sundayDate,
        env,
      );

      expect(result).toMatchObject({
        transactionId: "txn1",
        individualId: "member1",
        name: "John Doe",
        amount: 100,
        fundName: "General Fund",
        fundKey: "contributions",
        sundayDate: "2023-01-01",
        status: "completed",
        tenantId: "test-tenant",
      });
      expect(result.createdOn).toBeInstanceOf(Object);
      expect(result.givenOn).toBeInstanceOf(Object);
    });
  });

  describe("processTransactions", () => {
    it("should process transactions into aggregates", () => {
      const transactions: PushpayTransaction[] = [
        {
          transactionId: "txn1",
          status: "Completed",
          payer: { fullName: "John Doe", email: "john@example.com" },
          amount: { amount: 100, currency: "USD" },
          paymentMethodType: "Online",
          createdOn: "2023-01-01T10:00:00Z",
          givenOn: "2023-01-01",
          fund: { key: "contributions", name: "General Fund" },
        },
      ];

      const initialAggregates = {
        memberGivingAggregates: [],
        nonMemberGiving: [],
      };

      const result = processTransactions(
        transactions,
        memberLookup,
        env,
        initialAggregates,
      );

      expect(result.stats.memberTransactions).toBe(1);
      expect(result.stats.nonMemberTransactions).toBe(0);
      expect(result.stats.contributionFund).toBe(1);
      expect(result.transactionDocs).toHaveLength(1);
      expect(result.memberGivingAggregates).toHaveLength(1);
      expect(result.processedMemberIds).toContain("member1");
    });

    it("should handle refunds", () => {
      const transactions: PushpayTransaction[] = [
        {
          transactionId: "refund1",
          status: "Completed",
          payer: { fullName: "John Doe", email: "john@example.com" },
          amount: { amount: -100, currency: "USD" },
          paymentMethodType: "Online",
          createdOn: "2023-01-01T10:00:00Z",
          givenOn: "2023-01-01",
          fund: { key: "contributions", name: "General Fund" },
          refundedBy: { transactionId: "txn1" },
        },
      ];

      const result = processTransactions(transactions, memberLookup, env, {
        memberGivingAggregates: [],
        nonMemberGiving: [],
      });

      expect(result.refunds).toHaveLength(1);
      expect(result.refunds[0]).toMatchObject({
        originalTransactionId: "txn1",
        refundTransactionId: "refund1",
        individualId: "member1",
        sundayDate: "2023-01-01",
      });
    });
  });

  describe("processMemberGiving", () => {
    it("should add payment to existing record", () => {
      const memberGivingAggregates: WeeklyMemberGivingDoc[] = [
        {
          individualId: "member1",
          sundayDate: "2023-01-01",
          name: "John Doe",
          totalAmount: 50,
          gave: true,
          payments: [
            {
              transactionId: "txn1",
              amount: 50,
              paymentType: "Online",
              date: "2023-01-01T10:00:00Z",
              status: "completed",
            },
          ],
        },
      ];

      const member: MemberDoc = {
        individualId: "member1",
        firstName: "John",
        lastName: "Doe",
      };

      const payment: PaymentDetail = {
        transactionId: "txn2",
        amount: 75,
        paymentType: "Online",
        status: "completed",
        date: "2023-01-01T10:00:00Z",
      };

      const expireAt = DateTime.now();

      processMemberGiving(
        member,
        "member1",
        "2023-01-01",
        75,
        payment,
        expireAt,
        env,
        memberGivingAggregates,
      );

      expect(memberGivingAggregates[0].totalAmount).toBe(125);
      expect(memberGivingAggregates[0].payments).toHaveLength(2);
    });

    it("should create new record", () => {
      const memberGivingAggregates: WeeklyMemberGivingDoc[] = [];

      const member: MemberDoc = {
        individualId: "member1",
        firstName: "John",
        lastName: "Doe",
      };

      const payment: PaymentDetail = {
        transactionId: "txn1",
        amount: 100,
        paymentType: "Online",
        status: "completed",
        date: "2023-01-01T10:00:00Z",
      };

      const expireAt = DateTime.now();

      processMemberGiving(
        member,
        "member1",
        "2023-01-01",
        100,
        payment,
        expireAt,
        env,
        memberGivingAggregates,
      );

      expect(memberGivingAggregates).toHaveLength(1);
      expect(memberGivingAggregates[0]).toMatchObject({
        individualId: "member1",
        sundayDate: "2023-01-01",
        name: "John Doe",
        totalAmount: 100,
        gave: true,
      });
    });
  });

  describe("processNonMemberGiving", () => {
    it("should add to existing record", () => {
      const nonMemberGiving: WeeklyNonMemberGivingDoc[] = [
        {
          individualId: "nonmember1",
          sundayDate: "2023-01-01",
          name: "Jane Doe",
          totalAmount: 25,
          payments: [
            {
              transactionId: "txn1",
              amount: 25,
              paymentType: "Online",
              date: "2023-01-01T10:00:00Z",
              status: "completed",
            },
          ],
        },
      ];

      const payment: PaymentDetail = {
        transactionId: "txn2",
        amount: 75,
        paymentType: "Online",
        status: "completed",
        date: "2023-01-01T10:00:00Z",
      };

      const expireAt = DateTime.now();

      processNonMemberGiving(
        "nonmember1",
        "2023-01-01",
        "Jane Doe",
        75,
        payment,
        expireAt,
        env,
        nonMemberGiving,
      );

      expect(nonMemberGiving[0].totalAmount).toBe(100);
      expect(nonMemberGiving[0].payments).toHaveLength(2);
    });

    it("should create new record", () => {
      const nonMemberGiving: WeeklyNonMemberGivingDoc[] = [];

      const payment: PaymentDetail = {
        transactionId: "txn1",
        amount: 100,
        paymentType: "Online",
        status: "completed",
        date: "2023-01-01T10:00:00Z",
      };

      const expireAt = DateTime.now();

      processNonMemberGiving(
        "nonmember1",
        "2023-01-01",
        "Jane Doe",
        100,
        payment,
        expireAt,
        env,
        nonMemberGiving,
      );

      expect(nonMemberGiving).toHaveLength(1);
      expect(nonMemberGiving[0]).toMatchObject({
        individualId: "nonmember1",
        sundayDate: "2023-01-01",
        name: "Jane Doe",
        totalAmount: 100,
      });
    });
  });

  describe("processRefunds", () => {
    it("should remove refunded payments", () => {
      const memberGivingAggregates: WeeklyMemberGivingDoc[] = [
        {
          individualId: "member1",
          sundayDate: "2023-01-01",
          name: "John Doe",
          totalAmount: 200,
          gave: true,
          payments: [
            {
              transactionId: "txn1",
              amount: 100,
              paymentType: "Online",
              date: "2023-01-01T10:00:00Z",
              status: "completed",
            },
            {
              transactionId: "txn2",
              amount: 100,
              paymentType: "Online",
              date: "2023-01-01T10:00:00Z",
              status: "completed",
            },
          ],
        },
      ];

      const refunds = [
        {
          originalTransactionId: "txn1",
          refundTransactionId: "refund1",
          individualId: "member1",
          sundayDate: "2023-01-01",
        },
      ];

      processRefunds(refunds, memberGivingAggregates, []);

      expect(memberGivingAggregates[0].totalAmount).toBe(100);
      expect(memberGivingAggregates[0].payments).toHaveLength(1);
      expect(memberGivingAggregates[0].payments?.[0]?.transactionId).toBe(
        "txn2",
      );
      expect(memberGivingAggregates[0].gave).toBe(true);
    });
  });

  describe("logSyncStats", () => {
    it("should log statistics", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const stats: SyncStats = {
        memberTransactions: 10,
        nonMemberTransactions: 5,
        contributionFund: 8,
        specialMissionsFund: 3,
        benevolenceFund: 2,
        otherFund: 2,
      };

      const transactions: PushpayTransaction[] = [
        { amount: { amount: 100 } } as PushpayTransaction,
        { amount: { amount: 50 } } as PushpayTransaction,
      ];

      const memberGivingAggregates: WeeklyMemberGivingDoc[] = [
        {} as WeeklyMemberGivingDoc,
        {} as WeeklyMemberGivingDoc,
      ];
      const nonMemberGiving: WeeklyNonMemberGivingDoc[] = [
        {} as WeeklyNonMemberGivingDoc,
      ];

      logSyncStats(
        stats,
        transactions,
        memberGivingAggregates,
        nonMemberGiving,
      );

      expect(consoleSpy).toHaveBeenCalledWith("\n📈 Transaction breakdown:");
      expect(consoleSpy).toHaveBeenCalledWith("   👥 Member transactions: 10");
      expect(consoleSpy).toHaveBeenCalledWith(
        "   👤 Non-member transactions: 5",
      );
      expect(consoleSpy).toHaveBeenCalledWith("💰 Total amount: $150.00");

      consoleSpy.mockRestore();
    });
  });
});
