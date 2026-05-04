import { Timestamp } from "firebase-admin/firestore";
import { Environment } from "../env";

export interface SyncStateDoc {
  id: string;
  type: "member" | "giving" | "summaries";
  status: "running" | "completed" | "failed";
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // in seconds
  syncType?: Environment["syncType"];
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
  expireAt?: Timestamp; // TTL field for automatic cleanup after 30 days
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
    summaries: number;
  };
  sparkPlanLimit: {
    reads: number;
    writes: number;
  };
  expireAt?: Timestamp; // TTL field for automatic cleanup after 1 year
}
