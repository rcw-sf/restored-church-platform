import { describe, expect, it } from "vitest";
import {
  formatPhone,
  getLocalIsoDate,
  removeUndefinedFields,
} from "../formatters";

describe("formatters utility", () => {
  describe("formatPhone", () => {
    it("handles empty input", () => {
      expect(formatPhone("")).toBe("");
    });

    it("formats standard US numbers as user types", () => {
      expect(formatPhone("5")).toBe("5");
      expect(formatPhone("555")).toBe("(555)");
      expect(formatPhone("55501")).toBe("(555) 01");
      expect(formatPhone("5550199")).toBe("(555) 019-9");
      expect(formatPhone("5550199000")).toBe("(555) 019-9000");
    });

    it("formats US numbers starting with country code 1", () => {
      expect(formatPhone("15550199000")).toBe("+1 (555) 019-9000");
    });

    it("formats international numbers with extra digits", () => {
      expect(formatPhone("445550199000")).toBe("+44 55 5019 9000");
      expect(formatPhone("3585550199000")).toBe("+358 5 550199000");
    });
  });

  describe("getLocalIsoDate", () => {
    it("returns correct YYYY-MM-DD local format for a given date object", () => {
      const testDate = new Date(2026, 4, 25); // May 25, 2026 (Month is 0-indexed in JS)
      expect(getLocalIsoDate(testDate)).toBe("2026-05-25");
    });

    it("defaults to current date if no argument is passed", () => {
      const todayString = getLocalIsoDate();
      const match = /^\d{4}-\d{2}-\d{2}$/.test(todayString);
      expect(match).toBe(true);
    });
  });

  describe("removeUndefinedFields", () => {
    it("removes undefined fields but keeps null, empty strings, and zero", () => {
      const input = {
        a: "test",
        b: undefined,
        c: null,
        d: "",
        e: 0,
        f: false,
      };
      const result = removeUndefinedFields(input);
      expect(result).toEqual({
        a: "test",
        c: null,
        d: "",
        e: 0,
        f: false,
      });
      expect("b" in result).toBe(false);
    });
  });
});
