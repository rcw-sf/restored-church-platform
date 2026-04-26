import admin from "firebase-admin";
import { fetchPushpayChms } from "../clients/chms.js";
import { FirebaseAdmin } from "../config/firebase.js";
import { getEnvironment } from "../env.js";
import { parseIndividuals } from "../helpers/pushpay-parser.js";
import {
  extractXmlArray,
  normalizeArray,
  getTextFromFields,
  getSelectFromFields,
  getSuperRegion,
  getNormalizedRegion,
  extractTextValue,
} from "../helpers/xml-field-extractors.js";
import { MemberLookup } from "../types/giving.js";
import { MemberDoc } from "../types/members.js";
import {
  PushpayIndividual,
  PushpayTextField,
  PushpayPulldownField,
} from "../types/pushpay.js";
import { saveMemberDataToCache } from "../utils/cache.js";
import { parseDateToISO } from "../utils/date-utils.js";
import { commitInChunks } from "../utils/firestore-batch.js";
import { saveMemberDataToGitHubCache } from "../utils/github-cache.js";
import { sleep } from "../utils/sleep.js";
import { SyncMonitor } from "../utils/sync-monitor.js";

export async function syncMembers(firebaseAdmin: FirebaseAdmin) {
  const env = getEnvironment();
  const monitor = new SyncMonitor(
    firebaseAdmin,
    "member",
    undefined,
    undefined,
    env.tenantId,
  );

  const triggeredBy = process.env.GITHUB_ACTIONS ? "schedule" : "manual";
  await monitor.start(triggeredBy);

  // Configurable rate limit delay (milliseconds between API calls)
  const RATE_LIMIT_MS = parseInt(
    process.env.PUSHPAY_RATE_LIMIT_MS || "6000",
    10,
  );

  // Sync type: 'all' (sync everyone) or 'only-modified' (default - last 24h only)
  const SYNC_TYPE = process.env.SYNC_TYPE || "only-modified";

  console.log(
    `🔄 Starting ${SYNC_TYPE} sync with ${RATE_LIMIT_MS}ms rate limit`,
  );

  try {
    const result = await processGroup(
      firebaseAdmin,
      2,
      undefined,
      monitor,
      SYNC_TYPE,
    );

    await sleep(RATE_LIMIT_MS);

    // Collect all takeaway members to delete
    const membersToDelete: PushpayIndividual[] = [];

    const fallaways = await processGroup(
      firebaseAdmin,
      40,
      "Fallaway",
      monitor,
      SYNC_TYPE,
    );
    membersToDelete.push(...fallaways.individuals);

    await sleep(RATE_LIMIT_MS);

    const walkaways = await processGroup(
      firebaseAdmin,
      41,
      "Walkaway",
      monitor,
      SYNC_TYPE,
    );
    membersToDelete.push(...walkaways.individuals);

    await sleep(RATE_LIMIT_MS);

    const transfers = await processGroup(
      firebaseAdmin,
      42,
      "Transfer",
      monitor,
      SYNC_TYPE,
    );
    membersToDelete.push(...transfers.individuals);

    await sleep(RATE_LIMIT_MS);

    const glory = await processGroup(
      firebaseAdmin,
      43,
      "Glory",
      monitor,
      SYNC_TYPE,
    );
    membersToDelete.push(...glory.individuals);

    // Delete all takeaway members at once
    await deleteMembers(firebaseAdmin, membersToDelete, monitor);

    // Update cache after member sync completes using existing MemberDoc objects
    await updateMemberCache(result.memberDocs);

    // Record metrics - include both active members processed and takeaway members deleted
    const totalMembersAffected =
      result.memberDocs.length + membersToDelete.length;
    monitor.recordMembersProcessed(totalMembersAffected);

    await monitor.complete();
  } catch (error) {
    await monitor.fail(error as Error);
    throw error;
  }
}

async function deleteMembers(
  firebaseAdmin: FirebaseAdmin,
  individuals: PushpayIndividual[],
  monitor: SyncMonitor,
) {
  const env = getEnvironment();

  if (individuals.length === 0) {
    console.log("ℹ️ No members to delete");
    return;
  }

  console.log(`🗑️ Deleting ${individuals.length} members from Firestore...`);

  const itemsToDelete = individuals.map((individual) => ({
    id: individual.id,
  }));

  await commitInChunks(firebaseAdmin, itemsToDelete, (batch, item) => {
    const ref = firebaseAdmin
      .firestore()
      .collection("tenants")
      .doc(env.tenantId)
      .collection("members")
      .doc(item.id);
    batch.delete(ref);
  });

  monitor.recordFirestoreWrites(individuals.length);
  console.log(`✅ Deleted ${individuals.length} members`);
}

export async function processGroup(
  firebaseAdmin: FirebaseAdmin,
  id: number,
  takeawayType?: string,
  monitor?: SyncMonitor,
  syncType?: string,
): Promise<{ individuals: PushpayIndividual[]; memberDocs: MemberDoc[] }> {
  const response = await fetchPushpayChms(id);
  const individuals = parseIndividuals(response);

  const result = await processIndividuals(
    firebaseAdmin,
    individuals,
    takeawayType,
    monitor,
    syncType,
  );

  return { individuals, memberDocs: result.memberDocs };
}

export async function processIndividuals(
  firebaseAdmin: FirebaseAdmin,
  individuals: PushpayIndividual[],
  takeawayType?: string,
  monitor?: SyncMonitor,
  syncType?: string,
): Promise<{
  docs: { id: string; data: MemberDoc }[];
  memberDocs: MemberDoc[];
  changedCount: number;
  filteredCount: number;
}> {
  const env = getEnvironment();
  let totalPledgeAmount = 0;

  const docs: { id: string; data: MemberDoc }[] = [];
  const memberDocs: MemberDoc[] = [];

  // Filter based on sync type (unless it's a takeaway sync)
  let filteredIndividuals = individuals;
  let filteredCount = 0;

  if (!takeawayType && syncType === "only-modified") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    filteredIndividuals = individuals.filter((individual) => {
      const modifiedDate = individual.modified
        ? new Date(individual.modified)
        : null;
      const createdDate = individual.created
        ? new Date(individual.created)
        : null;

      // Include if modified in last 24h OR created in last 24h
      const wasModifiedRecently = modifiedDate && modifiedDate >= yesterday;
      const wasCreatedRecently = createdDate && createdDate >= yesterday;

      return wasModifiedRecently || wasCreatedRecently;
    });

    filteredCount = individuals.length - filteredIndividuals.length;
    console.log(
      `Daily sync: ${filteredIndividuals.length} members changed in last 24h, ${filteredCount} filtered out`,
    );
  } else if (!takeawayType && syncType === "all") {
    console.log(`Full sync: processing all ${individuals.length} members`);
  }

  let changedCount = 0;

  for (const individual of filteredIndividuals) {
    // Normalize XML arrays (parser returns single object instead of array for one element)
    // Use extractXmlArray to handle cases where parent is empty string ""
    const textFields = extractXmlArray<PushpayTextField>(
      individual.user_defined_text_fields,
      "user_defined_text_field",
    );
    const pulldownFields = extractXmlArray<PushpayPulldownField>(
      individual.user_defined_pulldown_fields,
      "user_defined_pulldown_field",
    );

    const pledge = Number(getTextFromFields(textFields, "Pledge") || 0);
    totalPledgeAmount += pledge;

    const region = getNormalizedRegion(
      getSelectFromFields(pulldownFields, "Region"),
    );
    const superRegion = getSuperRegion(region);

    changedCount++;
    const modifiedAt = parseDateToISO(individual.modified);

    const doc: MemberDoc = {
      individualId: individual.id,
      firstName: individual.first_name,
      lastName: individual.last_name,
      gender: individual.gender,
      region,
      superRegion,
      ministry: getSelectFromFields(pulldownFields, "Ministry"),
      pledge,
      phone: extractTextValue(normalizeArray(individual.phones?.phone)[0]),
      email: individual.email,
      birthdate: individual.birthday,
      type: getSelectFromFields(
        pulldownFields,
        "Type (PM, Restoration, Baptism or Mission Team)",
      ),
      membershipStartDate: individual.membership_date,
      familyId: individual.family?.id,
      familyPosition: individual.family_position,
      familyMembers: normalizeArray(individual.family_members?.family_member)
        .filter((m) => normalizeArray(m.individual)[0]?.id)
        .map((m) => {
          const individuals = normalizeArray(m.individual);
          return {
            individualId: individuals[0]?.id,
            fullName: extractTextValue(individuals[0]),
            familyPosition: m.family_position,
          };
        }),
      createdAt: parseDateToISO(individual.created),
      modifiedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      tenantId: env.tenantId,
    };

    docs.push({ id: individual.id, data: doc });
    memberDocs.push(doc);
  }

  if (docs.length === 0) {
    console.log("No members found");
    return { docs: [], memberDocs: [], changedCount: 0, filteredCount };
  }

  console.log(`Processing ${docs.length} members changed in last 24h`);

  if (takeawayType) {
    console.log(`Processing ${takeawayType} members...`);

    // TODO: Push takeaways to own collection
    return { docs, memberDocs, changedCount, filteredCount };
  }

  // 🔥 CHUNKED FIRESTORE WRITE (SAFE)
  await commitInChunks(firebaseAdmin, docs, (batch, item) => {
    try {
      batch.set(
        firebaseAdmin
          .firestore()
          .collection("tenants")
          .doc(env.tenantId)
          .collection("members")
          .doc(item.id),
        item.data,
        {
          merge: true,
        },
      );
    } catch (err) {
      console.error("Error:", err);
    }
  });

  // Record Firestore writes for metrics
  if (monitor) {
    monitor.recordFirestoreWrites(docs.length);
  }

  console.log("Total pledge:", totalPledgeAmount);

  return { docs, memberDocs, changedCount, filteredCount };
}

async function updateMemberCache(memberDocs: MemberDoc[]) {
  try {
    console.log("🔄 Updating member cache after sync...");

    // Create member lookup from existing MemberDoc objects (no Firestore read!)
    const memberLookup: MemberLookup = {};

    for (const memberDoc of memberDocs) {
      // Add to lookup with individualId
      memberLookup[memberDoc.individualId] = memberDoc;

      // Add pushpay keys if they exist in the member data
      if (memberDoc.pushpayCommunityMemberKey) {
        memberLookup[memberDoc.pushpayCommunityMemberKey] = memberDoc;
      }
      if (memberDoc.pushpaySpouseCommunityMemberKey) {
        memberLookup[memberDoc.pushpaySpouseCommunityMemberKey] = memberDoc;
      }
    }

    // Save to both cache systems
    const today = new Date().toISOString().split("T")[0];
    saveMemberDataToCache(memberLookup, today);
    saveMemberDataToGitHubCache(memberLookup, today);

    console.log(
      `✅ Updated cache with ${Object.keys(memberLookup).length} members (no Firestore reads!)`,
    );
  } catch (error) {
    console.warn("⚠️ Failed to update member cache:", error);
  }
}
