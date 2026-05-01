import admin from "firebase-admin";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPushpayChms } from "../../clients/chms.js";
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

type SyncMonitorMock = typeof import("../../utils/sync-monitor.js") & {
  getMockInstance: () => {
    start: ReturnType<typeof vi.fn>;
    recordFirestoreWrites: ReturnType<typeof vi.fn>;
    recordMembersProcessed: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;
  };
};

vi.mock("../../clients/chms.js");
vi.mock("../../helpers/pushpay-parser.js");
vi.mock("../../utils/firestore-batch.js", () => ({
  commitInChunks: vi.fn(),
}));
vi.mock("../../utils/cache.js");
vi.mock("../../utils/github-cache.js");
vi.mock("../../utils/sleep.js", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../utils/sync-monitor.js", () => {
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
              label: "Type (PM, Restoration, Baptism or Mission Team)",
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

    const result = await processGroup(firebaseAdmin, 10);

    expect(mockedFetchPushpayChms).toHaveBeenCalledWith(10);
    expect(mockedParseIndividuals).toHaveBeenCalledWith(mockXml);
    expect(result.individuals).toHaveLength(1);
    expect(mockedCommitInChunks).toHaveBeenCalled();
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
    );

    expect(console.log).toHaveBeenCalledWith("Total pledge:", 100);
  });

  it("syncMembers should orchestrate the group sync with monitoring", async () => {
    // Ensure consistent behavior across local and CI environments
    delete process.env.GITHUB_ACTIONS;

    const syncMonitorMock = await import("../../utils/sync-monitor.js");
    const getMockInstance = (syncMonitorMock as SyncMonitorMock)
      .getMockInstance;

    mockedFetchPushpayChms.mockResolvedValue("<xml/>");
    mockedParseIndividuals.mockReturnValue([]);

    await syncMembers(firebaseAdmin);

    const monitorInstance = getMockInstance();
    expect(monitorInstance.start).toHaveBeenCalledWith("manual");
    expect(monitorInstance.recordMembersProcessed).toHaveBeenCalledWith(0);
    expect(monitorInstance.complete).toHaveBeenCalled();
    // 5 processGroup calls: 2 (active), 40-43 (takeaways to delete)
    expect(mockedFetchPushpayChms).toHaveBeenCalledTimes(5);
    expect(mockedFetchPushpayChms).toHaveBeenCalledWith(2);
  });

  it("syncMembers should handle errors and fail monitoring", async () => {
    const syncMonitorMock =
      (await import("../../utils/sync-monitor.js")) as SyncMonitorMock;
    const getMockInstance = syncMonitorMock.getMockInstance;

    const error = new Error("API Error");
    mockedFetchPushpayChms.mockRejectedValue(error);

    await expect(syncMembers(firebaseAdmin)).rejects.toThrow("API Error");

    const monitorInstance = getMockInstance();
    expect(monitorInstance.start).toHaveBeenCalled();
    expect(monitorInstance.fail).toHaveBeenCalledWith(error);
  });

  it("should handle empty individuals list gracefully", async () => {
    await processIndividuals(firebaseAdmin, []);

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

      await processIndividuals(firebaseAdmin, [
        mockIndividual as PushpayIndividual,
      ]);

      const lastCallIdx = mockedCommitInChunks.mock.calls.length - 1;
      const lastCall = mockedCommitInChunks.mock.calls[lastCallIdx];
      if (!lastCall)
        throw new Error(`commitInChunks was not called for ${region}`);

      const docs = lastCall[1] as unknown as { data: MemberDoc }[];

      expect(docs[0].data.superRegion).toBe(expectedSuper);
    }
  });
});
