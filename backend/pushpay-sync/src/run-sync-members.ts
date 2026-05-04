#!/usr/bin/env node

import { config } from "dotenv";
import { FirebaseAdmin } from "./config/firebase.js";
import { getEnvironment } from "./env.js";
import { syncMembers } from "./services/sync-members.js";

// Load environment variables
config();

async function main() {
  try {
    console.log("🚀 Starting member sync...");

    const { syncType } = getEnvironment();
    const firebaseAdmin = new FirebaseAdmin();

    if (syncType === "all") {
      console.log("🔄 Syncing all members...");
    } else if (syncType === "only-modified") {
      console.log("🔄 Syncing only modified members...");
    } else {
      console.error("❌ Invalid sync type:", syncType);
      process.exit(1);
    }

    await syncMembers(firebaseAdmin);

    console.log("✅ Member sync completed successfully!");
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error("❌ Member sync failed:", err.message);
    if (err.stack) {
      console.error("📍 Stack trace:");
      console.error(err.stack.split("\n").slice(0, 4).join("\n"));
    }
    process.exit(1);
  }
}

main();
