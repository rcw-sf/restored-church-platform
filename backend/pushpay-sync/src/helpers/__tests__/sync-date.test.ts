import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEnvironment } from "../../env.js";
import { getSyncDates } from "../sync-date";

// Mock dependencies
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

vi.mock("../services/giving-sync.js", () => ({
  syncGiving: vi.fn(),
}));

vi.mock("../config/firebase.js", () => {
  return {
    FirebaseAdmin: class MockFirebaseAdmin {
      firestore = vi.fn();
    },
  };
});

vi.mock("../../env.js", () => ({
  getEnvironment: vi.fn(() => ({
    syncFrom: undefined,
    syncTo: undefined,
    syncType: "yesterday",
  })),
}));

const mockedGetEnvironment = vi.mocked(getEnvironment);

describe("getSyncDates", () => {
  beforeEach(() => {
    // Reset to default mock behavior (no custom date range)
    mockedGetEnvironment.mockReturnValue({
      syncFrom: undefined,
      syncTo: undefined,
      syncType: "yesterday",
    } as ReturnType<typeof getEnvironment>);
  });
  describe("when custom date range is provided via environment", () => {
    it("should return custom date range when valid", () => {
      mockedGetEnvironment.mockReturnValue({
        syncFrom: "2023-06-01",
        syncTo: "2023-06-15",
      } as ReturnType<typeof getEnvironment>);

      const result = getSyncDates("yesterday");

      expect(result.from.toUTC().toISO()).toBe(
        DateTime.fromISO("2023-06-01", { zone: "America/Los_Angeles" })
          .toUTC()
          .toISO(),
      );
      expect(result.to.toUTC().toISO()).toBe(
        DateTime.fromISO("2023-06-15", { zone: "America/Los_Angeles" })
          .toUTC()
          .toISO(),
      );
    });

    it("should throw error for invalid date format", () => {
      mockedGetEnvironment.mockReturnValue({
        syncFrom: "invalid-date",
        syncTo: "2023-06-15",
      } as ReturnType<typeof getEnvironment>);

      expect(() => getSyncDates("yesterday")).toThrow(
        "Invalid date format in SYNC_FROM or SYNC_TO",
      );
    });

    it("should throw error when SYNC_FROM is after SYNC_TO", () => {
      mockedGetEnvironment.mockReturnValue({
        syncFrom: "2023-06-15",
        syncTo: "2023-06-01",
      } as ReturnType<typeof getEnvironment>);

      expect(() => getSyncDates("yesterday")).toThrow(
        "SYNC_FROM (2023-06-15) cannot be after SYNC_TO (2023-06-01)",
      );
    });

    it("should support ISO datetime format", () => {
      mockedGetEnvironment.mockReturnValue({
        syncFrom: "2023-06-01T08:30:00",
        syncTo: "2023-06-15T17:45:00",
      } as ReturnType<typeof getEnvironment>);

      const result = getSyncDates("yesterday");

      expect(result.from.toUTC().toISO()).toBe(
        DateTime.fromISO("2023-06-01T08:30:00", { zone: "America/Los_Angeles" })
          .toUTC()
          .toISO(),
      );
      expect(result.to.toUTC().toISO()).toBe(
        DateTime.fromISO("2023-06-15T17:45:00", { zone: "America/Los_Angeles" })
          .toUTC()
          .toISO(),
      );
    });
  });

  describe("when syncType is 'today'", () => {
    it("should return today's date range from start of day to current time", () => {
      const fixedNow = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 15,
          hour: 14,
          minute: 30,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(fixedNow.toJSDate());

      const result = getSyncDates("today");

      expect(result.from.toUTC().toISO()).toBe(
        fixedNow.startOf("day").toUTC().toISO(),
      );
      expect(result.to.toUTC().toISO()).toBe(fixedNow.toUTC().toISO());
    });

    it("should handle edge case at midnight", () => {
      const midnight = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 15,
          hour: 0,
          minute: 0,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(midnight.toJSDate());

      const result = getSyncDates("today");

      expect(result.from.toUTC().toISO()).toBe(
        midnight.startOf("day").toUTC().toISO(),
      );
      expect(result.to.toUTC().toISO()).toBe(midnight.toUTC().toISO());
    });
  });

  describe("when syncType is 'yesterday'", () => {
    it("should return yesterday's date range from start to end of day", () => {
      const fixedNow = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 15,
          hour: 14,
          minute: 30,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(fixedNow.toJSDate());

      const result = getSyncDates("yesterday");
      const expectedYesterday = fixedNow.minus({ days: 1 });

      expect(result.from.toUTC().toISO()).toBe(
        expectedYesterday.startOf("day").toUTC().toISO(),
      );
      expect(result.to.toUTC().toISO()).toBe(
        expectedYesterday.endOf("day").toUTC().toISO(),
      );
    });

    it("should handle month boundaries correctly", () => {
      const firstOfMonth = DateTime.fromObject(
        {
          year: 2023,
          month: 7,
          day: 1,
          hour: 10,
          minute: 0,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(firstOfMonth.toJSDate());

      const result = getSyncDates("yesterday");

      expect(result.from.month).toBe(6);
      expect(result.from.day).toBe(30);
      expect(result.to.month).toBe(6);
      expect(result.to.day).toBe(30);
    });

    it("should handle year boundaries correctly", () => {
      const newYear = DateTime.fromObject(
        {
          year: 2023,
          month: 1,
          day: 1,
          hour: 10,
          minute: 0,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(newYear.toJSDate());

      const result = getSyncDates("yesterday");

      expect(result.from.year).toBe(2022);
      expect(result.from.month).toBe(12);
      expect(result.from.day).toBe(31);
    });
  });

  describe("when syncType is 'weekly'", () => {
    it("should return date range from Monday to current time", () => {
      const thursday = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 15, // Thursday
          hour: 14,
          minute: 30,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(thursday.toJSDate());

      const result = getSyncDates("weekly");
      const expectedMonday = thursday.startOf("week");

      expect(result.from.toUTC().toISO()).toBe(expectedMonday.toUTC().toISO());
      expect(result.to.toUTC().toISO()).toBe(thursday.toUTC().toISO());
    });

    it("should handle when today is Monday", () => {
      const monday = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 12, // Monday
          hour: 10,
          minute: 0,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(monday.toJSDate());

      const result = getSyncDates("weekly");

      expect(result.from.toUTC().toISO()).toBe(
        monday.startOf("week").toUTC().toISO(),
      );
      expect(result.to.toUTC().toISO()).toBe(monday.toUTC().toISO());
    });

    it("should handle when today is Sunday", () => {
      const sunday = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 18, // Sunday
          hour: 20,
          minute: 0,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(sunday.toJSDate());

      const result = getSyncDates("weekly");
      const expectedMonday = sunday.startOf("week");

      expect(expectedMonday.day).toBe(12); // Monday of that week
      expect(result.from.toUTC().toISO()).toBe(expectedMonday.toUTC().toISO());
      expect(result.to.toUTC().toISO()).toBe(sunday.toUTC().toISO());
    });
  });

  describe("default behavior (all (not supported) syncType)", () => {
    it("should default to weekly behavior", () => {
      const fixedNow = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 15,
          hour: 14,
          minute: 30,
        },
        { zone: "America/Los_Angeles" },
      );
      vi.setSystemTime(fixedNow.toJSDate());

      const result = getSyncDates("all");
      const expectedMonday = fixedNow.startOf("week");

      expect(result.from.toUTC().toISO()).toBe(expectedMonday.toUTC().toISO());
      expect(result.to.toUTC().toISO()).toBe(fixedNow.toUTC().toISO());
    });
  });
});
