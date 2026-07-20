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
import { pushIntegrations } from "../src/services/push-integrations.js";

vi.unmock("firebase-admin");

vi.mock("../src/env.js", () => ({
  getEnvironment: vi.fn().mockReturnValue({
    tenantId: "test-tenant",
    pushpayRateLimitMs: 0,
    syncType: "all",
    pushpayChmsApiUsername: "test-user",
    pushpayChmsApiPassword: "test-password",
    pushpayChmsApiBaseUrl: "https://api.pushpay.chms.test",
    googleSpreadsheetId: "test-spreadsheet-id",
  }),
}));

const { mockClear, mockUpdate } = vi.hoisted(() => {
  return {
    mockClear: vi.fn().mockResolvedValue({}),
    mockUpdate: vi.fn().mockResolvedValue({}),
  };
});

vi.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: class GoogleAuth {},
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          clear: mockClear,
          update: mockUpdate,
        },
      },
    }),
  },
}));

describe("Push Integrations to PushPay and Google Sheets", () => {
  let firebaseAdmin: FirebaseAdmin;
  const PROJECT_ID = "demo-test";

  beforeAll(() => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.GCLOUD_PROJECT = PROJECT_ID;
    firebaseAdmin = new FirebaseAdmin();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    nock.cleanAll();

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

  it("should push an unsynced addition to PushPay via create_individual and link the ID", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");
    const additionsRef = db.collection("tenants/test-tenant/additions");

    // 1. Seed a member document
    const memberDocRef = await membersRef.add({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });

    // 2. Seed an addition document with syncedToPushpay = false
    await additionsRef.doc(memberDocRef.id).set({
      id: memberDocRef.id,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      syncedToPushpay: false,
    });

    // 3. Mock the PushPay XML Response for create_individual
    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual id="pushpay-new-123">
              <first_name>Jane</first_name>
              <last_name>Doe</last_name>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .post("/")
      .query((q) => q.srv === "create_individual")
      .reply(200, mockXmlResponse);

    // 4. Run the sync
    await pushIntegrations(firebaseAdmin);

    // 5. Verify the addition was marked as synced
    const additionSnap = await additionsRef.doc(memberDocRef.id).get();
    expect(additionSnap.data()?.syncedToPushpay).toBe(true);

    // 6. Verify the member document has the new PushPay ID
    const memberSnap = await memberDocRef.get();
    expect(memberSnap.data()?.pushpayIndividualId).toBe("pushpay-new-123");

    // 7. Verify Google Sheets was called
    expect(mockClear).toHaveBeenCalledWith({
      spreadsheetId: "test-spreadsheet-id",
      range: "ADDITIONS!A2:Z",
    });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("should push edits to PushPay for members updated after lastSyncRun", async () => {
    const db = firebaseAdmin.firestore();
    const membersRef = db.collection("tenants/test-tenant/members");
    const configRef = db
      .collection("tenants/test-tenant/config")
      .doc("integrations");

    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 10);
    const recentDate = new Date();

    // 1. Seed last sync run
    await configRef.set({ lastPushpaySync: pastDate.toISOString() });

    // 2. Seed an edited member (updatedAt > lastSyncRun)
    await membersRef.add({
      pushpayIndividualId: "pushpay-existing-999",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith.edited@example.com",
      updatedAt: recentDate.toISOString(),
    });

    // 3. Mock PushPay update_individual
    const mockXmlResponse = `
      <ccb_api>
        <response>
          <individuals>
            <individual id="pushpay-existing-999" />
          </individuals>
        </response>
      </ccb_api>
    `;

    nock("https://api.pushpay.chms.test")
      .post("/")
      .query(
        (q) =>
          q.srv === "update_individual" &&
          q.individual_id === "pushpay-existing-999",
      )
      .reply(200, mockXmlResponse);

    // 4. Run the sync
    await pushIntegrations(firebaseAdmin);

    // 5. Verify the config was updated with a newer timestamp
    const configSnap = await configRef.get();
    const newTimestamp = configSnap.data()?.lastPushpaySync;
    expect(new Date(newTimestamp).getTime()).toBeGreaterThan(
      recentDate.getTime(),
    );
  });
});
