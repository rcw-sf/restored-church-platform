import nock from "nock";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { FirebaseAdmin } from "../src/config/firebase.js";
import { syncMembers } from "../src/services/sync-members.js";

// Unmock firebase-admin so we can hit the emulator
vi.unmock("firebase-admin");

// Mock env.js so we don't need real environment variables
vi.mock("../src/env.js", () => ({
  getEnvironment: vi.fn().mockReturnValue({
    tenantId: "test-tenant",
    pushpayRateLimitMs: 0,
    syncType: "all",
    pushpayChmsApiUsername: "test-user",
    pushpayChmsApiPassword: "test-password",
    pushpayChmsApiBaseUrl: "https://api.pushpay.chms.test",
  }),
}));

// We must bypass our sleep/sync monitors so they don't block
vi.mock("../src/utils/sleep.js", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/utils/sync-monitor.js", () => {
  const mockMethods = {
    start: vi.fn(),
    recordFirestoreWrites: vi.fn(),
    recordMembersProcessed: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  };

  return {
    SyncMonitor: class {
      start = mockMethods.start;
      recordFirestoreWrites = mockMethods.recordFirestoreWrites;
      recordMembersProcessed = mockMethods.recordMembersProcessed;
      complete = mockMethods.complete;
      fail = mockMethods.fail;
    },
    getMockInstance: () => mockMethods,
  };
});

// Mock caching layer so we don't try to write to filesystem
vi.mock("../src/utils/cache.js", () => ({
  saveMemberDataToCache: vi.fn(),
  loadCachedMemberData: vi.fn().mockReturnValue(null),
}));

vi.mock("../src/utils/github-cache.js", () => ({
  saveMemberDataToGitHubCache: vi.fn(),
  loadGitHubCacheMemberData: vi.fn().mockReturnValue(null),
}));

describe("PushPay Member Sync Integration Tests", () => {
  let firebaseAdmin: FirebaseAdmin;
  const PROJECT_ID = "demo-test";

  beforeAll(() => {
    // 1. Point the Firebase Admin SDK to the local emulator
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.GCLOUD_PROJECT = PROJECT_ID; // Force admin sdk to use this project
    firebaseAdmin = new FirebaseAdmin();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    nock.cleanAll();

    // 2. Clear the local Firestore database before every test
    const response = await fetch(
      `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      throw new Error(
        "Failed to clear emulator database. Is the emulator running?",
      );
    }
  });

  afterAll(() => {
    nock.cleanAll();
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.GCLOUD_PROJECT;
  });

  it("should perform a Safe Auto-Match on email and link the PushPay ID without creating a duplicate", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");

    // 1. Seed the Emulator Database with a manually created member (No PushPay ID yet)
    const existingDocRef = await membersRef.add({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });

    // 2. Mock the PushPay XML Response using Nock
    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-123</id>
              <first_name>Jane</first_name>
              <last_name>Doe</last_name>
              <email>jane@example.com</email>
              <user_defined_text_fields></user_defined_text_fields>
              <user_defined_pulldown_fields></user_defined_pulldown_fields>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(200, mockXmlResponse)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true) // catch all others (takeaways)
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    // 3. Run the actual sync script
    await syncMembers(firebaseAdmin);

    // 4. Verify the database state
    const snapshot = await membersRef.get();

    expect(snapshot.size).toBe(1); // Ensure it didn't create a duplicate!

    const syncedMember = snapshot.docs[0].data();
    expect(snapshot.docs[0].id).toBe(existingDocRef.id); // Must use the same doc ID
    expect(syncedMember.pushpayIndividualId).toBe("pushpay-123"); // Successfully linked!
  });

  it("should create a new member if Safe Auto-Match fails", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");

    // 1. Seed the Emulator Database with a completely different member
    await membersRef.add({
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      pushpayIndividualId: "pushpay-999",
    });

    // 2. Mock the PushPay XML Response using Nock (for a brand new person)
    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-new</id>
              <first_name>Alice</first_name>
              <last_name>Wonderland</last_name>
              <email>alice@example.com</email>
              <user_defined_text_fields></user_defined_text_fields>
              <user_defined_pulldown_fields></user_defined_pulldown_fields>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(200, mockXmlResponse)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true) // catch all others
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    // 3. Run the sync
    await syncMembers(firebaseAdmin);

    // 4. Verify the database state
    const snapshot = await membersRef.get();

    expect(snapshot.size).toBe(2); // The original John Smith + New Alice

    // Find the new document
    const aliceDoc =
      snapshot.docs.find(
        (d) => d.data().pushpayIndividualId === "pushpay-new",
      ) || snapshot.docs[snapshot.docs.length - 1];
    expect(aliceDoc).toBeDefined();
    expect(aliceDoc?.data().firstName).toBe("Alice");
    expect(aliceDoc?.data().email).toBe("alice@example.com");
  });

  it("should only process members modified in the last 24 hours when syncType is only-modified", async () => {
    const { getEnvironment } = await import("../src/env.js");
    const originalEnv = getEnvironment();
    vi.mocked(getEnvironment).mockReturnValue({
      ...originalEnv,
      syncType: "only-modified",
    });

    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");

    const recentDate = new Date().toISOString();
    const oldDate = "2020-01-01T00:00:00Z";

    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-recent</id>
              <first_name>Recent</first_name>
              <last_name>User</last_name>
              <email>recent@example.com</email>
              <modified>${recentDate}</modified>
            </individual>
            <individual>
              <id>pushpay-old</id>
              <first_name>Old</first_name>
              <last_name>User</last_name>
              <email>old@example.com</email>
              <modified>${oldDate}</modified>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(200, mockXmlResponse)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true)
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    await syncMembers(firebaseAdmin);

    const snapshot = await membersRef.get();
    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].data().pushpayIndividualId).toBe("pushpay-recent");

    // Restore env
    vi.mocked(getEnvironment).mockReturnValue(originalEnv);
  });

  it("should merge new members into the existing GitHub cache during sync", async () => {
    const { loadGitHubCacheMemberData, saveMemberDataToGitHubCache } =
      await import("../src/utils/github-cache.js");

    // Mock an existing cache with one member
    vi.mocked(loadGitHubCacheMemberData).mockReturnValue({
      "pushpay-existing": {
        pushpayIndividualId: "pushpay-existing",
        firstName: "Existing",
        lastName: "Member",
        email: "existing@example.com",
        tenantId: "test-tenant",
      },
    });

    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-new</id>
              <first_name>New</first_name>
              <last_name>User</last_name>
              <email>new@example.com</email>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(200, mockXmlResponse)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true)
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    await syncMembers(firebaseAdmin);

    // Verify cache was saved with BOTH existing and new members
    expect(saveMemberDataToGitHubCache).toHaveBeenCalled();

    const [savedLookup] = vi.mocked(saveMemberDataToGitHubCache).mock.calls[0];

    expect(Object.keys(savedLookup)).toHaveLength(2);
    expect(savedLookup["pushpay-existing"]).toBeDefined();
    expect(savedLookup["pushpay-new"]).toBeDefined();
    expect(savedLookup["pushpay-new"].firstName).toBe("New");
  });

  it("should delete members from Firestore if they are returned in takeaway groups", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");

    // 1. Seed the Emulator Database with a member to be deleted
    const docRef = await membersRef.add({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      pushpayIndividualId: "pushpay-takeaway",
    });

    // 2. Mock the PushPay XML Response for active members (empty)
    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    // 3. Mock the PushPay XML Response for a takeaway group (e.g., ID 40 - Fallaway)
    const takeawayXml = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-takeaway</id>
              <first_name>John</first_name>
              <last_name>Doe</last_name>
              <email>john@example.com</email>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "40",
        include_inactive: "true",
      })
      .reply(200, takeawayXml)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true) // Catch the rest (41, 42, 43)
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    // 4. Run the sync
    await syncMembers(firebaseAdmin);

    // 5. Verify the member was deleted from Firestore
    const snapshot = await membersRef.doc(docRef.id).get();
    expect(snapshot.exists).toBe(false);
  });

  it("should update an existing member's fields if they are already linked by PushPay ID", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");

    // 1. Seed existing member
    const docRef = await membersRef.add({
      firstName: "Existing",
      lastName: "User",
      email: "old.email@example.com",
      pledge: 50,
      region: "San Jose",
      pushpayIndividualId: "pushpay-update-1",
      customFieldNotFromPushpay: "Should not be overwritten",
    });

    // 2. Mock PushPay XML with updated fields (pledge to 100, new email, San Mateo region)
    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-update-1</id>
              <first_name>Existing</first_name>
              <last_name>User</last_name>
              <email>new.email@example.com</email>
              <user_defined_text_fields>
                <user_defined_text_field>
                  <label>Pledge</label>
                  <text>100</text>
                </user_defined_text_field>
              </user_defined_text_fields>
              <user_defined_pulldown_fields>
                <user_defined_pulldown_field>
                  <label>Region</label>
                  <selection id="1">San Mateo</selection>
                </user_defined_pulldown_field>
              </user_defined_pulldown_fields>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(200, mockXmlResponse)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true)
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    // 3. Run sync
    await syncMembers(firebaseAdmin);

    // 4. Verify updates
    const snapshot = await docRef.get();
    const data = snapshot.data();

    expect(data?.email).toBe("new.email@example.com"); // Email updated
    expect(data?.pledge).toBe(100); // Pledge updated
    expect(data?.region).toBe("San Mateo"); // Region updated
    expect(data?.customFieldNotFromPushpay).toBe("Should not be overwritten"); // Existing fields preserved
  });

  it("should gracefully handle members with missing or malformed fields", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");

    // Mock PushPay XML with an individual missing name, email, etc.
    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual>
              <id>pushpay-missing-data</id>
              <!-- Missing first_name, last_name, email -->
              <user_defined_text_fields></user_defined_text_fields>
              <user_defined_pulldown_fields></user_defined_pulldown_fields>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query({
        srv: "execute_advanced_search",
        id: "2",
        include_inactive: "true",
      })
      .reply(200, mockXmlResponse)
      .persist();

    nock("https://api.pushpay.chms.test")
      .get("/")
      .query(true)
      .reply(
        200,
        "<ccb_api><response><individuals></individuals></response></ccb_api>",
      )
      .persist();

    // Run sync
    await syncMembers(firebaseAdmin);

    // Verify it saved without crashing
    const snapshot = await membersRef
      .where("pushpayIndividualId", "==", "pushpay-missing-data")
      .get();
    expect(snapshot.size).toBe(1);

    const data = snapshot.docs[0].data();
    expect(data.firstName).toBeUndefined();
    expect(data.email).toBeUndefined();
    expect(data.pledge).toBe(0); // Should default to 0
    expect(data.region).toBe(""); // Should default to empty string
  });
});
