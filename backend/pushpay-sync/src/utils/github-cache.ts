import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { MemberLookup } from "../types/giving.js";

interface CacheData {
  timestamp: number;
  memberLookup: MemberLookup;
  lastSyncDate: string;
}

const CACHE_FILE = join(
  process.env.GITHUB_ACTION_CACHE_PATH || process.cwd(),
  "member-data.json",
);
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function loadGitHubCacheMemberData(): MemberLookup | null {
  try {
    // Only use GitHub cache if running in GitHub Actions
    if (!process.env.GITHUB_ACTIONS) {
      return null;
    }

    if (!existsSync(CACHE_FILE)) {
      console.log("📂 No GitHub cache file found");
      return null;
    }

    const cacheData: CacheData = JSON.parse(readFileSync(CACHE_FILE, "utf8"));

    // Check if cache is still valid
    if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
      console.log("⏰ GitHub cache expired");
      return null;
    }

    console.log(
      `✅ Using GitHub cached member data from ${new Date(cacheData.timestamp).toISOString()}`,
    );
    console.log(
      `📊 Cached ${Object.keys(cacheData.memberLookup).length} members`,
    );
    return cacheData.memberLookup;
  } catch (error) {
    console.warn("⚠️ Failed to load GitHub cache:", error);
    return null;
  }
}

export function saveMemberDataToGitHubCache(
  memberLookup: MemberLookup,
  lastSyncDate: string,
): void {
  try {
    // Only save to GitHub cache if running in GitHub Actions
    if (!process.env.GITHUB_ACTIONS) {
      return;
    }

    const cacheData: CacheData = {
      timestamp: Date.now(),
      memberLookup,
      lastSyncDate,
    };

    writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(
      `💾 Saved to GitHub cache: ${Object.keys(memberLookup).length} members`,
    );
    console.log(`📁 Cache file: ${CACHE_FILE}`);
  } catch (error) {
    console.warn("⚠️ Failed to save GitHub cache:", error);
  }
}

export function getGitHubCachePath(): string {
  return CACHE_FILE;
}
