import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";
import { parsePaymentType } from "../../clients/giving.js";
import { getEnvironment } from "../../env.js";
import { resolvePayerId } from "../../services/payer-resolution.js";
import {
  MemberLookup,
  PaymentDetail,
  TransactionDoc,
  TransactionStatus,
  WeeklyMemberGivingDoc,
  WeeklyNonMemberGivingDoc,
} from "../../types/giving.js";
import { MemberDoc } from "../../types/members.js";
import { PushpayTransaction } from "../../types/pushpay.js";
import { calculateSundayDate } from "../date-utils.js";
import { calculateGiftDate } from "./dates.js";

export interface SyncStats {
  memberTransactions: number;
  nonMemberTransactions: number;
  contributionFund: number;
  specialMissionsFund: number;
  benevolenceFund: number;
  otherFund: number;
}

export interface GivingAggregates {
  memberGivingAggregates: WeeklyMemberGivingDoc[];
  nonMemberGiving: WeeklyNonMemberGivingDoc[];
  transactionDocs: TransactionDoc[];
  familyGivingIds: Set<string>;
  processedMemberIds: Set<string>;
  stats: SyncStats;
  refunds: Array<{
    originalTransactionId: string;
    refundTransactionId: string;
    individualId: string | null;
    sundayDate: string;
  }>;
}

/**
 * Build a transaction document from a Pushpay transaction
 */
export function buildTransactionDoc(
  transaction: PushpayTransaction,
  individualId: string | null,
  givenDate: DateTime,
  sundayDate: string,
  env: ReturnType<typeof getEnvironment>,
): TransactionDoc {
  const paymentType = parsePaymentType(transaction.paymentMethodType);
  const note =
    transaction.fields?.find((f) => f.label.toLowerCase() === "memo")?.value ||
    transaction.notes ||
    undefined;
  const givingOnBehalfOf =
    transaction.fields?.find(
      (f) => f.label.toLowerCase() === "giving on behalf of:",
    )?.value || undefined;

  const now = DateTime.now();
  const expireAt = now.plus({ days: env.transactionTtlDays });
  const amount = Number(transaction.amount.amount) || 0;
  const refundedBy = transaction.refundedBy;

  return {
    transactionId: transaction.transactionId,
    individualId,
    name: transaction.payer.fullName,
    payer: transaction.payer,
    fundName: transaction.fund.name,
    fundKey: transaction.fund.key,
    amount,
    paymentType,
    createdOn: Timestamp.fromDate(
      DateTime.fromISO(transaction.createdOn).toJSDate(),
    ),
    givenOn: Timestamp.fromDate(givenDate.toJSDate()),
    sundayDate,
    status: transaction.status.toLowerCase() as TransactionStatus,
    tenantId: env.tenantId,
    expireAt: Timestamp.fromDate(expireAt.toJSDate()),
    externalLinks: transaction.externalLinks,
    ...(refundedBy && { refundedBy }),
    ...(note && { note }),
    ...(givingOnBehalfOf && { givingOnBehalfOf }),
  };
}

/**
 * Process member giving - add payment to existing record or create new one
 */
export function processMemberGiving(
  member: MemberDoc,
  individualId: string | null,
  sundayDate: string,
  amount: number,
  payment: PaymentDetail,
  expireAt: DateTime,
  env: ReturnType<typeof getEnvironment>,
  memberGivingAggregates: WeeklyMemberGivingDoc[],
): void {
  const existingRecord = memberGivingAggregates.find(
    (m) => m.individualId === individualId && m.sundayDate === sundayDate,
  );

  if (existingRecord) {
    // Add payment if not already present
    if (
      !existingRecord.payments?.find(
        (p) => p.transactionId === payment.transactionId,
      )
    ) {
      existingRecord.payments = [...(existingRecord.payments || []), payment];
    }
    // Recalculate total from all payments
    existingRecord.totalAmount =
      existingRecord.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  } else {
    memberGivingAggregates.push({
      individualId: individualId || "",
      familyId: member?.familyId,
      sundayDate,
      name: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
      totalAmount: amount,
      gave: true,
      pledge: member.pledge,
      region: member.region,
      ministry: member.ministry,
      tenantId: env.tenantId,
      payments: [payment],
      expireAt: Timestamp.fromDate(expireAt.toJSDate()),
    });
  }
}

/**
 * Process non-member giving - add payment to existing record or create new one
 */
export function processNonMemberGiving(
  individualId: string | null,
  sundayDate: string,
  payerName: string,
  amount: number,
  payment: PaymentDetail,
  expireAt: DateTime,
  env: ReturnType<typeof getEnvironment>,
  nonMemberGiving: WeeklyNonMemberGivingDoc[],
): void {
  const existingNonMember = nonMemberGiving.find(
    (n) =>
      n.individualId === (individualId || "") && n.sundayDate === sundayDate,
  );

  if (existingNonMember) {
    existingNonMember.totalAmount =
      (existingNonMember.totalAmount || 0) + amount;
    if (
      !existingNonMember.payments?.find(
        (p) => p.transactionId === payment.transactionId,
      )
    ) {
      existingNonMember.payments = [
        ...(existingNonMember.payments || []),
        payment,
      ];
    }
  } else {
    nonMemberGiving.push({
      sundayDate,
      individualId: individualId || "",
      name: payerName,
      totalAmount: amount,
      tenantId: env.tenantId,
      payments: [payment],
      expireAt: Timestamp.fromDate(expireAt.toJSDate()),
    });
  }
}

/**
 * Process all transactions and build aggregates
 */
export function processTransactions(
  transactions: PushpayTransaction[],
  memberLookup: MemberLookup,
  env: ReturnType<typeof getEnvironment>,
  initialAggregates: {
    memberGivingAggregates: WeeklyMemberGivingDoc[];
    nonMemberGiving: WeeklyNonMemberGivingDoc[];
  },
): GivingAggregates {
  const transactionDocs: TransactionDoc[] = [];
  const familyGivingIds = new Set<string>();
  const processedMemberIds = new Set<string>();

  const stats: SyncStats = {
    memberTransactions: 0,
    nonMemberTransactions: 0,
    contributionFund: 0,
    specialMissionsFund: 0,
    benevolenceFund: 0,
    otherFund: 0,
  };

  const refunds: Array<{
    originalTransactionId: string;
    refundTransactionId: string;
    individualId: string | null;
    sundayDate: string;
  }> = [];

  const { memberGivingAggregates, nonMemberGiving } = initialAggregates;
  const now = DateTime.now();

  for (const transaction of transactions) {
    if (transaction.status === "Failed") {
      continue;
    }

    const { transactionId, givenOn, createdOn, payer } = transaction;

    const individualId = resolvePayerId(transaction, memberLookup);
    const givenDate = calculateGiftDate(givenOn, createdOn);
    const sundayDate = calculateSundayDate(givenDate).toFormat("yyyy-MM-dd");
    const amount = Number(transaction.amount.amount) || 0;

    const expireAt = now.plus({ days: env.transactionTtlDays });

    // Build transaction document
    const transactionDoc = buildTransactionDoc(
      transaction,
      individualId,
      givenDate,
      sundayDate,
      env,
    );
    transactionDocs.push(transactionDoc);

    // Handle refund transactions
    if (transaction.refundedBy?.transactionId) {
      refunds.push({
        originalTransactionId: transaction.refundedBy.transactionId,
        refundTransactionId: transaction.transactionId,
        individualId,
        sundayDate,
      });
      continue;
    }

    // Track fund stats
    if (transaction.fund.key === env.contributionFundKey) {
      stats.contributionFund++;
    } else if (transaction.fund.key === env.specialMissionsFundKey) {
      stats.specialMissionsFund++;
    } else if (transaction.fund.key === env.benevolenceFundKey) {
      stats.benevolenceFund++;
    } else {
      stats.otherFund++;
    }

    // Process member and non-member giving
    const member = memberLookup[individualId || ""];

    const payment: PaymentDetail = {
      transactionId,
      amount,
      paymentType: parsePaymentType(transaction.paymentMethodType),
      status: transaction.status.toLowerCase() as TransactionStatus,
      date: givenDate.toJSDate().toISOString(),
      ...(transactionDoc.note && { note: transactionDoc.note }),
    };

    if (member) {
      stats.memberTransactions++;
      if (member?.familyId) {
        familyGivingIds.add(member?.familyId);
      }

      processMemberGiving(
        member,
        individualId,
        sundayDate,
        amount,
        payment,
        expireAt,
        env,
        memberGivingAggregates,
      );

      processedMemberIds.add(individualId || "");
    } else {
      stats.nonMemberTransactions++;
      processNonMemberGiving(
        individualId,
        sundayDate,
        payer.fullName || "",
        amount,
        payment,
        expireAt,
        env,
        nonMemberGiving,
      );
    }
  }

  return {
    memberGivingAggregates,
    nonMemberGiving,
    transactionDocs,
    familyGivingIds,
    processedMemberIds,
    stats,
    refunds,
  };
}

/**
 * Process refunds - remove original transaction payments from giving records
 */
export function processRefunds(
  refunds: Array<{
    originalTransactionId: string;
    refundTransactionId: string;
    individualId: string | null;
    sundayDate: string;
  }>,
  memberGivingAggregates: WeeklyMemberGivingDoc[],
  nonMemberGiving: WeeklyNonMemberGivingDoc[],
): void {
  if (refunds.length === 0) return;

  console.log(`\n🔄 Processing ${refunds.length} refunds...`);
  for (const refund of refunds) {
    const { originalTransactionId, individualId, sundayDate } = refund;

    // Try to find in member giving first
    const memberRecord = memberGivingAggregates.find(
      (m) => m.individualId === individualId && m.sundayDate === sundayDate,
    );

    if (memberRecord?.payments) {
      const originalPaymentIndex = memberRecord.payments.findIndex(
        (p) => p.transactionId === originalTransactionId,
      );

      if (originalPaymentIndex !== -1) {
        const removedPayment = memberRecord.payments.splice(
          originalPaymentIndex,
          1,
        )[0];
        memberRecord.totalAmount =
          memberRecord.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
        console.log(
          `   💸 Removed refunded payment ${originalTransactionId} ($${removedPayment.amount}) from member ${individualId}`,
        );
        if (memberRecord.payments.length === 0) {
          memberRecord.gave = false;
        }
        continue;
      }
    }

    // Try to find in non-member giving
    const nonMemberRecord = nonMemberGiving.find(
      (n) =>
        n.individualId === (individualId || "") && n.sundayDate === sundayDate,
    );

    if (nonMemberRecord?.payments) {
      const originalPaymentIndex = nonMemberRecord.payments.findIndex(
        (p) => p.transactionId === originalTransactionId,
      );

      if (originalPaymentIndex !== -1) {
        const removedPayment = nonMemberRecord.payments.splice(
          originalPaymentIndex,
          1,
        )[0];
        nonMemberRecord.totalAmount =
          nonMemberRecord.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
        console.log(
          `   💸 Removed refunded payment ${originalTransactionId} ($${removedPayment.amount}) from non-member ${individualId || "unknown"}`,
        );
        continue;
      }
    }

    console.log(
      `   ⚠️  Could not find original payment ${originalTransactionId} for refund (may be from a previous sync period)`,
    );
  }
}

/**
 * Log sync statistics
 */
export function logSyncStats(
  stats: SyncStats,
  transactions: PushpayTransaction[],
  memberGivingAggregates: WeeklyMemberGivingDoc[],
  nonMemberGiving: WeeklyNonMemberGivingDoc[],
): void {
  console.log(`\n📈 Transaction breakdown:`);
  console.log(`   👥 Member transactions: ${stats.memberTransactions}`);
  console.log(`   👤 Non-member transactions: ${stats.nonMemberTransactions}`);
  console.log(`   💵 Contribution fund: ${stats.contributionFund}`);
  console.log(`   ✝️ Special Missions fund: ${stats.specialMissionsFund}`);
  console.log(`   🤝 Benevolence fund: ${stats.benevolenceFund}`);
  if (stats.otherFund > 0) {
    console.log(`   ⚠️  Other funds: ${stats.otherFund}`);
  }

  const totalAmount = transactions.reduce(
    (sum, t) => sum + Number(t.amount.amount),
    0,
  );

  console.log(`\n✅ Sync completed successfully!`);
  console.log(`📊 Processed ${transactions.length} transactions`);
  console.log(`   👥 Member: ${stats.memberTransactions}`);
  console.log(`   👤 Non-member: ${stats.nonMemberTransactions}`);
  console.log(`💰 Total amount: $${totalAmount.toFixed(2)}`);
  console.log(`📋 Member records: ${memberGivingAggregates.length}`);
  console.log(`👤 Non-member records: ${nonMemberGiving.length}`);
}
