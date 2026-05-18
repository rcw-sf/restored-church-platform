import { DateTime } from "luxon";
import { fetchPushpayGiving } from "../clients/giving.js";
import { FirebaseAdmin } from "../config/firebase.js";
import { getEnvironment } from "../env.js";
import { calculateSundayDate } from "../helpers/date-utils.js";
import { calculateEffectiveFromDate } from "../helpers/giving/dates.js";
import {
  loadExistingGivingRecords,
  writeTransactionsToFirestore,
  writeGivingRecords,
  markNonGivers,
} from "../helpers/giving/firestore.js";
import { loadMemberLookup } from "../helpers/giving/members.js";
import {
  processTransactions,
  processRefunds,
  logSyncStats,
} from "../helpers/giving/processing.js";
import { SyncMonitor } from "../utils/sync-monitor.js";

// Re-export functions for testing
export {
  calculateEffectiveFromDate,
  calculateGiftDate,
  calculateSundayRange,
} from "../helpers/giving/dates.js";

export { loadMemberLookup } from "../helpers/giving/members.js";

export {
  loadExistingGivingRecords,
  writeTransactionsToFirestore,
  writeGivingRecords,
  markNonGivers,
} from "../helpers/giving/firestore.js";

export {
  processTransactions,
  processMemberGiving,
  processNonMemberGiving,
  processRefunds,
  logSyncStats,
  buildTransactionDoc,
  type SyncStats,
  type GivingAggregates,
} from "../helpers/giving/processing.js";

/**
 * Main sync function - orchestrates all the individual steps
 */
export async function syncGiving(
  firebaseAdmin: FirebaseAdmin,
  from: DateTime,
  to: DateTime,
) {
  const env = getEnvironment();

  const lastSuccessfulSync = await SyncMonitor.getLastSuccessfulGivingSync(
    firebaseAdmin,
    env.tenantId,
  );

  const effectiveFrom = calculateEffectiveFromDate(from, lastSuccessfulSync);

  const monitor = new SyncMonitor(
    firebaseAdmin,
    "giving",
    env.syncType,
    {
      from: effectiveFrom.toFormat("yyyy-MM-dd"),
      to: to.toFormat("yyyy-MM-dd"),
    },
    env.tenantId,
  );

  const triggeredBy = process.env.GITHUB_ACTIONS ? "schedule" : "manual";
  await monitor.start(triggeredBy);

  try {
    const db = firebaseAdmin.firestore();

    monitor.recordPushpayApiCall();
    console.log(`🌐 Fetching transactions from Pushpay API...`);
    console.log(`   📅 From: ${effectiveFrom.toFormat("yyyy-MM-dd HH:mm")}`);
    console.log(`   📅 To: ${to.toFormat("yyyy-MM-dd HH:mm")}`);

    const transactions = await fetchPushpayGiving(effectiveFrom, to);

    console.log(`📊 Processing ${transactions.length} transactions`);
    if (transactions.length === 0) {
      console.log("⚠️  No transactions found in date range");
    }

    const memberLookup = await loadMemberLookup(firebaseAdmin, to, monitor);

    const { memberGivingAggregates, nonMemberGiving } =
      await loadExistingGivingRecords(
        db,
        env.tenantId,
        effectiveFrom,
        to,
        monitor,
      );

    console.log("🔄 Preparing member giving aggregates...");
    const aggregates = processTransactions(transactions, memberLookup, env, {
      memberGivingAggregates,
      nonMemberGiving,
    });

    processRefunds(
      aggregates.refunds,
      aggregates.memberGivingAggregates,
      aggregates.nonMemberGiving,
    );

    logSyncStats(
      aggregates.stats,
      transactions,
      aggregates.memberGivingAggregates,
      aggregates.nonMemberGiving,
    );

    writeTransactionsToFirestore(
      firebaseAdmin,
      aggregates.transactionDocs,
      env,
    );

    const targetSundayForNonGivers =
      calculateSundayDate(to).toFormat("yyyy-MM-dd");

    markNonGivers(
      memberLookup,
      aggregates.processedMemberIds,
      aggregates.familyGivingIds,
      targetSundayForNonGivers,
      env,
      aggregates.memberGivingAggregates,
    );

    writeGivingRecords(
      firebaseAdmin,
      aggregates.memberGivingAggregates,
      aggregates.nonMemberGiving,
      env,
    );

    monitor.recordTransactionsProcessed(transactions.length);
    monitor.recordAmountsProcessed(
      transactions.reduce((sum, t) => sum + Number(t.amount.amount), 0),
    );

    await monitor.complete();
  } catch (error) {
    await monitor.fail(error as Error);
    throw error;
  }
}
