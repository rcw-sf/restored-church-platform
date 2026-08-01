import { Region, Ministry, AdditionType, TakeawayType } from "@repo/types";

export interface AdditionSheetRow {
  id: string;
  date: string;
  type: AdditionType;
  firstName: string;
  lastName: string;
  gender: string;
  region: Region;
  ministry: Ministry;
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
  region: Region;
  ministry: Ministry;
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
  type: TakeawayType;
  firstName: string;
  lastName: string;
  gender: string;
  region: Region;
  ministry: Ministry;
  bibleTalk: string;
  weeklyPledge: string;
  phone: string;
  email: string;
  physicalBirthday: string;
  spiritualBirthday: string;
  homeAddress: string;
  movedTo: string;
  notes: string;
}
