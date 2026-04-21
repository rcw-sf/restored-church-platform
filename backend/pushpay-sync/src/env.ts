interface Environment {
  pushpayChmsApiBaseUrl: string;
  pushpayChmsApiUsername: string;
  pushpayChmsApiPassword: string;

  firebaseProjectId: string;
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
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  };

  return environmentCached;
};
