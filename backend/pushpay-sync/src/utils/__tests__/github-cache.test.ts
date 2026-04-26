import { writeFileSync, readFileSync, existsSync } from "fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemberLookup } from "../../types/giving.js";
import {
  loadGitHubCacheMemberData,
  saveMemberDataToGitHubCache,
  getGitHubCachePath,
} from "../github-cache.js";

// Mock fs module
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedExistsSync = vi.mocked(existsSync);

describe("github-cache", () => {
  const originalEnv = process.env;
  const mockMemberLookup: MemberLookup = {
    "123": {
      individualId: "123",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      isMember: true,
      tenantId: "test-tenant",
    },
    "456": {
      individualId: "456",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      isMember: true,
      tenantId: "test-tenant",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadGitHubCacheMemberData", () => {
    it("should return null when not running in GitHub Actions", () => {
      delete process.env.GITHUB_ACTIONS;

      const result = loadGitHubCacheMemberData();

      expect(result).toBeNull();
      expect(mockedExistsSync).not.toHaveBeenCalled();
    });

    it("should return null when cache file does not exist", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(false);

      const result = loadGitHubCacheMemberData();

      expect(result).toBeNull();
      expect(mockedExistsSync).toHaveBeenCalled();
    });

    it("should return null when cache is expired", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(true);

      const expiredCache = {
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        memberLookup: mockMemberLookup,
        lastSyncDate: "2023-01-01",
      };
      mockedReadFileSync.mockReturnValue(JSON.stringify(expiredCache));

      const result = loadGitHubCacheMemberData();

      expect(result).toBeNull();
      expect(mockedReadFileSync).toHaveBeenCalled();
    });

    it("should return cached data when cache is valid", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(true);

      const validCache = {
        timestamp: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
        memberLookup: mockMemberLookup,
        lastSyncDate: "2023-01-01",
      };
      mockedReadFileSync.mockReturnValue(JSON.stringify(validCache));

      const result = loadGitHubCacheMemberData();

      expect(result).toEqual(mockMemberLookup);
      expect(mockedReadFileSync).toHaveBeenCalled();
    });

    it("should return null when JSON parsing fails", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue("invalid json");

      const result = loadGitHubCacheMemberData();

      expect(result).toBeNull();
      expect(mockedReadFileSync).toHaveBeenCalled();
    });

    it("should return null when file reading throws error", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error("File read error");
      });

      const result = loadGitHubCacheMemberData();

      expect(result).toBeNull();
      expect(mockedReadFileSync).toHaveBeenCalled();
    });
  });

  describe("saveMemberDataToGitHubCache", () => {
    it("should not save when not running in GitHub Actions", () => {
      delete process.env.GITHUB_ACTIONS;

      saveMemberDataToGitHubCache(mockMemberLookup, "2023-01-01");

      expect(mockedWriteFileSync).not.toHaveBeenCalled();
    });

    it("should save data to cache file when running in GitHub Actions", () => {
      process.env.GITHUB_ACTIONS = "true";

      saveMemberDataToGitHubCache(mockMemberLookup, "2023-01-01");

      expect(mockedWriteFileSync).toHaveBeenCalled();

      const [filePath, jsonData] = mockedWriteFileSync.mock.calls[0];
      expect(typeof filePath).toBe("string");

      const parsedData = JSON.parse(jsonData as string);
      expect(parsedData.memberLookup).toEqual(mockMemberLookup);
      expect(parsedData.lastSyncDate).toBe("2023-01-01");
      expect(typeof parsedData.timestamp).toBe("number");
    });

    it("should handle write errors gracefully", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedWriteFileSync.mockImplementation(() => {
        throw new Error("Write error");
      });

      // Should not throw
      expect(() => {
        saveMemberDataToGitHubCache(mockMemberLookup, "2023-01-01");
      }).not.toThrow();

      expect(mockedWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("getGitHubCachePath", () => {
    it("should return a valid cache file path", () => {
      const result = getGitHubCachePath();

      // The function should return a string ending with the expected filename
      expect(typeof result).toBe("string");
      expect(result).toContain("member-data.json");
      expect(result.endsWith("member-data.json")).toBe(true);
    });

    it("should return a consistent path", () => {
      const result1 = getGitHubCachePath();
      const result2 = getGitHubCachePath();

      // Multiple calls should return the same result
      expect(result1).toBe(result2);
    });
  });

  describe("cache duration", () => {
    it("should respect 24 hour cache duration", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(true);

      // Test exactly 24 hours ago (should be expired)
      const exactly24HoursAgo = Date.now() - (24 * 60 * 60 * 1000 + 1); // Add 1ms to ensure it's expired
      const cacheData = {
        timestamp: exactly24HoursAgo,
        memberLookup: mockMemberLookup,
        lastSyncDate: "2023-01-01",
      };
      mockedReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const result = loadGitHubCacheMemberData();

      expect(result).toBeNull();
    });

    it("should accept cache just under 24 hours old", () => {
      process.env.GITHUB_ACTIONS = "true";
      mockedExistsSync.mockReturnValue(true);

      // Test 23 hours 59 minutes ago (should be valid)
      const justUnder24HoursAgo = Date.now() - (23 * 60 * 60 + 59 * 60) * 1000;
      const cacheData = {
        timestamp: justUnder24HoursAgo,
        memberLookup: mockMemberLookup,
        lastSyncDate: "2023-01-01",
      };
      mockedReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const result = loadGitHubCacheMemberData();

      expect(result).toEqual(mockMemberLookup);
    });
  });
});
