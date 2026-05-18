import { DateTime } from "luxon";
import { FirebaseAdmin } from "../../config/firebase.js";
import { loadMappingData } from "../../services/member-loader.js";
import { MemberLookup } from "../../types/giving.js";
import {
  loadCachedMemberData,
  saveMemberDataToCache,
} from "../../utils/cache.js";
import {
  loadGitHubCacheMemberData,
  saveMemberDataToGitHubCache,
} from "../../utils/github-cache.js";
import { SyncMonitor } from "../../utils/sync-monitor.js";

/**
 * Load member lookup data from cache or Firestore
 */
export async function loadMemberLookup(
  firebaseAdmin: FirebaseAdmin,
  to: DateTime,
  monitor: SyncMonitor,
): Promise<MemberLookup> {
  // Try to load member data from cache (GitHub Actions first, then local)
  let memberLookup = loadGitHubCacheMemberData() || loadCachedMemberData();
  const memberCount = Object.keys(memberLookup || {}).length;

  if (!memberLookup) {
    console.log("📥 Loading member data from Firestore...");
    monitor.recordCacheMiss();
    memberLookup = await loadMappingData(firebaseAdmin);
    const loadedMemberCount = Object.keys(memberLookup).length;
    console.log(`   ✅ Loaded ${loadedMemberCount} members from Firestore`);
    monitor.recordFirestoreReads();
    // Cache the loaded data for future runs
    saveMemberDataToCache(memberLookup, to.toFormat("yyyy-MM-dd"));
    saveMemberDataToGitHubCache(memberLookup, to.toFormat("yyyy-MM-dd"));
    console.log(`   💾 Cached member data for future runs`);
  } else {
    console.log(`⚡ Using cached member data (${memberCount} members)`);
    monitor.recordCacheHit();
  }

  return memberLookup;
}
