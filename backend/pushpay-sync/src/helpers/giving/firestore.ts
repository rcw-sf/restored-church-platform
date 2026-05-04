import { DateTime } from "luxon";
import { FirebaseAdmin } from "../../config/firebase.js";
import { getEnvironment } from "../../env.js";
import {
  TransactionDoc,
  WeeklyMemberGivingDoc,
  WeeklyNonMemberGivingDoc,
  MemberLookup,
} from "../../types/giving.js";
import { commitInChunks } from "../../utils/firestore-batch.js";
import { SyncMonitor } from "../../utils/sync-monitor.js";
import { calculateSundayRange } from "./dates.js";

/**
 * Load existing weekly giving records from Firestore for idempotent re-runs
 */
export async function loadExistingGivingRecords(
  db: FirebaseFirestore.Firestore,
  tenantId: string,
  effectiveFrom: DateTime,
  to: DateTime,
  monitor: SyncMonitor,
): Promise<{
  memberGivingAggregates: WeeklyMemberGivingDoc[];
  nonMemberGiving: WeeklyNonMemberGivingDoc[];
}> {
  console.log("📥 Loading existing weekly giving records from Firestore...");
  const { startSunday, endSunday } = calculateSundayRange(effectiveFrom, to);

  const memberGivingQuery = await db
    .collection("tenants")
    .doc(tenantId)
    .collection("weekly_member_giving")
    .where("sundayDate", ">=", startSunday)
    .where("sundayDate", "<=", endSunday)
    .get();

  const memberGivingAggregates: WeeklyMemberGivingDoc[] =
    memberGivingQuery.docs.map((doc) => doc.data() as WeeklyMemberGivingDoc);

  const nonMemberQuery = await db
    .collection("tenants")
    .doc(tenantId)
    .collection("weekly_non_member_giving")
    .where("sundayDate", ">=", startSunday)
    .where("sundayDate", "<=", endSunday)
    .get();

  const nonMemberGiving: WeeklyNonMemberGivingDoc[] = nonMemberQuery.docs.map(
    (doc) => doc.data() as WeeklyNonMemberGivingDoc,
  );

  console.log(
    `   ✅ Loaded ${memberGivingAggregates.length} member and ${nonMemberGiving.length} non-member giving records`,
  );
  monitor.recordFirestoreReads();

  return { memberGivingAggregates, nonMemberGiving };
}

/**
 * Write transactions to Firestore
 */
export function writeTransactionsToFirestore(
  firebaseAdmin: FirebaseAdmin,
  transactionDocs: TransactionDoc[],
  env: ReturnType<typeof getEnvironment>,
): void {
  console.log(
    `\n💾 Writing ${transactionDocs.length} transactions to Firestore...`,
  );
  const db = firebaseAdmin.firestore();

  commitInChunks(firebaseAdmin, transactionDocs, (batch, doc) => {
    batch.set(
      db
        .collection("tenants")
        .doc(env.tenantId)
        .collection("transactions")
        .doc(doc.transactionId),
      doc,
      { merge: true },
    );
  });

  console.log(`✅ Wrote ${transactionDocs.length} transactions to Firestore`);
}

/**
 * Write member and non-member giving records to Firestore
 */
export function writeGivingRecords(
  firebaseAdmin: FirebaseAdmin,
  memberGivingAggregates: WeeklyMemberGivingDoc[],
  nonMemberGiving: WeeklyNonMemberGivingDoc[],
  env: ReturnType<typeof getEnvironment>,
): void {
  const db = firebaseAdmin.firestore();

  // Write Member Giving
  const givingCount = memberGivingAggregates.filter((m) => m.gave).length;
  const notGivingCount = memberGivingAggregates.filter((m) => !m.gave).length;
  console.log(
    `\n💾 Writing ${memberGivingAggregates.length} member giving records...`,
  );
  console.log(`   ✅ Gave: ${givingCount}`);
  console.log(`   ❌ Didn't give: ${notGivingCount}`);
  commitInChunks(firebaseAdmin, memberGivingAggregates, (batch, data) => {
    const docId = `${data.sundayDate}_${data.individualId}`;
    batch.set(
      db
        .collection("tenants")
        .doc(env.tenantId)
        .collection("weekly_member_giving")
        .doc(docId),
      data,
      { merge: true },
    );
  });

  // Write Non-Member Giving
  console.log(
    `\n💾 Writing ${nonMemberGiving.length} non-member giving records...`,
  );
  commitInChunks(firebaseAdmin, nonMemberGiving, (batch, data) => {
    const docId = `${data.sundayDate}_${data.individualId}`;
    batch.set(
      db
        .collection("tenants")
        .doc(env.tenantId)
        .collection("weekly_non_member_giving")
        .doc(docId),
      data,
      { merge: true },
    );
  });
}

/**
 * Mark members who didn't give during the sync period
 */
export function markNonGivers(
  memberLookup: MemberLookup,
  processedMemberIds: Set<string>,
  familyGivingIds: Set<string>,
  targetSundayForNonGivers: string,
  env: ReturnType<typeof getEnvironment>,
  memberGivingAggregates: WeeklyMemberGivingDoc[],
): void {
  Object.entries(memberLookup).forEach(([individualId, member]) => {
    if (processedMemberIds.has(individualId)) {
      return;
    }
    let gave = false;
    if (member?.familyId && familyGivingIds.has(member?.familyId)) {
      gave = true;
    }
    memberGivingAggregates.push({
      individualId,
      familyId: member?.familyId,
      sundayDate: targetSundayForNonGivers,
      name: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
      gave,
      pledge: member.pledge,
      region: member.region,
      ministry: member.ministry,
      tenantId: env.tenantId,
    });
  });
}
