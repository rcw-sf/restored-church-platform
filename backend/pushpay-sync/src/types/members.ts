export interface MemberDoc {
  individualId: string;
  firstName: string;
  lastName: string;
  gender?: string;
  region?: string;
  superRegion?: string;
  ministry?: string;
  pledge: number;
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
  isMember: boolean;
  takeawayType?: string;
  updatedAt: FirebaseFirestore.FieldValue;
}
