import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "fs";
import { join } from "path";
import { MemberLookup } from "../types/giving.js";

interface CacheData {
  timestamp: number;
  memberLookup: MemberLookup;
  lastSyncDate: string;
}

const CACHE_FILE = join(process.cwd(), ".cache", "member-data.json");
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function loadCachedMemberData(): MemberLookup | null {
  try {
    if (!existsSync(CACHE_FILE)) {
      return null;
    }

    const cacheData: CacheData = JSON.parse(readFileSync(CACHE_FILE, "utf8"));

    // Check if cache is still valid
    if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
      return null;
    }

    console.log(
      `✅ Using cached member data from ${new Date(cacheData.timestamp).toISOString()}`,
    );
    return cacheData.memberLookup;
  } catch (error) {
    console.warn("⚠️ Failed to load cache:", error);
    return null;
  }
}

export function saveMemberDataToCache(
  memberLookup: MemberLookup,
  lastSyncDate: string,
): void {
  try {
    const cacheDir = join(process.cwd(), ".cache");

    // Create cache directory if it doesn't exist
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const cacheData: CacheData = {
      timestamp: Date.now(),
      memberLookup,
      lastSyncDate,
    };

    writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(
      `💾 Cached member data for ${Object.keys(memberLookup).length} members`,
    );
  } catch (error) {
    console.warn("⚠️ Failed to save cache:", error);
  }
}

export function getCacheInfo(): {
  exists: boolean;
  age: number;
  size: number;
} | null {
  try {
    if (!existsSync(CACHE_FILE)) {
      return { exists: false, age: 0, size: 0 };
    }

    const stats = statSync(CACHE_FILE);
    const cacheData: CacheData = JSON.parse(readFileSync(CACHE_FILE, "utf8"));

    return {
      exists: true,
      age: Date.now() - cacheData.timestamp,
      size: stats.size,
    };
  } catch {
    return null;
  }
}
