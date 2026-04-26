interface Environment {
  pushpayChmsApiBaseUrl: string;
  pushpayChmsApiUsername: string;
  pushpayChmsApiPassword: string;

  pushpayGivingApiBaseUrl: string;
  pushpayAuthTokenApiBaseUrl: string;
  pushpayAuthTokenUsername: string;
  pushpayAuthTokenPassword: string;
  pushpayOrganizationId: string; // Renamed for consistency

  contributionFundKey: string;
  benevolenceFundKey: string;
  specialMissionsFundKey: string;

  firebaseProjectId: string;
  tenantId: string;
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

    pushpayOrganizationId: process.env.TRCSF_ORGANIZATION_ID || "", // Still uses TRCSF_ORGANIZATION_ID from env

    contributionFundKey: process.env.TRCSF_WEEKLY_CONTRIBUTION_KEY || "",
    benevolenceFundKey: process.env.TRCSF_BENEVOLENCE_KEY || "",
    specialMissionsFundKey: process.env.TRCSF_SPECIAL_MISSIONS_KEY || "",

    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
    tenantId: process.env.TENANT_ID || "",
  };

  return environmentCached;
};
