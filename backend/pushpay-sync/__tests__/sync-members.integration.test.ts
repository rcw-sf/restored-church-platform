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
}));

vi.mock("../src/utils/github-cache.js", () => ({
  saveMemberDataToGitHubCache: vi.fn(),
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
});
