import { Timestamp } from "firebase-admin/firestore";
import { MemberDoc } from "./members";
import { PaymentType } from "./pushpay";

export type TransactionStatus = "completed" | "failed" | "refunded";

export interface TransactionDoc {
  transactionId: string;
  individualId: string | null;
  payerFullName: string;
  fundName: string;
  amount: number; // The actual amount of this transaction
  paymentType: PaymentType;
  createdOn: Timestamp;
  givenOn: Timestamp;
  sundayDate: string;
  note?: string;
  status: TransactionStatus; // 'refunded' means this transaction itself is a refund
  refundsTransactionId?: string;
  originalTransactionId?: string;
  tenantId?: string;
}

export interface WeeklyGivingSummaryDoc {
  sundayDate: Timestamp;
  totalOnline: number;
  totalCash: number;
  totalCheck: number;
  totalGiving: number;
  memberGivingCount: number;
  memberNonGivingCount: number;
  totalNonMemberGiving: number;
  totalPledge: number;
  pledgeDiscrepancy: number; // totalPledge - totalGiving
  contributionNetGrowth: number; // vs previous week
  lastUpdated: Timestamp;
  tenantId?: string;
}

export interface PaymentDetail {
  transactionId: string;
  amount: number;
  paymentType: string;
  date: string; // ISO date
  note?: string;
}

export interface WeeklyMemberGivingDoc {
  individualId: string;
  sundayDate?: string;
  name: string;
  gave: boolean;
  totalAmount?: number; // Total amount (sum of all payments)
  pledge?: number;
  region?: string;
  ministry?: string;
  tenantId?: string;
  payments?: PaymentDetail[]; // Detailed list of all payments for this week
}

export interface WeeklyNonMemberGivingDoc {
  sundayDate: string;
  individualId: string; // communityMember.key from Pushpay
  name: string;
  totalAmount: number; // Total amount (sum of all payments)
  tenantId?: string;
  payments?: PaymentDetail[]; // Detailed list of all payments for this week
}

export type MemberLookup = Record<string, MemberDoc>;
