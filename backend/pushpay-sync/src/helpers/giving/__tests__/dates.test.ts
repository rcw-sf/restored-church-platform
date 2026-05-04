import { DateTime } from "luxon";
import { describe, it, expect } from "vitest";
import {
  calculateEffectiveFromDate,
  calculateGiftDate,
  calculateSundayRange,
} from "../dates.js";

describe("giving-dates", () => {
  describe("calculateEffectiveFromDate", () => {
    it("should return original from date when no last sync", () => {
      const from = DateTime.fromISO("2023-01-01");
      const result = calculateEffectiveFromDate(from, null);
      expect(result).toEqual(from);
    });

    it("should use calculated from when it's before original", () => {
      const from = DateTime.fromISO("2023-01-01");
      const lastSync = { dateRange: { to: "2022-12-31" } };
      const result = calculateEffectiveFromDate(from, lastSync);
      const expected = DateTime.fromISO("2022-12-30T23:59:59");
      expect(result.toISO()).toBe(expected.toISO());
    });

    it("should use original from when calculated would skip data", () => {
      const from = DateTime.fromISO("2023-01-01");
      const lastSync = { dateRange: { to: "2023-01-02" } };
      const result = calculateEffectiveFromDate(from, lastSync);
      expect(result).toEqual(from);
    });
  });

  describe("calculateGiftDate", () => {
    it("should parse givenOn as PST", () => {
      const result = calculateGiftDate("2023-01-01", "2023-01-01T10:00:00Z");
      expect(result.zoneName).toBe("America/Los_Angeles");
      expect(result.toISODate()).toBe("2023-01-01");
    });

    it("should parse createdOn as PST when no givenOn", () => {
      const result = calculateGiftDate(undefined, "2023-01-01T10:00:00Z");
      expect(result.zoneName).toBe("America/Los_Angeles");
      expect(result.toISO()).toBe("2023-01-01T02:00:00.000-08:00");
    });
  });

  describe("calculateSundayRange", () => {
    it("should calculate Sunday dates for date range", () => {
      const from = DateTime.fromISO("2023-01-02"); // Monday
      const to = DateTime.fromISO("2023-01-08"); // Sunday
      const result = calculateSundayRange(from, to);
      expect(result.startSunday).toBe("2023-01-08");
      expect(result.endSunday).toBe("2023-01-08");
    });

    it("should handle same Sunday", () => {
      const from = DateTime.fromISO("2023-01-01"); // Sunday
      const to = DateTime.fromISO("2023-01-01"); // Same Sunday
      const result = calculateSundayRange(from, to);
      expect(result.startSunday).toBe("2023-01-01");
      expect(result.endSunday).toBe("2023-01-01");
    });
  });
});
