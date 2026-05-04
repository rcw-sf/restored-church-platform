#!/usr/bin/env node

import { config } from "dotenv";
import { DateTime } from "luxon";
import { FirebaseAdmin } from "./config/firebase.js";
import { getEnvironment } from "./env.js";
import { calculateSummaries } from "./services/calculate-summaries.js";

// Load environment variables
config();

// Re-export the calculateSummaries function for external use
export { calculateSummaries } from "./services/calculate-summaries.js";

async function main() {
  try {
    console.log("🚀 Starting summary calculation...");

    const { syncFrom, syncTo } = getEnvironment();
    const firebaseAdmin = new FirebaseAdmin();

    // Parse optional date range from environment variables
    const fromDate = syncFrom ? DateTime.fromISO(syncFrom) : undefined;
    const toDate = syncTo ? DateTime.fromISO(syncTo) : undefined;

    await calculateSummaries(firebaseAdmin, fromDate, toDate);
    process.exit(0);
  } catch (error) {
    console.error("❌ Summary calculation failed:", error);
    process.exit(1);
  }
}

// Only run main() when this file is executed directly
if (process.env.VITEST !== "true" && !process.env.CI) {
  main();
}
