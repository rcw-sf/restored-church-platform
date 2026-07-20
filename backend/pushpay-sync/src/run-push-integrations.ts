import dotenv from "dotenv";
import { FirebaseAdmin } from "./config/firebase.js";
import { pushIntegrations } from "./services/push-integrations.js";

// Load local .env variables if not running in Google Cloud or GitHub Actions
if (!process.env.GCLOUD_PROJECT && !process.env.GITHUB_ACTIONS) {
  console.log("Loading local .env");
  dotenv.config();
}

async function main() {
  const admin = new FirebaseAdmin();

  try {
    const target =
      (process.env.INTEGRATION_TARGET as "all" | "pushpay" | "sheets") || "all";
    await pushIntegrations(admin, target);
    console.log("Push Integrations complete");
    process.exit(0);
  } catch (error) {
    console.error("Fatal error pushing integrations:", error);
    process.exit(1);
  }
}

main();
