import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";
import { getEnvironment } from "../env.js";
import {
  MemberLookup,
  TransactionDoc,
  WeeklyGivingSummaryDoc,
} from "../types/giving.js";

export function createEmptySummary(
  date: string,
  tenantId: string,
): WeeklyGivingSummaryDoc {
  const env = getEnvironment();
  const now = DateTime.now();
  const expireAt = now.plus({ days: env.weeklyGivingSummaryTtlDays });

  const emptyFund = {
    totalOnline: 0,
    totalCash: 0,
    totalCheck: 0,
    totalGiving: 0,
  };

  return {
    contribution: {
      ...emptyFund,
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
      ...emptyFund,
      netGrowth: 0,
    },
    benevolence: {
      ...emptyFund,
      netGrowth: 0,
    },
    lastUpdated: Timestamp.now(),
    sundayDate: Timestamp.fromDate(DateTime.fromISO(date).toJSDate()),
    tenantId,
    expireAt: Timestamp.fromDate(expireAt.toJSDate()),
  };
}

export function updateFundGiving(
  fund: {
    totalOnline: number;
    totalCash: number;
    totalCheck: number;
    totalGiving: number;
  },
  transaction: TransactionDoc,
  amt: number,
) {
  fund.totalGiving += amt;
  if (transaction.paymentType === "Online") fund.totalOnline += amt;
  else if (transaction.paymentType === "Cash") fund.totalCash += amt;
  else if (transaction.paymentType === "Check") fund.totalCheck += amt;
}

export function updateContribution(
  summary: WeeklyGivingSummaryDoc,
  transaction: TransactionDoc,
  amt: number,
  individualId: string | null,
  members: MemberLookup,
) {
  updateFundGiving(summary.contribution, transaction, amt);

  if (individualId) {
    const memberInfo = Object.values(members).find(
      (m) => m.individualId === individualId,
    );
    if (memberInfo) {
      summary.contribution.memberGiving.givingCount += 1;
    } else {
      summary.contribution.memberGiving.nonGivingCount += 1;
      summary.contribution.nonMemberGiving += amt;
    }
  } else {
    summary.contribution.memberGiving.nonGivingCount += 1;
    summary.contribution.nonMemberGiving += amt;
  }
}

export function updateSpecialMissions(
  summary: WeeklyGivingSummaryDoc,
  transaction: TransactionDoc,
  amt: number,
) {
  updateFundGiving(summary.specialMissions, transaction, amt);
}

export function updateBenevolence(
  summary: WeeklyGivingSummaryDoc,
  transaction: TransactionDoc,
  amt: number,
) {
  updateFundGiving(summary.benevolence, transaction, amt);
}

export function calculatePledgeTotals(
  summary: WeeklyGivingSummaryDoc,
  members: MemberLookup,
): void {
  let totalPledge = 0;
  let membersWithPledge = 0;

  for (const member of Object.values(members)) {
    if (member.pledge && member.pledge > 0) {
      totalPledge += member.pledge;
      membersWithPledge++;
    }
  }

  summary.contribution.pledge.total = totalPledge;
  summary.contribution.pledge.discrepancy =
    totalPledge - summary.contribution.totalGiving;

  console.log(
    `   💰 Pledge: $${totalPledge.toFixed(2)} from ${membersWithPledge} members, ` +
      `Giving: $${summary.contribution.totalGiving.toFixed(2)}, ` +
      `Discrepancy: $${summary.contribution.pledge.discrepancy.toFixed(2)}`,
  );
}
