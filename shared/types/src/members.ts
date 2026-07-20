// Valid regions after normalization (see getNormalizedRegion in xml-field-extractors.ts)
export type Region =
  | "San Mateo"
  | "San Francisco"
  | "San Jose"
  | "Berkeley"
  | "Contra Costa"
  | "Hayward"
  | "Silicon Valley"
  | "";

export type SuperRegion = "Peninsula" | "South Bay" | "East Bay" | "";

export type Ministry = "Teens" | "Marrieds" | "Campus" | "Singles" | "";

export type AdditionType =
  | "Place Membership"
  | "Baptism"
  | "Restoration"
  | "Other"
  | "";
export type TakeawayType =
  | "Fallaway"
  | "Transfer"
  | "Glory"
  | "Walkaway"
  | "Other"
  | "";

export interface MemberDoc {
  id?: string;
  pushpayIndividualId?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  region?: Region;
  superRegion?: SuperRegion;
  ministry?: Ministry;
  pledge?: number;
  phone?: string;
  email?: string;
  birthdate?: string;
  baptizedDate?: string;
  type?: AdditionType;
  bibleTalk?: string;
  membershipStartDate?: string;
  membershipStopDate?: string;
  reasonForFallaway?: string;
  movedTo?: string;
  familyId?: string;
  familyPosition?: string;
  takeawayType?: TakeawayType;
  familyMembers?: FamilyMemberDoc[];
  pushpayCommunityMemberKey?: string;
  pushpaySpouseCommunityMemberKey?: string; // Used for spouse giving logic
  updatedAt?: string;
  createdAt?: string;
  modifiedAt?: string;
  tenantId?: string;
}

export interface FamilyMemberDoc {
  pushpayIndividualId?: string;
  fullName?: string;
  familyPosition?: string;
}
