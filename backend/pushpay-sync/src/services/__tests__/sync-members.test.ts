import admin from "firebase-admin";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPushpayChms } from "../../clients/pushpay.js";
import { FirebaseAdmin } from "../../config/firebase.js";
import { parseIndividuals } from "../../helpers/pushpay-parser.js";
import { MemberDoc } from "../../types/members.js";
import { PushpayIndividual } from "../../types/pushpay.js";
import { commitInChunks } from "../../utils/firestore-batch.js";
import {
  syncMembers,
  processGroup,
  processIndividuals,
} from "../sync-members.js";

vi.mock("../../clients/pushpay.js");
vi.mock("../../helpers/pushpay-parser.js");

vi.mock("../../utils/firestore-batch.js", () => ({
  commitInChunks: vi.fn(),
}));

vi.mock("../../config/firebase.js", () => ({
  FirebaseAdmin: vi.fn().mockImplementation(function () {
    return {
      firestore: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnThis(),
        doc: vi.fn().mockReturnThis(),
        batch: vi.fn().mockReturnValue({
          set: vi.fn(),
          commit: vi.fn().mockResolvedValue(null),
        }),
      }),
    };
  }),
}));

vi.mock("firebase-admin", () => {
  const FieldValue = {
    serverTimestamp: vi.fn(() => ({ type: "serverTimestamp" })),
  };
  const firestoreMock = Object.assign(vi.fn(), { FieldValue });
  return {
    default: {
      firestore: firestoreMock,
    },
    firestore: firestoreMock,
  };
});

const mockedFetchPushpayChms = vi.mocked(fetchPushpayChms);
const mockedParseIndividuals = vi.mocked(parseIndividuals);
const mockedCommitInChunks = vi.mocked(commitInChunks);

describe("syncMembers service", () => {
  let firebaseAdmin: FirebaseAdmin;

  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAdmin = new FirebaseAdmin();
    // Suppress console logs during tests to keep output clean
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("processIndividuals should map fields correctly and sync to firestore", async () => {
    const mockIndividuals: Partial<PushpayIndividual>[] = [
      {
        id: "pushpay-1",
        first_name: "John",
        last_name: "Doe",
        gender: "Male",
        email: "john@doe.com",
        birthday: "1980-05-20",
        membership_date: "2020-01-01",
        user_defined_text_fields: {
          user_defined_text_field: [
            { label: "Pledge", text: { "#text": "100" } },
          ],
        },
        user_defined_pulldown_fields: {
          user_defined_pulldown_field: [
            {
              label: "Region",
              selection: {
                "#text": "San Mateo",
                id: "region-123",
              },
            },
            {
              label: "Ministry",
              selection: {
                "#text": "Marrieds",
                id: "ministry-123",
              },
            },
            {
              label: "Type",
              selection: {
                // Type as object
                "#text": "Baptism",
                id: "type-123",
              },
            },
          ],
        },
        phones: { phone: [{ "#text": "555-1234", type: "Home" }] },
        family: { id: "family-123" },
        family_position: "Primary Contact",
      },
    ];

    mockedCommitInChunks.mockImplementation(
      async (
        adminInstance: FirebaseAdmin,
        items: unknown[],
        fn: (batch: admin.firestore.WriteBatch, item: unknown) => void,
      ) => {
        const mockBatch = adminInstance
          .firestore()
          .batch() as unknown as admin.firestore.WriteBatch;
        for (const item of items) {
          fn(mockBatch, item);
        }
      },
    );

    await processIndividuals(
      firebaseAdmin,
      mockIndividuals as PushpayIndividual[],
      true,
    );

    expect(commitInChunks).toHaveBeenCalled();

    const firstCall = mockedCommitInChunks.mock.calls[0];
    if (!firstCall) throw new Error("commitInChunks was not called");

    const docs = firstCall[1] as { id: string; data: MemberDoc }[];

    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe("pushpay-1");
    const memberDoc = docs[0].data;
    expect(memberDoc).toMatchObject({
      individualId: "pushpay-1",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      region: "San Mateo",
      superRegion: "Peninsula",
      ministry: "Marrieds",
      pledge: 100,
      phone: "555-1234",
      email: "john@doe.com",
      birthdate: "1980-05-20",
      type: "Baptism",
      isMember: true,
      updatedAt: expect.objectContaining({ type: "serverTimestamp" }),
    });
  });

  it("processGroup should call fetch, parse, and process individuals", async () => {
    const mockXml = "<xml>data</xml>";
    const mockIndividuals = [{ id: "1", first_name: "Test" }];

    mockedFetchPushpayChms.mockResolvedValue(mockXml);
    mockedParseIndividuals.mockReturnValue(
      mockIndividuals as PushpayIndividual[],
    );

    const result = await processGroup(firebaseAdmin, 10, true, "TestType");

    expect(mockedFetchPushpayChms).toHaveBeenCalledWith(10);
    expect(mockedParseIndividuals).toHaveBeenCalledWith(mockXml);
    expect(result).toBe(1);
    expect(mockedCommitInChunks).toHaveBeenCalled();
  });

  it("processIndividuals should correctly map non-member fields", async () => {
    const mockIndividuals: Partial<PushpayIndividual>[] = [
      {
        id: "fallaway-1",
        first_name: "Fallen",
        last_name: "Away",
        membership_end: "2023-12-31",
        user_defined_text_fields: {
          user_defined_text_field: [
            {
              label: "Reason for Fallaway",
              text: { "#text": "Moved to another city" },
            },
            {
              label: "Moved To (for Moveaways)",
              text: { "#text": "New York" },
            },
          ],
        },
      },
    ];

    mockedCommitInChunks.mockImplementation(
      async (
        adminInstance: FirebaseAdmin,
        items: unknown[],
        fn: (batch: admin.firestore.WriteBatch, item: unknown) => void,
      ) => {
        const mockBatch = adminInstance
          .firestore()
          .batch() as unknown as admin.firestore.WriteBatch;
        for (const item of items) {
          fn(mockBatch, item);
        }
      },
    );

    await processIndividuals(
      firebaseAdmin,
      mockIndividuals as PushpayIndividual[],
      false,
      "Fallaway",
    );

    const firstCall = mockedCommitInChunks.mock.calls[0];
    const docs = firstCall[1] as { id: string; data: MemberDoc }[];
    const memberDoc = docs[0].data;

    expect(memberDoc).toMatchObject({
      individualId: "fallaway-1",
      isMember: false,
      membershipStopDate: "2023-12-31",
      reasonForFallaway: "Moved to another city",
      movedTo: "New York",
      takeawayType: "Fallaway",
    });
  });

  it("processIndividuals should log total pledge amount", async () => {
    const mockIndividuals: Partial<PushpayIndividual>[] = [
      {
        id: "1",
        user_defined_text_fields: {
          user_defined_text_field: [
            { label: "Pledge", text: { "#text": "50.50" } },
          ],
        },
      },
      {
        id: "2",
        user_defined_text_fields: {
          user_defined_text_field: [
            { label: "Pledge", text: { "#text": "49.50" } },
          ],
        },
      },
    ];

    await processIndividuals(
      firebaseAdmin,
      mockIndividuals as PushpayIndividual[],
      true,
    );

    expect(console.log).toHaveBeenCalledWith("Total pledge:", 100);
  });

  it("syncMembers should orchestrate the group sync", async () => {
    mockedFetchPushpayChms.mockResolvedValue("<xml/>");
    mockedParseIndividuals.mockReturnValue([]);

    await syncMembers(firebaseAdmin);

    expect(mockedFetchPushpayChms).toHaveBeenCalledTimes(1);
    expect(mockedFetchPushpayChms).toHaveBeenCalledWith(2);
  });

  it("should handle empty individuals list gracefully", async () => {
    await processIndividuals(firebaseAdmin, [], true);

    expect(mockedCommitInChunks).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("No members found");
  });

  it("should correctly map super regions based on region selection", async () => {
    const testCases = [
      { region: "San Francisco", expectedSuper: "Peninsula" },
      { region: "San Jose", expectedSuper: "South Bay" },
      { region: "Hayward", expectedSuper: "East Bay" },
      { region: "Unknown", expectedSuper: "" },
    ];

    for (const { region, expectedSuper } of testCases) {
      const mockIndividual: Partial<PushpayIndividual> = {
        id: "id",
        user_defined_pulldown_fields: {
          user_defined_pulldown_field: [
            {
              label: "Region",
              selection: {
                "#text": region,
                id: "region-123",
              },
            },
          ],
        },
      };
      mockedParseIndividuals.mockReturnValue([
        mockIndividual as PushpayIndividual,
      ]);

      await processIndividuals(
        firebaseAdmin,
        [mockIndividual as PushpayIndividual],
        true,
      );

      const lastCallIdx = mockedCommitInChunks.mock.calls.length - 1;
      const lastCall = mockedCommitInChunks.mock.calls[lastCallIdx];
      if (!lastCall)
        throw new Error(`commitInChunks was not called for ${region}`);

      const docs = lastCall[1] as unknown as { data: MemberDoc }[];

      expect(docs[0].data.superRegion).toBe(expectedSuper);
    }
  });
});
