import { Timestamp } from "firebase-admin/firestore";
import { describe, it, expect } from "vitest";
import {
  parseDateToISO,
  formatPushpayDate,
  formatSheetDate,
} from "../date-utils.js";

describe("parseDateToISO", () => {
  it("should parse valid date strings correctly", () => {
    const result = parseDateToISO("2024-01-15 14:30:45");
    expect(result).toBe("2024-01-15T22:30:45.000Z"); // PT to UTC conversion
  });

  it("should handle different times of day", () => {
    expect(parseDateToISO("2024-01-15 00:00:00")).toBe(
      "2024-01-15T08:00:00.000Z",
    );
    expect(parseDateToISO("2024-01-15 23:59:59")).toBe(
      "2024-01-16T07:59:59.000Z",
    );
  });

  it("should handle edge cases", () => {
    // Test with very old dates
    expect(parseDateToISO("1900-01-01 12:00:00")).toBe(
      "1900-01-01T20:00:00.000Z",
    );

    // Test with future dates
    expect(parseDateToISO("2100-12-31 23:59:59")).toBe(
      "2101-01-01T07:59:59.000Z",
    );
  });

  it("should return undefined for invalid inputs", () => {
    expect(parseDateToISO(undefined)).toBeUndefined();
    expect(parseDateToISO("")).toBeUndefined();
    expect(parseDateToISO("invalid-date")).toBeUndefined();
    expect(parseDateToISO("2024-01-01")).toBeUndefined(); // Missing time
    expect(parseDateToISO("2024/01/01 12:00:00")).toBeUndefined(); // Wrong format
  });
});

describe("formatPushpayDate", () => {
  it("should return undefined for undefined input", () => {
    expect(formatPushpayDate(undefined)).toBeUndefined();
  });

  it("should format Firestore Timestamp to yyyy-MM-dd", () => {
    const mockTimestamp = {
      toDate: () => new Date("2023-05-15T12:00:00Z"),
    } as Timestamp;
    expect(formatPushpayDate(mockTimestamp)).toBe("2023-05-15");
  });

  it("should format valid ISO string to yyyy-MM-dd", () => {
    expect(formatPushpayDate("2023-05-15T12:00:00.000Z")).toBe("2023-05-15");
  });

  it("should return original string if invalid ISO string", () => {
    expect(formatPushpayDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatSheetDate", () => {
  it("should return empty string for undefined input", () => {
    expect(formatSheetDate(undefined)).toBe("");
  });

  it("should format Firestore Timestamp to MM/dd/yyyy", () => {
    const mockTimestamp = {
      toDate: () => new Date("2023-05-15T12:00:00Z"),
    } as Timestamp;
    expect(formatSheetDate(mockTimestamp)).toBe("05/15/2023");
  });

  it("should format valid ISO string to MM/dd/yyyy", () => {
    expect(formatSheetDate("2023-05-15T12:00:00.000Z")).toBe("05/15/2023");
  });

  it("should return original string if invalid ISO string", () => {
    expect(formatSheetDate("not-a-date")).toBe("not-a-date");
  });
});
