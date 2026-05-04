import { existsSync } from "fs";
import { writeFileSync, readFileSync, mkdirSync, statSync, Stats } from "fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemberLookup } from "../../types/giving.js";
import {
  loadCachedMemberData,
  saveMemberDataToCache,
  getCacheInfo,
} from "../cache.js";

// Mock fs functions
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
  rmSync: vi.fn(),
}));

describe("Cache Utils", () => {
  const mockMemberLookup: MemberLookup = {
    individual1: {
      individualId: "individual1",
      firstName: "John",
      lastName: "Doe",
      pledge: 100,
      region: "San Mateo",
      ministry: "Worship",
      familyId: "family1",
      pushpayCommunityMemberKey: "key1",
      pushpaySpouseCommunityMemberKey: "spouse1",
      tenantId: "test-tenant",
    },
    key2: {
      individualId: "individual2",
      firstName: "Jane",
      lastName: "Smith",
      pledge: 50,
      region: "San Jose",
      ministry: "Children",
      familyId: "family2",
      pushpayCommunityMemberKey: "key2",
      tenantId: "test-tenant",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("saveMemberDataToCache", () => {
    it("should save member data to cache file", () => {
      const mockWriteFileSync = vi.mocked(writeFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockMkdirSync = vi.mocked(mkdirSync);

      mockExistsSync.mockReturnValue(false);

      saveMemberDataToCache(mockMemberLookup, "2026-04-25");

      expect(mockExistsSync).toHaveBeenCalled();
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".cache"),
        { recursive: true },
      );
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("member-data.json"),
        expect.stringContaining("2026-04-25"),
      );
    });

    it("should not create directory if it already exists", () => {
      const mockWriteFileSync = vi.mocked(writeFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockMkdirSync = vi.mocked(mkdirSync);

      mockExistsSync.mockReturnValue(true);

      saveMemberDataToCache(mockMemberLookup, "2026-04-25");

      expect(mockMkdirSync).not.toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should handle write errors gracefully", () => {
      const mockWriteFileSync = vi.mocked(writeFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockConsoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Write failed");
      });

      expect(() => {
        saveMemberDataToCache(mockMemberLookup, "2026-04-25");
      }).not.toThrow();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "⚠️ Failed to save cache:",
        expect.any(Error),
      );
    });
  });

  describe("loadCachedMemberData", () => {
    it("should load valid cached member data", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      const cacheData = {
        timestamp: Date.now() - 1000, // 1 second ago
        lastSyncDate: "2026-04-25",
        memberLookup: mockMemberLookup,
      };

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ mtime: new Date() } as unknown as Stats);
      mockReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const result = loadCachedMemberData();

      expect(result).toEqual(mockMemberLookup);
      expect(mockReadFileSync).toHaveBeenCalled();
    });

    it("should return null if cache file does not exist", () => {
      const mockExistsSync = vi.mocked(existsSync);

      mockExistsSync.mockReturnValue(false);

      const result = loadCachedMemberData();

      expect(result).toBeNull();
    });

    it("should return null if cache is expired", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      const expiredCacheData = {
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        lastSyncDate: "2026-04-24",
        memberLookup: mockMemberLookup,
      };

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ mtime: new Date() } as unknown as Stats);
      mockReadFileSync.mockReturnValue(JSON.stringify(expiredCacheData));

      const result = loadCachedMemberData();

      expect(result).toBeNull();
    });

    it("should return null if cache data is invalid JSON", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ mtime: new Date() } as unknown as Stats);
      mockReadFileSync.mockReturnValue("invalid json");

      const result = loadCachedMemberData();

      expect(result).toBeNull();
    });

    it("should handle read errors gracefully", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Read failed");
      });

      const result = loadCachedMemberData();

      expect(result).toBeNull();
    });
  });

  describe("getCacheInfo", () => {
    it("should return cache info when cache exists", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      const cacheData = {
        timestamp: Date.now() - 1000,
        lastSyncDate: "2026-04-25",
        memberLookup: mockMemberLookup,
      };

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        size: 1024,
        mtime: new Date(Date.now() - 5000),
      } as unknown as Stats);
      mockReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const result = getCacheInfo();

      expect(result).toEqual({
        exists: true,
        age: expect.any(Number),
        size: 1024,
      });
      expect(result?.age).toBeGreaterThan(0);
    });

    it("should return null info when cache does not exist", () => {
      const mockExistsSync = vi.mocked(existsSync);

      mockExistsSync.mockReturnValue(false);

      const result = getCacheInfo();

      expect(result).toEqual({
        exists: false,
        age: 0,
        size: 0,
      });
    });

    it("should handle stat errors gracefully", () => {
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockImplementation(() => {
        throw new Error("Stat failed");
      });

      const result = getCacheInfo();

      expect(result).toBeNull();
    });

    it("should handle invalid JSON in cache file", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({
        size: 512,
        mtime: new Date(),
      } as unknown as Stats);
      mockReadFileSync.mockReturnValue("invalid json");

      const result = getCacheInfo();

      expect(result).toBeNull();
    });
  });

  describe("cache lifecycle", () => {
    it("should save and load cache data correctly", () => {
      const mockReadFileSync = vi.mocked(readFileSync);
      const mockExistsSync = vi.mocked(existsSync);
      const mockStatSync = vi.mocked(statSync);

      // Save cache
      mockExistsSync.mockReturnValue(false);
      saveMemberDataToCache(mockMemberLookup, "2026-04-25");

      // Load cache
      const cacheData = {
        timestamp: Date.now() - 1000,
        lastSyncDate: "2026-04-25",
        memberLookup: mockMemberLookup,
      };

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ mtime: new Date() } as unknown as Stats);
      mockReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const loadedData = loadCachedMemberData();

      expect(loadedData).toEqual(mockMemberLookup);
    });

    it("should handle empty member lookup", () => {
      const mockWriteFileSync = vi.mocked(writeFileSync);
      const mockExistsSync = vi.mocked(existsSync);

      mockExistsSync.mockReturnValue(false);
      saveMemberDataToCache({}, "2026-04-25");

      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(writeCall[0]).toContain("member-data.json");
      const content = JSON.parse(writeCall[1] as string);
      expect(content.memberLookup).toEqual({});
      expect(content.lastSyncDate).toBe("2026-04-25");
    });

    it("should handle large member lookup", () => {
      const mockExistsSync = vi.mocked(existsSync);
      const mockWriteFileSync = vi.mocked(writeFileSync);

      const largeMemberLookup = mockMemberLookup as unknown;
      for (let i = 0; i < 1000; i++) {
        (largeMemberLookup as Record<string, unknown>)[`individual${i}`] = {
          ...mockMemberLookup.individual1,
          individualId: `individual${i}`,
        };
      }

      mockExistsSync.mockReturnValue(false);
      saveMemberDataToCache(
        largeMemberLookup as unknown as MemberLookup,
        "2026-04-25",
      );

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string,
      );
      expect(Object.keys(savedData.memberLookup).length).toBeGreaterThanOrEqual(
        1000,
      );
    });
  });
});
