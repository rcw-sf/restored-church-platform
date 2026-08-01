import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as chmsClient from "../../clients/chms.js";
import * as googleSheetsClient from "../../clients/google-sheets.js";
import { FirebaseAdmin } from "../../config/firebase.js";
import {
  pushAdditionsToPushpay,
  pushEditsToPushpay,
  pushToGoogleSheets,
} from "../push-integrations.js";

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
  let mockFirestore: { collection: Mock; runTransaction: Mock };
  let mockFirebaseAdmin: FirebaseAdmin;
  let mockMembersQuery: { orderBy?: Mock; where?: Mock; get: Mock };
  let mockConfigRef: { get: Mock; update: Mock; set: Mock };
  let mockAdditionsQuery: { where?: Mock; get: Mock };

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
        phone: "555-0100",
        gender: "Male",
        region: "San Francisco",
        ministry: "Campus",
        bibleTalk: "Northside BT",
        pledge: 100,
        birthdate: "1995-01-01",
        baptizedDate: "2015-05-10",
        homeAddress: "123 Test St",
        notes: "Addition notes",
        type: "Baptism",
        createdAt: "2023-01-01T12:00:00.000Z",
        syncedToPushpay: false,
        superRegion: "Peninsula",
        pushpaySpouseCommunityMemberKey: "spouse-key-1",
        pushpayCommunityMemberKey: "community-key-1",
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
        phone: "555-0200",
        gender: "Female",
        region: "San Jose",
        ministry: "Teens",
        pledge: 500,
        bibleTalk: "Westside BT",
        birthdate: "1990-02-02",
        baptizedDate: "2010-06-20",
        homeAddress: "456 Edit Ave",
        notes: "Member notes",
        movedTo: "New York",
        reasonForFallaway: "Relocation",
        takeawayType: "Transfer",
        superRegion: "South Bay",
        pushpaySpouseCommunityMemberKey: "spouse-key-2",
        pushpayCommunityMemberKey: "community-key-2",
        membershipStartDate: "2020-01-01",
        type: "Place Membership",
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

    // Mock takeaway data
    const mockTakeawayDoc = {
      id: "firebase-id-3",
      data: () => ({
        firstName: "Takeaway",
        lastName: "User",
        email: "takeaway@example.com",
        phone: "555-0300",
        gender: "Male",
        region: "Berkeley",
        ministry: "Singles",
        pledge: 50,
        bibleTalk: "Southside BT",
        birthdate: "1985-03-03",
        baptizedDate: "2005-07-30",
        homeAddress: "789 Takeaway Blvd",
        notes: "Takeaway notes",
        takeawayType: "Fallaway",
        movedTo: "Texas",
        createdAt: "2023-01-02T12:00:00.000Z",
      }),
    };

    const mockTakeawaysQuery = {
      get: vi.fn().mockResolvedValue({ docs: [mockTakeawayDoc] }),
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

  describe("pushEditsToPushpay", () => {
    it("should map Firestore custom fields to PushPay udf_text and udf_pulldown correctly", async () => {
      await pushEditsToPushpay(mockFirebaseAdmin);

      // Verify updateIndividual was called with the entire mapped object
      expect(chmsClient.updateIndividual).toHaveBeenCalledWith(
        "pushpay-id-123",
        {
          first_name: "Edited",
          last_name: "User",
          email: "edited@example.com",
          mobile_phone: "555-0200",
          gender: "f",
          birthday: "1990-02-02",
          membership_date: "2020-01-01",
          udf_pulldown_6: "San Jose",
          udf_pulldown_5: "Teens",
          udf_text_10: "500",
          udf_text_9: "Westside BT",
          udf_date_6: "2010-06-20",
          udf_pulldown_2: "South Bay",
          udf_pulldown_4: "Place Membership",
          udf_text_7: "spouse-key-2",
          udf_text_8: "community-key-2",
          udf_text_11: "New York",
          udf_text_12: "Relocation",
        },
      );
    });
  });

  describe("pushAdditionsToPushpay", () => {
    it("should push additions to PushPay and mark as synced", async () => {
      await pushAdditionsToPushpay(mockFirebaseAdmin);

      // Verify createIndividual was called with the entire mapped object
      expect(chmsClient.createIndividual).toHaveBeenCalledWith({
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        mobile_phone: "555-0100",
        gender: "m",
        birthday: "1995-01-01",
        membership_date: undefined,
        udf_pulldown_6: "San Francisco",
        udf_pulldown_5: "Campus",
        udf_text_10: "100",
        udf_text_9: "Northside BT",
        udf_date_6: "2015-05-10",
        udf_pulldown_2: "Peninsula",
        udf_pulldown_4: "Baptism",
        udf_text_7: "spouse-key-1",
        udf_text_8: "community-key-1",
        udf_text_11: undefined,
        udf_text_12: undefined,
      });

      // Verify addition was marked as synced
      const res = await mockAdditionsQuery.get();
      const additionDoc = res.docs[0] as { ref: { update: Mock } };
      expect(additionDoc.ref.update).toHaveBeenCalledWith({
        syncedToPushpay: true,
      });
    });
  });

  describe("pushToGoogleSheets", () => {
    it("should clear and append to sheets with mapped data", async () => {
      await pushToGoogleSheets(mockFirebaseAdmin);

      expect(googleSheetsClient.clearSheet).toHaveBeenCalledWith("ADDITIONS");
      expect(googleSheetsClient.appendToAdditionsSheet).toHaveBeenCalledWith([
        {
          id: "firebase-id-1",
          date: "01/01/2023",
          type: "Baptism",
          firstName: "Test",
          lastName: "User",
          gender: "Male",
          region: "San Francisco",
          ministry: "Campus",
          bibleTalk: "Northside BT",
          weeklyPledge: "100",
          phone: "555-0100",
          email: "test@example.com",
          physicalBirthday: "1995-01-01",
          spiritualBirthday: "2015-05-10",
          homeAddress: "123 Test St",
          notes: "Addition notes",
        },
      ]);

      expect(googleSheetsClient.clearSheet).toHaveBeenCalledWith(
        "MEMBERSHIP LIST",
      );
      expect(
        googleSheetsClient.appendToMembershipListSheet,
      ).toHaveBeenCalledWith([
        {
          id: "firebase-id-2",
          firstName: "Edited",
          lastName: "User",
          gender: "Female",
          region: "San Jose",
          ministry: "Teens",
          bibleTalk: "Westside BT",
          weeklyPledge: "500",
          phone: "555-0200",
          email: "edited@example.com",
          physicalBirthday: "1990-02-02",
          spiritualBirthday: "2010-06-20",
          homeAddress: "456 Edit Ave",
          notes: "Member notes",
        },
      ]);

      expect(googleSheetsClient.clearSheet).toHaveBeenCalledWith("TAKEAWAYS");
      expect(googleSheetsClient.appendToTakeawaysSheet).toHaveBeenCalledWith([
        {
          id: "firebase-id-3",
          date: "01/02/2023",
          type: "Fallaway",
          firstName: "Takeaway",
          lastName: "User",
          gender: "Male",
          region: "Berkeley",
          ministry: "Singles",
          bibleTalk: "Southside BT",
          weeklyPledge: "50",
          phone: "555-0300",
          email: "takeaway@example.com",
          physicalBirthday: "1985-03-03",
          spiritualBirthday: "2005-07-30",
          homeAddress: "789 Takeaway Blvd",
          movedTo: "Texas",
          notes: "Takeaway notes",
        },
      ]);
    });
  });
});
