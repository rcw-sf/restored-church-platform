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

export interface MemberDoc {
  pushpayIndividualId: string;
  firstName: string;
  lastName: string;
  gender?: string;
  region?: Region;
  superRegion?: SuperRegion;
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
  pushpayIndividualId?: string;
  fullName?: string;
  familyPosition?: string;
}

export interface RegionStats {
  count: number;
  totalPledge: number;
}

export interface MemberStatisticsDoc {
  totalPledge: number;
  memberCount: number;
  membersWithPledge: number;
  averagePledge: number;
  regionBreakdown: Record<Region, RegionStats>;
  calculatedAt: FirebaseFirestore.Timestamp;
  tenantId?: string;
}
