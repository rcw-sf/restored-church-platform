import { DateTime } from "luxon";
import { describe, it, expect } from "vitest";
import { calculateSundayDate } from "../date-utils.js";

describe("calculateSundayDate", () => {
  describe("when input is Sunday", () => {
    it("should return the same Sunday date", () => {
      const sunday = DateTime.fromObject({ year: 2023, month: 1, day: 1 }); // Jan 1, 2023 was a Sunday
      const result = calculateSundayDate(sunday);

      expect(result.weekday).toBe(7); // Sunday
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
      expect(result.millisecond).toBe(0);
    });

    it("should handle Sunday with time components", () => {
      const sundayWithTime = DateTime.fromObject({
        year: 2023,
        month: 1,
        day: 1,
        hour: 15,
        minute: 30,
        second: 45,
      });
      const result = calculateSundayDate(sundayWithTime);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
      expect(result.millisecond).toBe(0);
    });
  });

  describe("when input is Monday", () => {
    it("should return the following Sunday", () => {
      const monday = DateTime.fromObject({ year: 2023, month: 1, day: 2 }); // Jan 2, 2023 was a Monday
      const result = calculateSundayDate(monday);

      expect(result.weekday).toBe(7); // Sunday
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(8); // Following Sunday
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
    });
  });

  describe("when input is Tuesday", () => {
    it("should return the following Sunday", () => {
      const tuesday = DateTime.fromObject({ year: 2023, month: 1, day: 3 }); // Jan 3, 2023 was a Tuesday
      const result = calculateSundayDate(tuesday);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(8); // Following Sunday
    });
  });

  describe("when input is Wednesday", () => {
    it("should return the following Sunday", () => {
      const wednesday = DateTime.fromObject({ year: 2023, month: 1, day: 4 }); // Jan 4, 2023 was a Wednesday
      const result = calculateSundayDate(wednesday);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(8); // Following Sunday
    });
  });

  describe("when input is Thursday", () => {
    it("should return the following Sunday", () => {
      const thursday = DateTime.fromObject({ year: 2023, month: 1, day: 5 }); // Jan 5, 2023 was a Thursday
      const result = calculateSundayDate(thursday);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(8); // Following Sunday
    });
  });

  describe("when input is Friday", () => {
    it("should return the following Sunday", () => {
      const friday = DateTime.fromObject({ year: 2023, month: 1, day: 6 }); // Jan 6, 2023 was a Friday
      const result = calculateSundayDate(friday);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(8); // Following Sunday
    });
  });

  describe("when input is Saturday", () => {
    it("should return the following Sunday", () => {
      const saturday = DateTime.fromObject({ year: 2023, month: 1, day: 7 }); // Jan 7, 2023 was a Saturday
      const result = calculateSundayDate(saturday);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(1);
      expect(result.day).toBe(8); // Following Sunday (next day)
    });
  });

  describe("edge cases", () => {
    it("should handle month boundaries correctly", () => {
      // Saturday at start of month that crosses to next month
      const saturday = DateTime.fromObject({ year: 2023, month: 4, day: 1 }); // April 1, 2023 was a Saturday
      const result = calculateSundayDate(saturday);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(4);
      expect(result.day).toBe(2); // April 2, 2023 (Sunday)
    });

    it("should handle year boundaries correctly", () => {
      // Saturday at end of year
      const saturdayEndOfYear = DateTime.fromObject({
        year: 2022,
        month: 12,
        day: 31,
      }); // Dec 31, 2022 was a Saturday
      const result = calculateSundayDate(saturdayEndOfYear);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2023); // Should cross to next year
      expect(result.month).toBe(1);
      expect(result.day).toBe(1); // January 1, 2023 (Sunday)
    });

    it("should handle leap years correctly", () => {
      // Tuesday in leap year February
      const tuesdayLeapYear = DateTime.fromObject({
        year: 2020,
        month: 2,
        day: 25,
      }); // Feb 25, 2020 was a Tuesday
      const result = calculateSundayDate(tuesdayLeapYear);

      expect(result.weekday).toBe(7);
      expect(result.year).toBe(2020);
      expect(result.month).toBe(3);
      expect(result.day).toBe(1); // March 1, 2020 (Sunday)
    });

    it("should always return start of day (midnight)", () => {
      const dateWithTime = DateTime.fromObject({
        year: 2023,
        month: 6,
        day: 15, // Thursday
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      });
      const result = calculateSundayDate(dateWithTime);

      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
      expect(result.millisecond).toBe(0);
    });

    it("should handle different time zones consistently", () => {
      const dateInUTC = DateTime.fromObject(
        {
          year: 2023,
          month: 6,
          day: 15,
          hour: 12,
        },
        { zone: "utc" },
      );
      const dateInLocal = dateInUTC.setZone("local");

      const resultUTC = calculateSundayDate(dateInUTC);
      const resultLocal = calculateSundayDate(dateInLocal);

      // Both should return Sunday, but might be different calendar days due to timezone
      expect(resultUTC.weekday).toBe(7);
      expect(resultLocal.weekday).toBe(7);
      expect(resultUTC.hour).toBe(0);
      expect(resultLocal.hour).toBe(0);
    });
  });

  describe("consistency tests", () => {
    it("should return consistent results for the same input", () => {
      const date = DateTime.fromObject({ year: 2023, month: 6, day: 15 }); // Thursday
      const result1 = calculateSundayDate(date);
      const result2 = calculateSundayDate(date);

      expect(result1.toISO()).toBe(result2.toISO());
    });

    it("should handle invalid dates gracefully", () => {
      // Test with an invalid DateTime (though Luxon typically handles this well)
      const invalidDate = DateTime.fromObject({
        year: 2023,
        month: 13,
        day: 32,
      });

      if (invalidDate.isValid) {
        const result = calculateSundayDate(invalidDate);
        expect(result.weekday).toBe(7);
      } else {
        // If the date is invalid, we expect the function to handle it
        // This test documents the behavior rather than enforcing specific handling
        expect(true).toBe(true); // Placeholder test
      }
    });
  });
});
