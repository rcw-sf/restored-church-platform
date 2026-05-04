import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdmin } from "../../config/firebase.js";
import { MemberDoc } from "../../types/members.js";
import { loadMappingData } from "../member-loader.js";

describe("loadMappingData", () => {
  let mockFirebaseAdmin: FirebaseAdmin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMembersQuery: any;

  beforeEach(() => {
    // Create mock for members subcollection query
    mockMembersQuery = {
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      startAfter: vi.fn().mockReturnThis(),
      get: vi.fn(),
    };

    // Create mock for tenant doc that returns members collection
    const mockTenantDoc = {
      collection: vi.fn().mockReturnValue(mockMembersQuery),
    };

    // Create mock for tenants collection
    const mockTenantsCollection = {
      doc: vi.fn().mockReturnValue(mockTenantDoc),
    };

    // Create the firestore mock
    const mockFirestore = {
      collection: vi.fn((name: string) => {
        if (name === "tenants") return mockTenantsCollection;
        return mockMembersQuery;
      }),
    };

    mockFirebaseAdmin = {
      firestore: () => mockFirestore,
    } as unknown as FirebaseAdmin;
  });

  function createMockDoc(data: Partial<MemberDoc>, id: string = "doc-id") {
    return {
      id,
      data: () => ({
        individualId: data.individualId || `person-${id}`,
        firstName: data.firstName || "John",
        lastName: data.lastName || "Doe",
        pledge: data.pledge || 0,
        region: data.region || "North",
        ministry: data.ministry || "Worship",
        familyId: data.familyId || null,
        pushpayCommunityMemberKey: data.pushpayCommunityMemberKey || null,
        pushpaySpouseCommunityMemberKey:
          data.pushpaySpouseCommunityMemberKey || null,
        ...data,
      }),
    };
  }

  function createMockSnapshot(docs: ReturnType<typeof createMockDoc>[]) {
    return {
      empty: docs.length === 0,
      docs,
      forEach: (callback: (doc: (typeof docs)[0]) => void) => {
        docs.forEach(callback);
      },
    };
  }

  it("should load members and create lookup by individualId", async () => {
    mockMembersQuery.get
      .mockResolvedValueOnce(
        createMockSnapshot([
          createMockDoc({ individualId: "person-1" }, "doc-1"),
          createMockDoc({ individualId: "person-2" }, "doc-2"),
        ]),
      )
      .mockResolvedValueOnce(createMockSnapshot([]));

    const result = await loadMappingData(mockFirebaseAdmin);

    expect(result["person-1"]).toBeDefined();
    expect(result["person-1"].individualId).toBe("person-1");
    expect(result["person-2"]).toBeDefined();
    expect(result["person-2"].individualId).toBe("person-2");
  });

  it("should index members by pushpayCommunityMemberKey", async () => {
    mockMembersQuery.get
      .mockResolvedValueOnce(
        createMockSnapshot([
          createMockDoc(
            {
              individualId: "person-1",
              pushpayCommunityMemberKey: "community-abc",
            },
            "doc-1",
          ),
        ]),
      )
      .mockResolvedValueOnce(createMockSnapshot([]));

    const result = await loadMappingData(mockFirebaseAdmin);

    expect(result["community-abc"]).toBeDefined();
    expect(result["community-abc"].individualId).toBe("person-1");
  });

  it("should index members by pushpaySpouseCommunityMemberKey", async () => {
    mockMembersQuery.get
      .mockResolvedValueOnce(
        createMockSnapshot([
          createMockDoc(
            {
              individualId: "person-1",
              pushpaySpouseCommunityMemberKey: "spouse-community-xyz",
            },
            "doc-1",
          ),
        ]),
      )
      .mockResolvedValueOnce(createMockSnapshot([]));

    const result = await loadMappingData(mockFirebaseAdmin);

    expect(result["spouse-community-xyz"]).toBeDefined();
    expect(result["spouse-community-xyz"].individualId).toBe("person-1");
  });

  it("should handle pagination for large datasets", async () => {
    // First page
    const doc100 = createMockDoc({ individualId: "person-100" }, "doc-100");
    mockMembersQuery.get
      .mockResolvedValueOnce(
        createMockSnapshot(
          Array(100)
            .fill(null)
            .map((_, i) =>
              createMockDoc({ individualId: `person-${i}` }, `doc-${i}`),
            )
            .concat(doc100),
        ),
      )
      .mockResolvedValueOnce(
        createMockSnapshot([
          createMockDoc({ individualId: "person-101" }, "doc-101"),
        ]),
      )
      .mockResolvedValueOnce(createMockSnapshot([]));

    const result = await loadMappingData(mockFirebaseAdmin);

    expect(mockMembersQuery.startAfter).toHaveBeenCalledWith(doc100);
    expect(result["person-100"]).toBeDefined();
    expect(result["person-101"]).toBeDefined();
  });

  it("should select only required fields", async () => {
    mockMembersQuery.get.mockResolvedValueOnce(createMockSnapshot([]));

    await loadMappingData(mockFirebaseAdmin);

    expect(mockMembersQuery.select).toHaveBeenCalledWith(
      "individualId",
      "firstName",
      "lastName",
      "pledge",
      "region",
      "ministry",
      "familyId",
      "familyMembers",
      "pushpayCommunityMemberKey",
      "pushpaySpouseCommunityMemberKey",
    );
  });

  it("should order by individualId", async () => {
    mockMembersQuery.get.mockResolvedValueOnce(createMockSnapshot([]));

    await loadMappingData(mockFirebaseAdmin);

    expect(mockMembersQuery.orderBy).toHaveBeenCalledWith("individualId");
  });

  it("should limit batch size to 100", async () => {
    mockMembersQuery.get.mockResolvedValueOnce(createMockSnapshot([]));

    await loadMappingData(mockFirebaseAdmin);

    expect(mockMembersQuery.limit).toHaveBeenCalledWith(100);
  });

  it("should handle empty collection", async () => {
    mockMembersQuery.get.mockResolvedValueOnce(createMockSnapshot([]));

    const result = await loadMappingData(mockFirebaseAdmin);

    expect(result).toEqual({});
  });

  it("should skip members without individualId", async () => {
    mockMembersQuery.get
      .mockResolvedValueOnce(
        createMockSnapshot([
          createMockDoc({ individualId: "" }, "doc-1"),
          createMockDoc({ individualId: "person-1" }, "doc-2"),
        ]),
      )
      .mockResolvedValueOnce(createMockSnapshot([]));

    const result = await loadMappingData(mockFirebaseAdmin);

    expect(result["person-1"]).toBeDefined();
    expect(Object.keys(result)).toHaveLength(1);
  });
});
