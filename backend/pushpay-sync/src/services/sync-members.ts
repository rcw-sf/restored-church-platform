import admin from "firebase-admin";
import { fetchPushpayChms } from "../clients/pushpay.js";
import { FirebaseAdmin } from "../config/firebase.js";
import { parseIndividuals } from "../helpers/pushpay-parser.js";
import { MemberDoc } from "../types/members.js";
import { PushpayIndividual } from "../types/pushpay.js";
import { commitInChunks } from "../utils/firestore-batch.js";

// import { sleep } from "../utils/sleep";

export async function syncMembers(firebaseAdmin: FirebaseAdmin) {
  await processGroup(firebaseAdmin, 2, true);
  // await sleep(6000)

  // await processGroup(3, false, 'Fallaway')
  // await sleep(6000)

  // await processGroup(4, false, 'Moveaway')
}

export async function processGroup(
  firebaseAdmin: FirebaseAdmin,
  id: number,
  isMember: boolean,
  takeawayType?: string,
) {
  const response = await fetchPushpayChms(id);
  const individuals = parseIndividuals(response);

  await processIndividuals(firebaseAdmin, individuals, isMember, takeawayType);

  return individuals.length;
}

export async function processIndividuals(
  firebaseAdmin: FirebaseAdmin,
  individuals: PushpayIndividual[],
  isMember: boolean,
  takeawayType?: string,
) {
  let totalPledgeAmount = 0;

  const docs: { id: string; data: MemberDoc }[] = [];

  for (const individual of individuals) {
    const textFields =
      individual.user_defined_text_fields?.user_defined_text_field ?? [];
    const pulldownFields =
      individual.user_defined_pulldown_fields?.user_defined_pulldown_field ??
      [];

    const getText = (label: string) =>
      textFields.find((f) => f.label === label)?.text["#text"];

    const getSelect = (label: string) =>
      pulldownFields.find((f) => f.label === label)?.selection["#text"];

    const pledge = Number(getText("Pledge") || 0);
    if (isMember) totalPledgeAmount += pledge;

    const region = getSelect("Region");
    let superRegion = "";

    switch (region) {
      case "San Mateo":
      case "San Francisco":
        superRegion = "Peninsula";
        break;
      case "Silicon Valley":
      case "San Jose":
        superRegion = "South Bay";
        break;
      case "Berkeley":
      case "Contra Costa":
      case "Hayward":
        superRegion = "East Bay";
        break;
    }

    const doc: MemberDoc = {
      individualId: individual.id,
      firstName: individual.first_name,
      lastName: individual.last_name,
      gender: individual.gender,
      region,
      superRegion,
      ministry: getSelect("Ministry"),
      pledge,
      phone: individual.phones?.phone?.[0]?.["#text"],
      email: individual.email,
      birthdate: individual.birthday,
      type: pulldownFields.find((f) => f.label?.startsWith("Type"))
        ?.selection?.["#text"],
      membershipStartDate: individual.membership_date,
      familyId: individual.family?.id,
      familyPosition: individual.family_position,
      isMember,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!isMember) {
      doc.membershipStopDate = individual.membership_end;
      doc.reasonForFallaway = getText("Reason for Fallaway");
      doc.movedTo = getText("Moved To (for Moveaways)");
      doc.takeawayType = takeawayType;
    }

    docs.push({ id: individual.id, data: doc });
  }

  if (docs.length === 0) {
    console.log("No members found");
    return;
  }

  // 🔥 CHUNKED FIRESTORE WRITE (SAFE)
  await commitInChunks(firebaseAdmin, docs, (batch, item) => {
    try {
      batch.set(
        firebaseAdmin.firestore().collection("members").doc(item.id),
        item.data,
        {
          merge: true,
        },
      );
    } catch (err) {
      console.error("Error:", err);
    }
  });

  console.log("Total pledge:", totalPledgeAmount);
}
