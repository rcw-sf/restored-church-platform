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
import {
  MemberDoc,
  MemberStatisticsDoc,
  RegionStats,
} from "../types/members.js";
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
  const { pushpayRateLimitMs, syncType, tenantId } = getEnvironment();
  const monitor = new SyncMonitor(
    firebaseAdmin,
    "member",
    undefined,
    undefined,
    tenantId,
  );

  const triggeredBy = process.env.GITHUB_ACTIONS ? "schedule" : "manual";
  await monitor.start(triggeredBy);

  console.log(
    `🔄 Starting ${syncType} sync with ${pushpayRateLimitMs}ms rate limit`,
  );

  try {
    const result = await processGroup(
      firebaseAdmin,
      2,
      undefined,
      monitor,
      syncType,
    );

    await sleep(pushpayRateLimitMs);

    // Collect all takeaway members to delete
    const membersToDelete: PushpayIndividual[] = [];

    const fallaways = await processGroup(
      firebaseAdmin,
      40,
      "Fallaway",
      monitor,
      syncType,
    );
    membersToDelete.push(...fallaways.individuals);

    await sleep(pushpayRateLimitMs);

    const walkaways = await processGroup(
      firebaseAdmin,
      41,
      "Walkaway",
      monitor,
      syncType,
    );
    membersToDelete.push(...walkaways.individuals);

    await sleep(pushpayRateLimitMs);

    const transfers = await processGroup(
      firebaseAdmin,
      42,
      "Transfer",
      monitor,
      syncType,
    );
    membersToDelete.push(...transfers.individuals);

    await sleep(pushpayRateLimitMs);

    const glory = await processGroup(
      firebaseAdmin,
      43,
      "Glory",
      monitor,
      syncType,
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

    // Calculate and store member statistics
    await saveMemberStatistics(firebaseAdmin, result.memberDocs, monitor);

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

  const membersRef = firebaseAdmin
    .firestore()
    .collection("tenants")
    .doc(env.tenantId)
    .collection("members");

  const existingMembersSnapshot = await membersRef.get();
  const membersByPushpayId = new Map<string, string>();

  existingMembersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.pushpayIndividualId) {
      membersByPushpayId.set(data.pushpayIndividualId, doc.id);
    }
  });

  const itemsToDelete: { id: string }[] = [];
  for (const individual of individuals) {
    const firestoreDocId = membersByPushpayId.get(individual.id);
    if (firestoreDocId) {
      itemsToDelete.push({ id: firestoreDocId });
    }
  }

  if (itemsToDelete.length === 0) {
    console.log("ℹ️ No matched members to delete in Firestore.");
    return;
  }

  await commitInChunks(firebaseAdmin, itemsToDelete, (batch, item) => {
    const ref = membersRef.doc(item.id);
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

  console.log("Fetching existing members for Safe Auto-Match...");
  const membersRef = firebaseAdmin
    .firestore()
    .collection("tenants")
    .doc(env.tenantId)
    .collection("members");
  const existingMembersSnapshot = await membersRef.get();

  const membersByPushpayId = new Map<string, string>();
  const membersByMatchKey = new Map<string, string>();

  existingMembersSnapshot.forEach((docSnap) => {
    const data = docSnap.data() as MemberDoc;
    if (data.pushpayIndividualId) {
      membersByPushpayId.set(data.pushpayIndividualId, docSnap.id);
    }
    if (data.email && data.firstName && data.lastName) {
      const matchKey = `${data.email.toLowerCase().trim()}|${data.firstName.toLowerCase().trim()}|${data.lastName.toLowerCase().trim()}`;
      membersByMatchKey.set(matchKey, docSnap.id);
    }
  });
  console.log(
    `Loaded ${existingMembersSnapshot.size} existing members for matching.`,
  );

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

    const pushpayCommunityMemberKey = getTextFromFields(
      textFields,
      "Pushpay Community Member Key",
    );
    const pushpaySpouseCommunityMemberKey = getTextFromFields(
      textFields,
      "Pushpay Spouse Community Member Key",
    );

    let firestoreDocId = membersByPushpayId.get(individual.id);

    if (
      !firestoreDocId &&
      individual.email &&
      individual.first_name &&
      individual.last_name
    ) {
      const matchKey = `${individual.email.toLowerCase().trim()}|${individual.first_name.toLowerCase().trim()}|${individual.last_name.toLowerCase().trim()}`;
      firestoreDocId = membersByMatchKey.get(matchKey);
      if (firestoreDocId) {
        console.log(
          `Safe Auto-Match successful for ${individual.first_name} ${individual.last_name} (${individual.email})`,
        );
      }
    }

    if (!firestoreDocId) {
      firestoreDocId = membersRef.doc().id;
    }

    const doc: MemberDoc = {
      pushpayIndividualId: individual.id,
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
            pushpayIndividualId: individuals[0]?.id,
            fullName: extractTextValue(individuals[0]),
            familyPosition: m.family_position,
          };
        }),
      createdAt: parseDateToISO(individual.created),
      modifiedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      tenantId: env.tenantId,
      ...(pushpayCommunityMemberKey && {
        pushpayCommunityMemberKey,
      }),
      ...(pushpaySpouseCommunityMemberKey && {
        pushpaySpouseCommunityMemberKey,
      }),
    };

    docs.push({ id: firestoreDocId, data: doc });
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
      // Add to lookup with pushpayIndividualId
      memberLookup[memberDoc.pushpayIndividualId] = memberDoc;

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

export async function saveMemberStatistics(
  firebaseAdmin: FirebaseAdmin,
  memberDocs: MemberDoc[],
  monitor?: SyncMonitor,
) {
  const env = getEnvironment();
  const db = firebaseAdmin.firestore();

  try {
    console.log("📊 Calculating member statistics...");

    // Calculate pledge statistics
    const totalPledge = memberDocs.reduce((sum, m) => sum + (m.pledge || 0), 0);
    const memberCount = memberDocs.length;
    const membersWithPledge = memberDocs.filter(
      (m) => (m.pledge || 0) > 0,
    ).length;
    const averagePledge =
      membersWithPledge > 0 ? totalPledge / membersWithPledge : 0;

    // Group by region
    const regionStats: Record<string, RegionStats> = {};
    for (const member of memberDocs) {
      const region = member.region || "";
      if (!regionStats[region]) {
        regionStats[region] = { count: 0, totalPledge: 0 };
      }
      regionStats[region].count++;
      regionStats[region].totalPledge += member.pledge || 0;
    }

    const statistics: MemberStatisticsDoc = {
      totalPledge,
      memberCount,
      membersWithPledge,
      averagePledge,
      regionBreakdown: regionStats,
      calculatedAt: admin.firestore.Timestamp.now(),
      tenantId: env.tenantId,
    };

    // Save to member_statistics collection
    await db
      .collection("tenants")
      .doc(env.tenantId)
      .collection("member_statistics")
      .doc("current")
      .set(statistics);

    if (monitor) {
      monitor.recordFirestoreWrites(1);
    }

    console.log(
      `✅ Saved member statistics: ${memberCount} members, $${totalPledge} total pledge`,
    );
  } catch (error) {
    console.warn("⚠️ Failed to save member statistics:", error);
  }
}
