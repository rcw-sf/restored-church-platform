import { Timestamp } from "firebase-admin/firestore";

export interface SyncStateDoc {
  id: string;
  type: "member" | "giving";
  status: "running" | "completed" | "failed";
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // in seconds
  syncType?: "today" | "yesterday" | "weekly";
  dateRange?: {
    from: string;
    to: string;
  };
  metrics: {
    firestoreReads: number;
    firestoreWrites: number;
    cacheHits: number;
    cacheMisses: number;
    pushpayApiCalls: number;
    membersProcessed?: number;
    transactionsProcessed?: number;
    amountsProcessed?: number;
  };
  error?: {
    message: string;
    stack?: string;
  };
  triggeredBy: "schedule" | "manual";
  environment: "github-actions" | "local";
}

export interface DailyUsageDoc {
  date: string; // YYYY-MM-DD format
  totalReads: number;
  totalWrites: number;
  readsRemaining: number;
  writesRemaining: number;
  syncs: {
    member: number;
    giving: number;
  };
  sparkPlanLimit: {
    reads: number;
    writes: number;
  };
}
