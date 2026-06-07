import { MemberLookup } from "../types/giving.js";
import { PushpayTransaction } from "../types/pushpay.js";

export function resolvePayerId(
  transaction: PushpayTransaction,
  members: MemberLookup,
): string {
  // Priority 1: External Link (person_id)
  const personId = transaction.externalLinks?.find(
    // Pushpay's person_id
    (l) => l.relationship === "person_id",
  )?.value;
  let foundId =
    personId && members[personId]
      ? members[personId].pushpayIndividualId
      : null;

  // Priority 2: Payer Export Key
  if (!foundId && transaction.payer?.exportKey) {
    const member = members[transaction.payer.exportKey];
    foundId = member?.pushpayIndividualId || null;
  }

  // Priority 3: Community Member Key
  if (!foundId && transaction.communityMember?.key) {
    const member = members[transaction.communityMember.key];
    foundId = member?.pushpayIndividualId || null;
  }

  // Priority 4: Spouse Community Member Key
  // Handle case where a non-member spouse gives for a member
  if (!foundId && transaction.communityMember?.key) {
    // Find any member whose spouseCommunityMemberKey matches the transaction's communityMember.key
    const memberWithSpouseKey = Object.values(members).find(
      (m) =>
        m.pushpaySpouseCommunityMemberKey === transaction.communityMember?.key,
    );
    if (memberWithSpouseKey) {
      foundId = memberWithSpouseKey.pushpayIndividualId;
    }
  }

  // Priority 5: Default to community member key (even if not in members)
  // This ensures every transaction has an identifier
  if (!foundId && transaction.communityMember?.key) {
    foundId = transaction.communityMember.key;
  }

  // Note: The spouse logic for marking "gave" status is handled in updateSummary.
  // This function's role is to resolve the primary individual associated with the transaction.

  return foundId || "unknown";
}
