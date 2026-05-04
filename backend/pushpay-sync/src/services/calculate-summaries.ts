import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";
import { FirebaseAdmin } from "../config/firebase.js";
import { getEnvironment } from "../env.js";
import { TransactionDoc, WeeklyGivingSummaryDoc } from "../types/giving.js";
import { commitInChunks } from "../utils/firestore-batch.js";
import { SyncMonitor } from "../utils/sync-monitor.js";
import { loadMappingData } from "./member-loader.js";
import {
  createEmptySummary,
  updateContribution,
  updateSpecialMissions,
  updateBenevolence,
  calculatePledgeTotals,
} from "./summary-aggregation.js";

export async function calculateSummaries(
  firebaseAdmin: FirebaseAdmin,
  from?: DateTime,
  to?: DateTime,
) {
  const env = getEnvironment();

  // Default to Monday 12am to Sunday 11:59pm (or now if mid-week)
  const now = DateTime.now();
  const monday = now.startOf("week").set({ hour: 0, minute: 0, second: 0 });
  const sunday = now.endOf("week").set({ hour: 23, minute: 59, second: 59 });
  const effectiveFrom = from || monday;
  const effectiveTo = to || (now > sunday ? sunday : now);

  console.log(
    `📊 Calculating weekly summaries from ${effectiveFrom.toFormat("yyyy-MM-dd HH:mm")} to ${effectiveTo.toFormat("yyyy-MM-dd HH:mm")}`,
  );

  const monitor = new SyncMonitor(
    firebaseAdmin,
    "summaries",
    "weekly",
    {
      from: effectiveFrom.toFormat("yyyy-MM-dd"),
      to: effectiveTo.toFormat("yyyy-MM-dd"),
    },
    env.tenantId,
  );

  await monitor.start("manual");

  try {
    const db = firebaseAdmin.firestore();

    // Load member data
    console.log("📥 Loading member data from Firestore...");
    monitor.recordCacheMiss();
    const memberLookup = await loadMappingData(firebaseAdmin);
    monitor.recordFirestoreReads();

    // Query all transactions for summary calculation
    console.log("🔍 Querying transactions for summary calculation...");
    const allTransactionsQuery = await db
      .collection("tenants")
      .doc(env.tenantId)
      .collection("transactions")
      .where("createdOn", ">=", Timestamp.fromDate(effectiveFrom.toJSDate()))
      .where("createdOn", "<=", Timestamp.fromDate(effectiveTo.toJSDate()))
      .get();

    console.log(`📊 Found ${allTransactionsQuery.size} transactions`);

    const weeklyAggregates: Record<string, WeeklyGivingSummaryDoc> = {};
    const skippedTransactions = { failed: 0, unknownFund: 0 };

    // Process all transactions for weekly summaries
    console.log("🔄 Processing transactions by fund...");
    allTransactionsQuery.forEach((doc) => {
      const transaction = doc.data() as TransactionDoc;

      if (transaction.status === "failed") {
        skippedTransactions.failed++;
        return;
      }

      const effectiveAmount = transaction.amount;
      const sundayDate = transaction.sundayDate || "";

      if (!weeklyAggregates[sundayDate]) {
        weeklyAggregates[sundayDate] = createEmptySummary(
          sundayDate,
          env.tenantId,
        );
        console.log(`   📅 New week: ${sundayDate}`);
      }

      const summary = weeklyAggregates[sundayDate];

      // Route transaction to appropriate fund
      if (transaction.fundKey === env.contributionFundKey) {
        updateContribution(
          summary,
          transaction,
          effectiveAmount,
          transaction.individualId || "",
          memberLookup,
        );
      } else if (transaction.fundKey === env.specialMissionsFundKey) {
        updateSpecialMissions(summary, transaction, effectiveAmount);
      } else if (transaction.fundKey === env.benevolenceFundKey) {
        updateBenevolence(summary, transaction, effectiveAmount);
      } else {
        skippedTransactions.unknownFund++;
        console.warn(
          `   ⚠️  Unknown fund "${transaction.fundName}" for transaction ${transaction.transactionId}`,
        );
      }
    });

    if (skippedTransactions.failed > 0) {
      console.log(
        `   ❌ Skipped ${skippedTransactions.failed} failed transactions`,
      );
    }
    if (skippedTransactions.unknownFund > 0) {
      console.log(
        `   ⚠️  Skipped ${skippedTransactions.unknownFund} transactions with unknown funds`,
      );
    }

    console.log(
      `📈 Calculated summaries for ${Object.keys(weeklyAggregates).length} weeks`,
    );

    // Calculate net growth and pledge totals for each week
    console.log("📊 Calculating net growth and pledge totals...");
    for (const [date, summary] of Object.entries(weeklyAggregates)) {
      console.log(`\n   📅 Week of ${date}:`);
      console.log(
        `      💵 Contribution: $${summary.contribution.totalGiving.toFixed(2)} ` +
          `(Online: $${summary.contribution.totalOnline.toFixed(2)}, ` +
          `Cash: $${summary.contribution.totalCash.toFixed(2)}, ` +
          `Check: $${summary.contribution.totalCheck.toFixed(2)})`,
      );
      console.log(
        `      ✝️ Special Missions: $${summary.specialMissions.totalGiving.toFixed(2)}`,
      );
      console.log(
        `      🤝 Benevolence: $${summary.benevolence.totalGiving.toFixed(2)}`,
      );
      console.log(
        `      👥 Members: ${summary.contribution.memberGiving.givingCount} gave, ` +
          `${summary.contribution.memberGiving.nonGivingCount} didn't`,
      );

      // Calculate pledge totals
      calculatePledgeTotals(summary, memberLookup);

      // Calculate net growth
      const prevWeekDate = DateTime.fromISO(date)
        .minus({ weeks: 1 })
        .toFormat("yyyy-MM-dd");
      const prevWeekSummary = weeklyAggregates[prevWeekDate];

      if (prevWeekSummary) {
        summary.contribution.netGrowth =
          summary.contribution.totalGiving -
          prevWeekSummary.contribution.totalGiving;
        summary.specialMissions.netGrowth =
          summary.specialMissions.totalGiving -
          prevWeekSummary.specialMissions.totalGiving;
        summary.benevolence.netGrowth =
          summary.benevolence.totalGiving -
          prevWeekSummary.benevolence.totalGiving;

        console.log(
          `      📈 Net Growth: Contribution ${summary.contribution.netGrowth >= 0 ? "↑" : "↓"}$${Math.abs(summary.contribution.netGrowth).toFixed(2)}, ` +
            `Missions ${summary.specialMissions.netGrowth >= 0 ? "↑" : "↓"}$${Math.abs(summary.specialMissions.netGrowth).toFixed(2)}, ` +
            `Benevolence ${summary.benevolence.netGrowth >= 0 ? "↑" : "↓"}$${Math.abs(summary.benevolence.netGrowth).toFixed(2)}`,
        );
      } else {
        console.log("      📈 Net Growth: N/A (no previous week data)");
      }
    }

    // Write Weekly Summaries (replace entire document)
    console.log("💾 Writing weekly summaries...");
    commitInChunks(
      firebaseAdmin,
      Object.entries(weeklyAggregates),
      (batch, [date, data]) => {
        batch.set(
          db
            .collection("tenants")
            .doc(env.tenantId)
            .collection("weekly_giving_summary")
            .doc(date),
          {
            contribution: data.contribution,
            specialMissions: data.specialMissions,
            benevolence: data.benevolence,
            lastUpdated: Timestamp.now(),
            sundayDate: data.sundayDate,
            tenantId: data.tenantId,
            expireAt: data.expireAt,
          },
        );
      },
    );

    // Record final metrics
    monitor.recordTransactionsProcessed(allTransactionsQuery.size);
    const successfulTransactions = Array.from(allTransactionsQuery.docs).filter(
      (doc) => (doc.data() as TransactionDoc).status !== "failed",
    );
    monitor.recordAmountsProcessed(
      successfulTransactions.reduce(
        (sum, doc) => sum + (doc.data() as TransactionDoc).amount,
        0,
      ),
    );

    console.log(`\n✅ Summary calculation completed successfully!`);
    console.log(`📈 Processed ${allTransactionsQuery.size} total transactions`);
    console.log(`   • ${successfulTransactions.length} successful`);
    console.log(`   • ${skippedTransactions.failed} failed`);
    console.log(`   • ${skippedTransactions.unknownFund} unknown fund`);
    console.log(
      `� Total amount: $${successfulTransactions.reduce((sum, doc) => sum + (doc.data() as TransactionDoc).amount, 0).toFixed(2)}`,
    );
    console.log(
      `�📊 Created/updated ${Object.keys(weeklyAggregates).length} weekly summaries`,
    );

    await monitor.complete();
  } catch (error) {
    console.error("❌ Summary calculation failed:", error);
    await monitor.fail(error as Error);
    throw error;
  }
}
