import { describe, it, expect, vi, beforeEach } from "vitest";
import * as chmsClient from "../../clients/chms.js";
import { FirebaseAdmin } from "../../config/firebase.js";
import { pushIntegrations } from "../push-integrations.js";

// Mock the dependencies
vi.mock("../../clients/chms.js");
vi.mock("../../clients/google-sheets.js");
vi.mock("../../env.js", () => ({
  getEnvironment: vi.fn().mockReturnValue({
    tenantId: "test-tenant",
    googleSpreadsheetId: "test-sheet",
  }),
}));

describe("pushIntegrations Unit Tests", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockFirestore: any;
  let mockFirebaseAdmin: FirebaseAdmin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMembersQuery: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConfigRef: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAdditionsQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock additions data
    const mockAdditionDoc = {
      id: "firebase-id-1",
      ref: { update: vi.fn() },
      data: () => ({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        syncedToPushpay: false,
      }),
    };

    mockAdditionsQuery = {
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [mockAdditionDoc] }),
    };

    // Mock members data (edited member)
    const mockMemberDoc = {
      id: "firebase-id-2",
      ref: { update: vi.fn() },
      data: () => ({
        pushpayIndividualId: "pushpay-id-123",
        firstName: "Edited",
        lastName: "User",
        email: "edited@example.com",
        region: "West",
        ministry: "Youth",
        pledge: 500,
        bibleTalk: "Westside BT",
        movedTo: "New York",
        reasonForFallaway: "Relocation",
        takeawayType: "Moveaway",
      }),
    };

    mockMembersQuery = {
      orderBy: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [mockMemberDoc] }),
    };

    mockConfigRef = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ lastPushpaySync: "2023-01-01T00:00:00.000Z" }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    const mockTakeawaysQuery = {
      get: vi.fn().mockResolvedValue({ docs: [] }),
    };

    const mockCollection = (path: string) => {
      if (path.includes("additions")) return mockAdditionsQuery;
      if (path.includes("members")) return mockMembersQuery;
      if (path.includes("takeaways")) return mockTakeawaysQuery;
      if (path.includes("config")) return { doc: () => mockConfigRef };
      return {
        doc: () => ({
          collection: mockCollection,
          update: vi.fn(),
        }),
        get: vi.fn(),
      };
    };

    mockFirestore = {
      collection: vi.fn(mockCollection),
      runTransaction: vi.fn((callback) =>
        callback({
          get: vi.fn().mockResolvedValue({ exists: false }),
        }),
      ),
    };

    mockFirebaseAdmin = {
      firestore: () => mockFirestore,
    } as unknown as FirebaseAdmin;

    // Set up return values for mocked clients
    vi.mocked(chmsClient.createIndividual).mockResolvedValue(`
      <ccb_api><response><individuals><individual id="new-123"></individual></individuals></response></ccb_api>
    `);
    vi.mocked(chmsClient.updateIndividual).mockResolvedValue("<xml>ok</xml>");
  });

  it("should map Firestore custom fields to PushPay udf_text and udf_pulldown correctly", async () => {
    // We only care about the edit pushing step for this test
    mockAdditionsQuery.get.mockResolvedValueOnce({ docs: [] });

    await pushIntegrations(mockFirebaseAdmin);

    // Verify updateIndividual was called with the correct custom field mappings
    expect(chmsClient.updateIndividual).toHaveBeenCalledWith(
      "pushpay-id-123",
      expect.objectContaining({
        udf_pulldown_6: "West", // region
        udf_pulldown_5: "Youth", // ministry
        udf_text_10: "500", // pledge
        udf_text_9: "Westside BT", // bibleTalk
        udf_text_11: "New York", // movedTo
        udf_text_12: "Relocation", // reasonForFallaway
      }),
    );
  });
  it("should push additions to PushPay and mark as synced", async () => {
    // Return empty for members so it only tests additions
    mockMembersQuery.get.mockResolvedValueOnce({ docs: [] });

    await pushIntegrations(mockFirebaseAdmin);

    // Verify createIndividual was called
    expect(chmsClient.createIndividual).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
      }),
    );

    // Verify addition was marked as synced
    const additionDoc = await mockAdditionsQuery
      .get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => res.docs[0]);
    expect(additionDoc.ref.update).toHaveBeenCalledWith({
      syncedToPushpay: true,
    });
  });
});
