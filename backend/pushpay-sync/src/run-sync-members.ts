#!/usr/bin/env node

import { config } from "dotenv";
import { FirebaseAdmin } from "./config/firebase.js";
import { syncMembers } from "./services/sync-members.js";

// Load environment variables
config();

async function main() {
  try {
    console.log("🚀 Starting member sync...");

    const firebaseAdmin = new FirebaseAdmin();
    await syncMembers(firebaseAdmin);

    console.log("✅ Member sync completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Member sync failed:", error);
    process.exit(1);
  }
}

main();
