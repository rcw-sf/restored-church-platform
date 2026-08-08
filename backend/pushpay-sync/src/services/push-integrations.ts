// We import shared types (fallback to local if @repo/types is unavailable for now)
import type { MemberDoc } from "@repo/types";
import {
  createIndividual,
  updateIndividual,
  PushpayIndividualPayload,
} from "../clients/chms.js";
import {
  clearSheet,
  appendToAdditionsSheet,
  appendToMembershipListSheet,
  appendToTakeawaysSheet,
} from "../clients/google-sheets.js";
import { FirebaseAdmin } from "../config/firebase.js";
import { getEnvironment } from "../env.js";
import { parseIndividuals } from "../helpers/pushpay-parser.js";
import {
  AdditionSheetRow,
  MembershipSheetRow,
  TakeawaySheetRow,
} from "../types/google-sheets.js";
import { formatPushpayDate, formatSheetDate } from "../utils/date-utils.js";

export async function pushIntegrations(
  firebaseAdmin: FirebaseAdmin,
  target: "all" | "pushpay" | "sheets" = "all",
): Promise<void> {
  const env = getEnvironment();
  console.log(
    `Starting push integrations for tenant ${env.tenantId} with target: ${target}`,
  );

  if (target === "all" || target === "pushpay") {
    await pushAdditionsToPushpay(firebaseAdmin);
    await pushEditsToPushpay(firebaseAdmin);
  }

  if (target === "all" || target === "sheets") {
    await pushToGoogleSheets(firebaseAdmin);
  }
}

export async function pushAdditionsToPushpay(
  firebaseAdmin: FirebaseAdmin,
): Promise<void> {
  const env = getEnvironment();
  const db = firebaseAdmin.firestore();
  const additionsRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("additions");
  const membersRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("members");

  const snapshot = await additionsRef
    .where("syncedToPushpay", "==", false)
    .get();
  console.log(`Found ${snapshot.size} unsynced additions to push to PushPay.`);

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const payload: PushpayIndividualPayload = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      mobile_phone: data.phone,
      gender:
        data.gender === "Male"
          ? "m"
          : data.gender === "Female"
            ? "f"
            : undefined,
      birthday: formatPushpayDate(data.birthdate),
      membership_date: formatPushpayDate(data.membershipStartDate),
      udf_pulldown_6: data.region,
      udf_pulldown_5: data.ministry,
      udf_text_10: data.pledge ? String(data.pledge) : undefined,
      udf_text_9: data.bibleTalk,
      udf_date_6: formatPushpayDate(data.baptizedDate),
      udf_pulldown_2: data.superRegion,
      udf_pulldown_4: data.type,
      udf_text_7: data.pushpaySpouseCommunityMemberKey,
      udf_text_8: data.pushpayCommunityMemberKey,
      udf_text_11: data.movedTo,
      udf_text_12: data.reasonForFallaway,
    };

    try {
      const responseXml = await createIndividual(payload);

      // Parse the response to get the new PushPay ID
      const parsed = parseIndividuals(responseXml);
      console.log("Parsed from XML:", parsed);
      console.log("XML was:", responseXml);
      if (parsed.length > 0 && parsed[0].id) {
        const pushpayIndividualId = parsed[0].id;
        console.log(
          `Successfully created PushPay individual with ID: ${pushpayIndividualId}`,
        );

        // Link PushPay ID to the main Member document
        if (data.id) {
          await membersRef.doc(data.id).update({ pushpayIndividualId });
        }

        // Mark addition as synced
        await doc.ref.update({ syncedToPushpay: true });
      } else {
        console.warn(
          "Could not parse new PushPay ID from response",
          responseXml,
        );
      }
    } catch (error) {
      console.error(
        `Failed to create PushPay individual for addition ${doc.id}`,
        error,
      );
    }

    if (env.pushpayRateLimitMs) {
      await new Promise((r) => setTimeout(r, env.pushpayRateLimitMs));
    }
  }
}

export async function pushEditsToPushpay(
  firebaseAdmin: FirebaseAdmin,
): Promise<void> {
  const env = getEnvironment();
  const db = firebaseAdmin.firestore();

  const configRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("config")
    .doc("integrations");
  const configDoc = await configRef.get();

  let lastSyncRun = "";
  if (configDoc.exists) {
    lastSyncRun = configDoc.data()?.lastPushpaySync || "";
  }

  const membersRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("members");

  let query = membersRef.orderBy("updatedAt");
  if (lastSyncRun) {
    query = query.where("updatedAt", ">", lastSyncRun);
  }

  const snapshot = await query.get();
  const currentSyncTime = new Date().toISOString();

  let updateCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() as MemberDoc;

    // Only push if they already have a PushPay ID (otherwise they are an unsynced addition)
    if (data.pushpayIndividualId) {
      const payload: PushpayIndividualPayload = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile_phone: data.phone,
        gender:
          data.gender === "Male"
            ? "m"
            : data.gender === "Female"
              ? "f"
              : undefined,
        birthday: formatPushpayDate(data.birthdate),
        membership_date: formatPushpayDate(data.membershipStartDate),
        udf_pulldown_6: data.region,
        udf_pulldown_5: data.ministry,
        udf_text_10: data.pledge ? String(data.pledge) : undefined,
        udf_text_9: data.bibleTalk,
        udf_date_6: formatPushpayDate(data.baptizedDate),
        udf_pulldown_2: data.superRegion,
        udf_pulldown_4: data.type,
        udf_text_7: data.pushpaySpouseCommunityMemberKey,
        udf_text_8: data.pushpayCommunityMemberKey,
        udf_text_11: data.movedTo,
        udf_text_12: data.reasonForFallaway,
      };

      try {
        await updateIndividual(data.pushpayIndividualId, payload);
        updateCount++;
      } catch (error) {
        console.error(
          `Failed to update PushPay individual ${data.pushpayIndividualId}`,
          error,
        );
      }

      if (env.pushpayRateLimitMs) {
        await new Promise((r) => setTimeout(r, env.pushpayRateLimitMs));
      }
    }
  }

  console.log(`Pushed ${updateCount} edits to PushPay.`);

  // Update the last sync run timestamp
  await configRef.set({ lastPushpaySync: currentSyncTime }, { merge: true });
}

export async function pushToGoogleSheets(
  firebaseAdmin: FirebaseAdmin,
): Promise<void> {
  const env = getEnvironment();
  const db = firebaseAdmin.firestore();

  const additionsRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("additions");
  const membersRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("members");
  const takeawaysRef = db
    .collection("tenants")
    .doc(env.tenantId)
    .collection("takeaways");

  // Get all additions
  const additionsSnapshot = await additionsRef.get();

  const additionRows: AdditionSheetRow[] = additionsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      date: formatSheetDate(data.createdAt),
      type: data.type || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      gender: data.gender || "",
      region: data.region || "",
      ministry: data.ministry || "",
      bibleTalk: data.bibleTalk || "",
      weeklyPledge: data.pledge ? String(data.pledge) : "",
      phone: data.phone || "",
      email: data.email || "",
      physicalBirthday: data.birthdate || "",
      spiritualBirthday: data.baptizedDate || "",
      homeAddress: data.homeAddress || "",
      notes: data.notes || "",
    };
  });

  // Get all active members
  const membersSnapshot = await membersRef.get();

  const membershipRows: MembershipSheetRow[] = membersSnapshot.docs.map(
    (doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        gender: data.gender || "",
        region: data.region || "",
        ministry: data.ministry || "",
        bibleTalk: data.bibleTalk || "",
        weeklyPledge: data.pledge ? String(data.pledge) : "",
        phone: data.phone || "",
        email: data.email || "",
        physicalBirthday: data.birthdate || "",
        spiritualBirthday: data.baptizedDate || "",
        homeAddress: data.homeAddress || "",
        notes: data.notes || "",
      };
    },
  );

  // Get all takeaways
  const takeawaysSnapshot = await takeawaysRef.get();

  const takeawayRows: TakeawaySheetRow[] = takeawaysSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      date: formatSheetDate(data.createdAt),
      type: data.takeawayType || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      gender: data.gender || "",
      region: data.region || "",
      ministry: data.ministry || "",
      bibleTalk: data.bibleTalk || "",
      weeklyPledge: data.pledge ? String(data.pledge) : "",
      phone: data.phone || "",
      email: data.email || "",
      physicalBirthday: data.birthdate || "",
      spiritualBirthday: data.baptizedDate || "",
      homeAddress: data.homeAddress || "",
      movedTo: data.movedTo || "",
      notes: data.notes || "",
    };
  });

  try {
    await clearSheet("ADDITIONS");
    await appendToAdditionsSheet(additionRows);

    await clearSheet("MEMBERSHIP LIST");
    await appendToMembershipListSheet(membershipRows);

    await clearSheet("TAKEAWAYS");
    await appendToTakeawaysSheet(takeawayRows);
  } catch (error) {
    console.error("Failed to push to Google Sheets", error);
  }
}
