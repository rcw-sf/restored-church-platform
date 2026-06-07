import { Timestamp } from "firebase-admin/firestore";
import { MemberDoc } from "./members";
import { PaymentType } from "./pushpay";

export type TransactionStatus = "completed" | "failed" | "refunded";

export interface TransactionDoc {
  transactionId: string;
  pushpayIndividualId: string | null;
  name: string;
  fundName: string;
  fundKey?: string;
  amount: number; // The actual amount of this transaction
  paymentType: PaymentType;
  createdOn: Timestamp;
  givenOn: Timestamp;
  sundayDate: string;
  note?: string;
  givingOnBehalfOf?: string;
  status: TransactionStatus; // 'refunded' means this transaction itself is a refund
  refundsTransactionId?: string;
  originalTransactionId?: string;
  tenantId?: string;
  expireAt?: Timestamp;
  payer?: object;
  refundedBy?: object;
  externalLinks?: Array<{
    relationship: string;
    value: string;
  }>;
}

export interface FundGiving {
  totalOnline: number;
  totalCash: number;
  totalCheck: number;
  totalGiving: number;
}

export interface ContributionFund extends FundGiving {
  memberGiving: {
    givingCount: number;
    nonGivingCount: number;
  };
  nonMemberGiving: number;
  pledge: {
    total: number;
    discrepancy: number; // totalPledge - totalGiving
  };
  netGrowth: number; // vs previous week
}

export interface SpecialMissionsFund extends FundGiving {
  netGrowth: number; // vs previous week
}

export interface BenevolenceFund extends FundGiving {
  netGrowth: number; // vs previous week
}

export interface WeeklyGivingSummaryDoc {
  contribution: ContributionFund;
  specialMissions: SpecialMissionsFund;
  benevolence: BenevolenceFund;
  lastUpdated: Timestamp;
  sundayDate: Timestamp;
  tenantId?: string;
  expireAt?: Timestamp;
}

export interface PaymentDetail {
  transactionId: string;
  amount: number;
  paymentType: string;
  status?: TransactionStatus;
  date: string; // ISO date
  note?: string;
}

export interface WeeklyMemberGivingDoc {
  pushpayIndividualId: string;
  familyId?: string;
  sundayDate?: string;
  name: string;
  gave: boolean;
  totalAmount?: number; // Total amount (sum of all payments)
  pledge?: number;
  region?: string;
  ministry?: string;
  tenantId?: string;
  payments?: PaymentDetail[]; // Detailed list of all payments for this week
  expireAt?: Timestamp;
}

export interface WeeklyNonMemberGivingDoc {
  sundayDate: string;
  pushpayIndividualId: string; // communityMember.key from Pushpay
  name: string;
  totalAmount: number; // Total amount (sum of all payments)
  tenantId?: string;
  payments?: PaymentDetail[]; // Detailed list of all payments for this week
  expireAt?: Timestamp;
}

export type MemberLookup = Record<string, MemberDoc>;
