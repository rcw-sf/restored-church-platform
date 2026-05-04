export interface Environment {
  // Pushpay CHMS API
  pushpayChmsApiBaseUrl: string;
  pushpayChmsApiUsername: string;
  pushpayChmsApiPassword: string;

  // Pushpay Giving API
  pushpayGivingApiBaseUrl: string;
  pushpayAuthTokenApiBaseUrl: string;
  pushpayAuthTokenUsername: string;
  pushpayAuthTokenPassword: string;
  pushpayOrganizationId: string;

  // Fund configuration
  contributionFundKey: string;
  benevolenceFundKey: string;
  specialMissionsFundKey: string;

  // Firebase
  firebaseProjectId: string;

  // Tenant
  tenantId: string;

  // Sync configuration
  syncType: "today" | "yesterday" | "weekly" | "all" | "only-modified";
  pushpayRateLimitMs: number;

  // Cache TTL configuration
  maxSyncStateTtlDays: number;
  maxDailyUsageTtlDays: number;

  // Transaction TTL configuration
  transactionTtlDays: number;

  // Weekly giving summary TTL configuration
  weeklyGivingSummaryTtlDays: number;

  // GitHub Actions cache
  githubActionCachePath: string;

  // Date range overrides (for manual runs)
  syncFrom?: string;
  syncTo?: string;
}

export let environmentCached: Environment | null = null;

export const getEnvironment = (): Environment => {
  if (environmentCached) {
    return environmentCached;
  }

  environmentCached = {
    pushpayChmsApiBaseUrl: process.env.PUSHPAY_CHMS_API_BASE_URL || "",
    pushpayChmsApiUsername: process.env.PUSHPAY_CHMS_API_USERNAME || "",
    pushpayChmsApiPassword: process.env.PUSHPAY_CHMS_API_PASSWORD || "",

    pushpayGivingApiBaseUrl: process.env.PUSHPAY_GIVING_API_BASE_URL || "",
    pushpayAuthTokenApiBaseUrl:
      process.env.PUSHPAY_AUTH_TOKEN_API_BASE_URL || "",
    pushpayAuthTokenUsername: process.env.PUSHPAY_AUTH_TOKEN_USERNAME || "",
    pushpayAuthTokenPassword: process.env.PUSHPAY_AUTH_TOKEN_PASSWORD || "",

    pushpayOrganizationId: process.env.TRCSF_ORGANIZATION_ID || "",

    contributionFundKey: process.env.TRCSF_WEEKLY_CONTRIBUTION_KEY || "",
    benevolenceFundKey: process.env.TRCSF_BENEVOLENCE_KEY || "",
    specialMissionsFundKey: process.env.TRCSF_SPECIAL_MISSIONS_KEY || "",

    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
    tenantId: process.env.TENANT_ID || "",

    syncType: (process.env.SYNC_TYPE as Environment["syncType"]) || "yesterday",
    pushpayRateLimitMs: parseInt(
      process.env.PUSHPAY_RATE_LIMIT_MS || "6000",
      10,
    ),

    maxSyncStateTtlDays: parseInt(
      process.env.MAX_SYNC_STATE_TTL_DAYS || "30",
      10,
    ),
    maxDailyUsageTtlDays: parseInt(
      process.env.MAX_DAILY_USAGE_TTL_DAYS || "60",
      10,
    ),

    transactionTtlDays: parseInt(process.env.TRANSACTION_TTL_DAYS || "30", 10),

    weeklyGivingSummaryTtlDays: parseInt(
      process.env.WEEKLY_GIVING_SUMMARY_TTL_DAYS || "90",
      10,
    ),

    githubActionCachePath:
      process.env.GITHUB_ACTION_CACHE_PATH || process.cwd(),

    ...(process.env.SYNC_FROM && { syncFrom: process.env.SYNC_FROM }),
    ...(process.env.SYNC_TO && { syncTo: process.env.SYNC_TO }),
  };

  return environmentCached;
};
