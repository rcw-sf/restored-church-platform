export interface MemberDoc {
  individualId: string;
  firstName: string;
  lastName: string;
  gender?: string;
  region?: string;
  superRegion?: string;
  ministry?: string;
  pledge?: number;
  phone?: string;
  email?: string;
  birthdate?: string;
  baptizedDate?: string;
  type?: string;
  membershipStartDate?: string;
  membershipStopDate?: string;
  reasonForFallaway?: string;
  movedTo?: string;
  familyId?: string;
  familyPosition?: string;
  takeawayType?: string;
  familyMembers?: FamilyMemberDoc[];
  pushpayCommunityMemberKey?: string;
  pushpaySpouseCommunityMemberKey?: string; // Used for spouse giving logic
  updatedAt?: FirebaseFirestore.FieldValue;
  createdAt?: string;
  modifiedAt?: string;
  tenantId?: string;
}

export interface FamilyMemberDoc {
  individualId?: string;
  fullName?: string;
  familyPosition?: string;
}
