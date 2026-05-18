#!/usr/bin/env node

import { config } from "dotenv";
import { DateTime } from "luxon";
import { FirebaseAdmin } from "./config/firebase.js";
import { Environment, getEnvironment } from "./env.js";
import { getSyncDates } from "./helpers/sync-date.js";
import { syncGiving } from "./services/giving-sync.js";

// Load environment variables
config();

export interface SyncResult {
  from: DateTime;
  to: DateTime;
  syncType: string;
}

export async function runSync(
  firebaseAdmin: FirebaseAdmin,
  syncType: Environment["syncType"],
): Promise<SyncResult> {
  const { from, to } = getSyncDates(syncType);
  await syncGiving(firebaseAdmin, from, to);
  return { from, to, syncType };
}

export async function main() {
  try {
    console.log("🚀 Starting giving sync...");

    const env = getEnvironment();
    const firebaseAdmin = new FirebaseAdmin();

    const { from, to } = getSyncDates(env.syncType);

    // Check if using custom date range
    const isCustomRange = env.syncFrom && env.syncTo;

    if (isCustomRange) {
      console.log(
        `📅 Syncing custom date range: ${from.toFormat("yyyy-MM-dd HH:mm")} to ${to.toFormat("yyyy-MM-dd HH:mm")}`,
      );
    } else if (env.syncType === "today") {
      console.log(
        `📅 Syncing today's giving: ${from.toFormat("yyyy-MM-dd HH:mm")} to ${to.toFormat("yyyy-MM-dd HH:mm")}`,
      );
    } else if (env.syncType === "yesterday") {
      console.log(
        `📅 Syncing yesterday's giving: ${from.toFormat("yyyy-MM-dd HH:mm")} to ${to.toFormat("yyyy-MM-dd HH:mm")}`,
      );
    } else if (env.syncType === "weekly") {
      console.log(
        `📅 Syncing weekly giving: ${from.toFormat("yyyy-MM-dd HH:mm")} to ${to.toFormat("yyyy-MM-dd HH:mm")}`,
      );
    } else {
      console.error("❌ Invalid sync type:", env.syncType);
      process.exit(1);
    }

    await syncGiving(firebaseAdmin, from, to);

    console.log("✅ Giving sync completed successfully!");
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error("❌ Giving sync failed:", err.message);
    if (err.stack) {
      console.error("📍 Stack trace:");
      console.error(err.stack.split("\n").slice(0, 4).join("\n"));
    }
    process.exit(1);
  }
}

// Only run main() when this file is executed directly (not during tests)
if (process.env.VITEST !== "true" && !process.env.CI) {
  main();
}
