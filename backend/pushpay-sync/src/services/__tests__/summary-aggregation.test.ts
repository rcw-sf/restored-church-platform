import { Timestamp } from "firebase-admin/firestore";
import { describe, it, expect } from "vitest";
import {
  MemberLookup,
  TransactionDoc,
  WeeklyGivingSummaryDoc,
} from "../../types/giving.js";
import {
  createEmptySummary,
  updateContribution,
  updateSpecialMissions,
  updateBenevolence,
  updateFundGiving,
} from "../summary-aggregation.js";

describe("createEmptySummary", () => {
  it("should create summary with all fields initialized to zero", () => {
    const result = createEmptySummary("2023-06-15", "test-tenant");

    expect(result.sundayDate).toBeInstanceOf(Timestamp);

    // Contribution fund
    expect(result.contribution.totalOnline).toBe(0);
    expect(result.contribution.totalCash).toBe(0);
    expect(result.contribution.totalCheck).toBe(0);
    expect(result.contribution.totalGiving).toBe(0);
    expect(result.contribution.memberGiving.givingCount).toBe(0);
    expect(result.contribution.memberGiving.nonGivingCount).toBe(0);
    expect(result.contribution.nonMemberGiving).toBe(0);
    expect(result.contribution.pledge.total).toBe(0);
    expect(result.contribution.pledge.discrepancy).toBe(0);
    expect(result.contribution.netGrowth).toBe(0);

    // Special missions fund
    expect(result.specialMissions.totalOnline).toBe(0);
    expect(result.specialMissions.totalCash).toBe(0);
    expect(result.specialMissions.totalCheck).toBe(0);
    expect(result.specialMissions.totalGiving).toBe(0);
    expect(result.specialMissions.netGrowth).toBe(0);

    // Benevolence fund
    expect(result.benevolence.totalOnline).toBe(0);
    expect(result.benevolence.totalCash).toBe(0);
    expect(result.benevolence.totalCheck).toBe(0);
    expect(result.benevolence.totalGiving).toBe(0);
    expect(result.benevolence.netGrowth).toBe(0);

    expect(result.lastUpdated).toBeInstanceOf(Timestamp);
    expect(result.tenantId).toBe("test-tenant");
  });

  it("should convert ISO date to Timestamp correctly", () => {
    const result = createEmptySummary("2023-06-15", "test-tenant");

    expect(
      result.sundayDate.toDate().toISOString().startsWith("2023-06-15"),
    ).toBe(true);
  });
});

describe("updateFundGiving", () => {
  function createMockFund() {
    return {
      totalOnline: 0,
      totalCash: 0,
      totalCheck: 0,
      totalGiving: 0,
    };
  }

  function createMockTransaction(
    paymentType: "Online" | "Cash" | "Check",
  ): TransactionDoc {
    return {
      transactionId: "txn-123",
      individualId: "person-123",
      name: "John Doe",
      fundName: "General Fund",
      amount: 100,
      paymentType,
      createdOn: Timestamp.now(),
      givenOn: Timestamp.now(),
      sundayDate: "2023-06-15",
      note: "Test note",
      status: "completed",
      tenantId: "test-tenant",
    };
  }

  it("should add amount to totalGiving", () => {
    const fund = createMockFund();
    const transaction = createMockTransaction("Online");

    updateFundGiving(fund, transaction, 100);

    expect(fund.totalGiving).toBe(100);
  });

  it("should categorize Online payments", () => {
    const fund = createMockFund();
    const transaction = createMockTransaction("Online");

    updateFundGiving(fund, transaction, 100);

    expect(fund.totalOnline).toBe(100);
    expect(fund.totalCash).toBe(0);
    expect(fund.totalCheck).toBe(0);
  });

  it("should categorize Cash payments", () => {
    const fund = createMockFund();
    const transaction = createMockTransaction("Cash");

    updateFundGiving(fund, transaction, 50);

    expect(fund.totalCash).toBe(50);
    expect(fund.totalOnline).toBe(0);
    expect(fund.totalCheck).toBe(0);
  });

  it("should categorize Check payments", () => {
    const fund = createMockFund();
    const transaction = createMockTransaction("Check");

    updateFundGiving(fund, transaction, 200);

    expect(fund.totalCheck).toBe(200);
    expect(fund.totalOnline).toBe(0);
    expect(fund.totalCash).toBe(0);
  });
});

describe("updateContribution", () => {
  function createMockSummary(): WeeklyGivingSummaryDoc {
    return {
      sundayDate: Timestamp.now(),
      contribution: {
        totalOnline: 0,
        totalCash: 0,
        totalCheck: 0,
        totalGiving: 0,
        memberGiving: {
          givingCount: 0,
          nonGivingCount: 0,
        },
        nonMemberGiving: 0,
        pledge: {
          total: 0,
          discrepancy: 0,
        },
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
      lastUpdated: Timestamp.now(),
      tenantId: "test-tenant",
    };
  }

  function createMockTransaction(
    paymentType: "Online" | "Cash" | "Check",
  ): TransactionDoc {
    return {
      transactionId: "txn-123",
      individualId: "person-123",
      name: "John Doe",
      fundName: "General Fund",
      amount: 100,
      paymentType,
      createdOn: Timestamp.now(),
      givenOn: Timestamp.now(),
      sundayDate: "2023-06-15",
      note: "Test note",
      status: "completed",
      tenantId: "test-tenant",
    };
  }

  const members: MemberLookup = {
    "person-123": {
      individualId: "person-123",
      firstName: "John",
      lastName: "Doe",
      tenantId: "test-tenant",
    },
  } as MemberLookup;

  it("should add amount to contribution totalGiving", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, 100, "person-123", members);

    expect(summary.contribution.totalGiving).toBe(100);
  });

  it("should categorize Online payments", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, 100, "person-123", members);

    expect(summary.contribution.totalOnline).toBe(100);
    expect(summary.contribution.totalCash).toBe(0);
    expect(summary.contribution.totalCheck).toBe(0);
  });

  it("should categorize Cash payments", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Cash");

    updateContribution(summary, transaction, 50, "person-123", members);

    expect(summary.contribution.totalCash).toBe(50);
    expect(summary.contribution.totalOnline).toBe(0);
    expect(summary.contribution.totalCheck).toBe(0);
  });

  it("should categorize Check payments", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Check");

    updateContribution(summary, transaction, 200, "person-123", members);

    expect(summary.contribution.totalCheck).toBe(200);
    expect(summary.contribution.totalOnline).toBe(0);
    expect(summary.contribution.totalCash).toBe(0);
  });

  it("should count member giving and not add to non-member total", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, 100, "person-123", members);

    expect(summary.contribution.memberGiving.givingCount).toBe(1);
    expect(summary.contribution.memberGiving.nonGivingCount).toBe(0);
    expect(summary.contribution.nonMemberGiving).toBe(0);
  });

  it("should count non-member giving and add to non-member total", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, 75, "person-456", members);

    expect(summary.contribution.memberGiving.givingCount).toBe(0);
    expect(summary.contribution.memberGiving.nonGivingCount).toBe(1);
    expect(summary.contribution.nonMemberGiving).toBe(75);
  });

  it("should handle null individualId as non-member giving", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, 50, null, members);

    expect(summary.contribution.memberGiving.givingCount).toBe(0);
    expect(summary.contribution.memberGiving.nonGivingCount).toBe(1);
    expect(summary.contribution.nonMemberGiving).toBe(50);
  });

  it("should handle unknown individualId as non-member giving", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, 60, "unknown-person", members);

    expect(summary.contribution.memberGiving.givingCount).toBe(0);
    expect(summary.contribution.memberGiving.nonGivingCount).toBe(1);
    expect(summary.contribution.nonMemberGiving).toBe(60);
  });

  it("should accumulate multiple transactions", () => {
    const summary = createMockSummary();

    updateContribution(
      summary,
      createMockTransaction("Online"),
      100,
      "person-123",
      members,
    );
    updateContribution(
      summary,
      createMockTransaction("Cash"),
      50,
      "person-123",
      members,
    );
    updateContribution(
      summary,
      createMockTransaction("Check"),
      75,
      "person-456",
      members,
    );

    expect(summary.contribution.totalGiving).toBe(225);
    expect(summary.contribution.totalOnline).toBe(100);
    expect(summary.contribution.totalCash).toBe(50);
    expect(summary.contribution.totalCheck).toBe(75);
    expect(summary.contribution.memberGiving.givingCount).toBe(2); // Two from member person-123
    expect(summary.contribution.memberGiving.nonGivingCount).toBe(1); // One from non-member person-456
    expect(summary.contribution.nonMemberGiving).toBe(75);
  });

  it("should handle negative amounts (refunds)", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateContribution(summary, transaction, -100, "person-123", members);

    expect(summary.contribution.totalGiving).toBe(-100);
    expect(summary.contribution.totalOnline).toBe(-100);
    expect(summary.contribution.memberGiving.givingCount).toBe(1);
  });
});

describe("updateSpecialMissions", () => {
  function createMockSummary(): WeeklyGivingSummaryDoc {
    return {
      sundayDate: Timestamp.now(),
      contribution: {
        totalOnline: 0,
        totalCash: 0,
        totalCheck: 0,
        totalGiving: 0,
        memberGiving: {
          givingCount: 0,
          nonGivingCount: 0,
        },
        nonMemberGiving: 0,
        pledge: {
          total: 0,
          discrepancy: 0,
        },
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
      lastUpdated: Timestamp.now(),
      tenantId: "test-tenant",
    };
  }

  function createMockTransaction(
    paymentType: "Online" | "Cash" | "Check",
  ): TransactionDoc {
    return {
      transactionId: "txn-123",
      individualId: "person-123",
      name: "John Doe",
      fundName: "Missions",
      amount: 100,
      paymentType,
      createdOn: Timestamp.now(),
      givenOn: Timestamp.now(),
      sundayDate: "2023-06-15",
      note: "Test note",
      status: "completed",
      tenantId: "test-tenant",
    };
  }

  it("should update special missions fund", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Online");

    updateSpecialMissions(summary, transaction, 150);

    expect(summary.specialMissions.totalGiving).toBe(150);
    expect(summary.specialMissions.totalOnline).toBe(150);
    // Contribution should be untouched
    expect(summary.contribution.totalGiving).toBe(0);
  });

  it("should categorize Cash payments", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Cash");

    updateSpecialMissions(summary, transaction, 75);

    expect(summary.specialMissions.totalCash).toBe(75);
    expect(summary.specialMissions.totalOnline).toBe(0);
    expect(summary.specialMissions.totalCheck).toBe(0);
  });
});

describe("updateBenevolence", () => {
  function createMockSummary(): WeeklyGivingSummaryDoc {
    return {
      sundayDate: Timestamp.now(),
      contribution: {
        totalOnline: 0,
        totalCash: 0,
        totalCheck: 0,
        totalGiving: 0,
        memberGiving: {
          givingCount: 0,
          nonGivingCount: 0,
        },
        nonMemberGiving: 0,
        pledge: {
          total: 0,
          discrepancy: 0,
        },
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
      lastUpdated: Timestamp.now(),
      tenantId: "test-tenant",
    };
  }

  function createMockTransaction(
    paymentType: "Online" | "Cash" | "Check",
  ): TransactionDoc {
    return {
      transactionId: "txn-123",
      individualId: "person-123",
      name: "John Doe",
      fundName: "Benevolence",
      amount: 100,
      paymentType,
      createdOn: Timestamp.now(),
      givenOn: Timestamp.now(),
      sundayDate: "2023-06-15",
      note: "Test note",
      status: "completed",
      tenantId: "test-tenant",
    };
  }

  it("should update benevolence fund", () => {
    const summary = createMockSummary();
    const transaction = createMockTransaction("Check");

    updateBenevolence(summary, transaction, 200);

    expect(summary.benevolence.totalGiving).toBe(200);
    expect(summary.benevolence.totalCheck).toBe(200);
    // Other funds should be untouched
    expect(summary.contribution.totalGiving).toBe(0);
    expect(summary.specialMissions.totalGiving).toBe(0);
  });
});
