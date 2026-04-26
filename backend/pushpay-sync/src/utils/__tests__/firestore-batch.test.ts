import admin from "firebase-admin";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdmin } from "../../config/firebase.js";
import { commitInChunks } from "../firestore-batch.js";

// Mock FirebaseAdmin and its firestore().batch() method
vi.mock("../../config/firebase.js", () => ({
  FirebaseAdmin: vi.fn().mockImplementation(function () {
    const mockBatchInstance: admin.firestore.WriteBatch = {
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(null),
      // Add other batch methods if they are used in the code under test
      // e.g., update, delete, create
    } as unknown as admin.firestore.WriteBatch; // Cast to satisfy the interface

    const mockFirestoreInstance: admin.firestore.Firestore = {
      batch: vi.fn().mockReturnValue(mockBatchInstance),
      // Add other firestore methods if they are used in the code under test
      // e.g., collection, doc, runTransaction
    } as unknown as admin.firestore.Firestore; // Cast to satisfy the interface

    return {
      firestore: vi.fn().mockReturnValue(mockFirestoreInstance),
    };
  }),
}));

describe("commitInChunks", () => {
  let firebaseAdmin: FirebaseAdmin;
  let mockBatch: admin.firestore.WriteBatch;
  let mockFirestore: admin.firestore.Firestore;

  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAdmin = new FirebaseAdmin();
    mockFirestore = firebaseAdmin.firestore();
    mockBatch = mockFirestore.batch();

    // Clear call history from setup so it doesn't interfere with test assertions
    vi.mocked(firebaseAdmin.firestore).mockClear();
    vi.mocked(mockFirestore.batch).mockClear();
  });

  it("should commit items in a single chunk if items count is less than CHUNK_SIZE", async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const mockFn = vi.fn();

    await commitInChunks(firebaseAdmin, items, mockFn);

    expect(mockFirestore.batch).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(items.length);
    expect(mockFn).toHaveBeenCalledWith(mockBatch, items[0], 0);
    expect(mockFn).toHaveBeenCalledWith(mockBatch, items[1], 1);
    expect(mockFn).toHaveBeenCalledWith(mockBatch, items[2], 2);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it("should commit items in multiple chunks if items count exceeds CHUNK_SIZE", async () => {
    const CHUNK_SIZE = 500; // As defined in firestore-batch.ts
    const items = Array.from({ length: CHUNK_SIZE * 2 + 10 }, (_, i) => ({
      id: i,
    })); // 2 full chunks + 10 items
    const mockFn = vi.fn();

    await commitInChunks(firebaseAdmin, items, mockFn);

    const expectedChunks = Math.ceil(items.length / CHUNK_SIZE);
    expect(mockFirestore.batch).toHaveBeenCalledTimes(expectedChunks);
    expect(mockFn).toHaveBeenCalledTimes(items.length);
    expect(mockBatch.commit).toHaveBeenCalledTimes(expectedChunks);

    // Verify that the set method was called for each item with correct index
    for (let i = 0; i < items.length; i++) {
      expect(mockFn).toHaveBeenCalledWith(expect.any(Object), items[i], i);
    }
  });

  it("should not call batch.commit if the items array is empty", async () => {
    const items: unknown[] = [];
    const mockFn = vi.fn();

    await commitInChunks(firebaseAdmin, items, mockFn);

    expect(mockFirestore.batch).not.toHaveBeenCalled();
    expect(mockFn).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("should pass the correct batch and item to the callback function", async () => {
    const items = [{ name: "item1" }];
    const mockFn = vi.fn((batch, item) => {
      batch.set({ ref: "some_ref" }, item);
    });

    await commitInChunks(firebaseAdmin, items, mockFn);

    expect(mockFn).toHaveBeenCalledWith(mockBatch, items[0], 0);
    expect(mockBatch.set).toHaveBeenCalledWith(
      { ref: "some_ref" },
      { name: "item1" },
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });
});
