import { Timestamp } from "firebase-admin/firestore";
import { FirebaseAdmin } from "../config/firebase.js";
import { SyncStateDoc, DailyUsageDoc } from "../types/sync.js";

const MAX_SYNC_STATE_TTL_DAYS = parseInt(
  process.env.MAX_SYNC_STATE_TTL_DAYS || "30",
  10,
);
const MAX_DAILY_USAGE_TTL_DAYS = parseInt(
  process.env.MAX_DAILY_USAGE_TTL_DAYS || "60",
  10,
);

const SPARK_PLAN_LIMITS = {
  reads: 50000,
  writes: 20000,
};

export interface SyncMetrics {
  firestoreReads: number;
  firestoreWrites: number;
  cacheHits: number;
  cacheMisses: number;
  pushpayApiCalls: number;
  membersProcessed: number;
  transactionsProcessed: number;
  amountsProcessed: number;
}

export class SyncMonitor {
  private db;
  private syncId: string;
  private startTime: Date;
  private metrics: SyncMetrics = {
    firestoreReads: 0,
    firestoreWrites: 0,
    cacheHits: 0,
    cacheMisses: 0,
    pushpayApiCalls: 0,
    membersProcessed: 0,
    transactionsProcessed: 0,
    amountsProcessed: 0,
  };

  constructor(
    firebaseAdmin: FirebaseAdmin,
    private type: "member" | "giving",
    private syncType?: "today" | "yesterday" | "weekly",
    private dateRange?: { from: string; to: string },
    private tenantId: string = "default",
  ) {
    this.db = firebaseAdmin.firestore();
    this.startTime = new Date();
    this.syncId = `${tenantId}-${type}-${this.startTime.toISOString().replace(/[:.]/g, "-")}`;
  }

  private get syncStateRef() {
    return this.db
      .collection("tenants")
      .doc(this.tenantId)
      .collection("sync_state")
      .doc(this.syncId);
  }

  private get dailyUsageRef() {
    const today = new Date().toISOString().split("T")[0];
    return this.db
      .collection("tenants")
      .doc(this.tenantId)
      .collection("daily_usage")
      .doc(today);
  }

  async start(triggeredBy: "schedule" | "manual" = "schedule"): Promise<void> {
    const environment = process.env.GITHUB_ACTIONS ? "github-actions" : "local";

    // Set TTL for automatic cleanup after configured days
    const expireAt = new Date(this.startTime);
    expireAt.setDate(expireAt.getDate() + MAX_SYNC_STATE_TTL_DAYS);

    const syncState: Omit<SyncStateDoc, "id"> = {
      type: this.type,
      status: "running",
      startedAt: Timestamp.fromDate(this.startTime),
      metrics: this.metrics,
      triggeredBy,
      environment,
      expireAt: Timestamp.fromDate(expireAt),
      ...(this.syncType && { syncType: this.syncType }),
      ...(this.dateRange && { dateRange: this.dateRange }),
    };

    await this.syncStateRef.set(syncState);
    console.log(`📊 Started monitoring ${this.type} sync: ${this.syncId}`);
  }

  getMetrics(): SyncMetrics {
    return this.metrics;
  }

  recordFirestoreReads(count: number = 1): void {
    this.metrics.firestoreReads += count;
  }

  recordFirestoreWrites(count: number = 1): void {
    this.metrics.firestoreWrites += count;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses += 1;
  }

  recordPushpayApiCall(): void {
    this.metrics.pushpayApiCalls += 1;
  }

  recordMembersProcessed(count: number): void {
    this.metrics.membersProcessed =
      (this.metrics.membersProcessed || 0) + count;
  }

  recordTransactionsProcessed(count: number): void {
    this.metrics.transactionsProcessed =
      (this.metrics.transactionsProcessed || 0) + count;
  }

  recordAmountsProcessed(amount: number): void {
    this.metrics.amountsProcessed =
      (this.metrics.amountsProcessed || 0) + amount;
  }

  async complete(): Promise<void> {
    const completedAt = new Date();
    const duration = Math.floor(
      (completedAt.getTime() - this.startTime.getTime()) / 1000,
    );

    const updateData: Partial<SyncStateDoc> = {
      status: "completed",
      completedAt: Timestamp.fromDate(completedAt),
      duration,
      metrics: this.metrics,
    };

    await this.syncStateRef.update(updateData);
    await this.updateDailyUsage();

    console.log(`✅ Completed ${this.type} sync monitoring: ${this.syncId}`);
    this.logUsageSummary();
  }

  async fail(error: Error): Promise<void> {
    const completedAt = new Date();
    const duration = Math.floor(
      (completedAt.getTime() - this.startTime.getTime()) / 1000,
    );

    const updateData: Partial<SyncStateDoc> = {
      status: "failed",
      completedAt: Timestamp.fromDate(completedAt),
      duration,
      metrics: this.metrics,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };

    await this.syncStateRef.update(updateData);
    await this.updateDailyUsage();

    console.error(`❌ Failed ${this.type} sync monitoring: ${this.syncId}`);
  }

  private async updateDailyUsage(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const usageDoc = await this.dailyUsageRef.get();
    let currentUsage: DailyUsageDoc;

    // Set TTL for automatic cleanup after configured days
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + MAX_DAILY_USAGE_TTL_DAYS);

    if (usageDoc.exists) {
      currentUsage = usageDoc.data() as DailyUsageDoc;
      currentUsage.totalReads += this.metrics.firestoreReads;
      currentUsage.totalWrites += this.metrics.firestoreWrites;
      currentUsage.syncs[this.type] += 1;
    } else {
      currentUsage = {
        date: today,
        totalReads: this.metrics.firestoreReads,
        totalWrites: this.metrics.firestoreWrites,
        readsRemaining: SPARK_PLAN_LIMITS.reads - this.metrics.firestoreReads,
        writesRemaining:
          SPARK_PLAN_LIMITS.writes - this.metrics.firestoreWrites,
        syncs: {
          member: this.type === "member" ? 1 : 0,
          giving: this.type === "giving" ? 1 : 0,
        },
        sparkPlanLimit: SPARK_PLAN_LIMITS,
        expireAt: Timestamp.fromDate(expireAt),
      };
    }

    // Update remaining limits
    currentUsage.readsRemaining =
      SPARK_PLAN_LIMITS.reads - currentUsage.totalReads;
    currentUsage.writesRemaining =
      SPARK_PLAN_LIMITS.writes - currentUsage.totalWrites;

    await this.dailyUsageRef.set(currentUsage);
  }

  private logUsageSummary(): void {
    const readPercentage = (
      (this.metrics.firestoreReads / SPARK_PLAN_LIMITS.reads) *
      100
    ).toFixed(2);
    const writePercentage = (
      (this.metrics.firestoreWrites / SPARK_PLAN_LIMITS.writes) *
      100
    ).toFixed(2);
    const cacheHitRate =
      this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (
            (this.metrics.cacheHits /
              (this.metrics.cacheHits + this.metrics.cacheMisses)) *
            100
          ).toFixed(1)
        : "0";

    console.log(`📊 Usage Summary for ${this.type} sync:`);
    console.log(
      `   Firestore Reads: ${this.metrics.firestoreReads} (${readPercentage}% of daily limit)`,
    );
    console.log(
      `   Firestore Writes: ${this.metrics.firestoreWrites} (${writePercentage}% of daily limit)`,
    );
    console.log(
      `   Cache Hit Rate: ${cacheHitRate}% (${this.metrics.cacheHits} hits, ${this.metrics.cacheMisses} misses)`,
    );
    console.log(`   Pushpay API Calls: ${this.metrics.pushpayApiCalls}`);

    if (this.metrics.membersProcessed) {
      console.log(`   Members Processed: ${this.metrics.membersProcessed}`);
    }
    if (this.metrics.transactionsProcessed) {
      console.log(
        `   Transactions Processed: ${this.metrics.transactionsProcessed}`,
      );
    }
    if (this.metrics.amountsProcessed) {
      console.log(
        `   Amounts Processed: $${this.metrics.amountsProcessed.toLocaleString()}`,
      );
    }
  }

  static async getDailyUsage(
    firebaseAdmin: FirebaseAdmin,
    tenantId: string,
    date: string,
  ): Promise<DailyUsageDoc | null> {
    const doc = await firebaseAdmin
      .firestore()
      .collection("tenants")
      .doc(tenantId)
      .collection("daily_usage")
      .doc(date)
      .get();
    return doc.exists ? (doc.data() as DailyUsageDoc) : null;
  }

  static async getRecentSyncs(
    firebaseAdmin: FirebaseAdmin,
    tenantId: string,
    limit: number = 10,
  ): Promise<SyncStateDoc[]> {
    const snapshot = await firebaseAdmin
      .firestore()
      .collection("tenants")
      .doc(tenantId)
      .collection("sync_state")
      .orderBy("startedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as SyncStateDoc,
    );
  }
}
