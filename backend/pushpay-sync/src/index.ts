// src/index.ts
import dotenv from "dotenv";
import { FirebaseAdmin } from "./config/firebase.js";
import { syncMembers } from "./services/sync-members.js";

dotenv.config();

const firebaseAdmin = new FirebaseAdmin();

syncMembers(firebaseAdmin).catch((err) => {
  console.error(err);
  process.exit(1);
});
