import { FirebaseAdmin } from "../config/firebase.js";
import { getEnvironment } from "../env.js";
import { MemberLookup } from "../types/giving.js";
import { MemberDoc } from "../types/members.js";

export async function loadMappingData(firebaseAdmin: FirebaseAdmin) {
  const { tenantId } = getEnvironment();
  const memberLookup: MemberLookup = {};

  // Optimize: Only load fields we need, paginate for large datasets
  const batchSize = 100;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query = firebaseAdmin
      .firestore()
      .collection("tenants")
      .doc(tenantId)
      .collection("members")
      .select(
        "individualId",
        "firstName",
        "lastName",
        "pledge",
        "region",
        "ministry",
        "familyId",
        "familyMembers",
        "pushpayCommunityMemberKey",
        "pushpaySpouseCommunityMemberKey",
      )
      .orderBy("individualId")
      .limit(batchSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      hasMore = false;
    } else {
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      snapshot.forEach((doc) => {
        const data = doc.data() as MemberDoc;
        const {
          individualId,
          pushpayCommunityMemberKey,
          pushpaySpouseCommunityMemberKey,
        } = data;

        // Map by CHMS individual ID (external link from Pushpay)
        // Usage: When Pushpay sends a transaction with an external link containing
        // a CHMS "person_id", we can directly match to the member record
        if (individualId) {
          memberLookup[individualId] = data;
        }

        // Map by Pushpay community member key (Pushpay's unique identifier)
        // Usage: When a payer's communityMember.key matches, we know which member
        // made the donation even if the CHMS external link is missing
        if (pushpayCommunityMemberKey) {
          memberLookup[pushpayCommunityMemberKey] = data;
        }

        // Map by spouse's Pushpay community member key
        // Usage: When a transaction comes from a spouse (they share a Pushpay account),
        // the spouse's communityMember.key is present. This allows attributing
        // the giving to the primary member's household
        if (pushpaySpouseCommunityMemberKey) {
          memberLookup[pushpaySpouseCommunityMemberKey] = data;
        }

        // Map by family members' CHMS individual IDs
        // Usage: When a spouse or child has a separate CHMS record but is part of
        // the same family, their individual ID may appear in transactions.
        // We attribute their giving to the family head (this member record).
        // Only Primary Contact and Spouse are included - children are excluded
        // as they typically don't make donations independently.
        if (data.familyMembers) {
          for (const familyMember of data.familyMembers) {
            if (
              familyMember.individualId &&
              (familyMember.familyPosition === "Primary Contact" ||
                familyMember.familyPosition === "Spouse")
            ) {
              memberLookup[familyMember.individualId] = data;
            }
          }
        }
      });
    }
  }

  return memberLookup;
}
