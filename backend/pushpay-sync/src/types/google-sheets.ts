export interface AdditionSheetRow {
  id: string;
  date: string;
  type: string;
  firstName: string;
  lastName: string;
  gender: string;
  region: string;
  ministry: string;
  bibleTalk: string;
  weeklyPledge: string;
  phone: string;
  email: string;
  physicalBirthday: string;
  spiritualBirthday: string;
  homeAddress: string;
  notes: string;
}

export interface MembershipSheetRow {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  region: string;
  ministry: string;
  bibleTalk: string;
  weeklyPledge: string;
  phone: string;
  email: string;
  physicalBirthday: string;
  spiritualBirthday: string;
  homeAddress: string;
  notes: string;
}

export interface TakeawaySheetRow {
  id: string;
  date: string;
  type: string;
  firstName: string;
  lastName: string;
  gender: string;
  region: string;
  ministry: string;
  bibleTalk: string;
  reasonForFallaway: string;
  movedTo: string;
  phone: string;
  email: string;
  notes: string;
}
