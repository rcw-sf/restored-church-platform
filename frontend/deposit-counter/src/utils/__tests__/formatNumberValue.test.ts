import { describe, expect, it } from "vitest";
import { formatNumberValue } from "../formatNumberValue";

describe("formatNumberValue", () => {
  it("defaults to USD currency style", () => {
    expect(formatNumberValue(12.5)).toBe("$12.50");
  });

  it("formats as decimal when requested", () => {
    expect(formatNumberValue(42, { style: "decimal" })).toBe("42");
  });

  it("formats as percent when requested", () => {
    expect(formatNumberValue(0.25, { style: "percent" })).toBe("25%");
  });

  it("respects fraction digit bounds", () => {
    expect(
      formatNumberValue(1.2345, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }),
    ).toBe("1.235");
  });

  it("uses a custom currency code when style is currency", () => {
    expect(
      formatNumberValue(10, { style: "currency", currency: "EUR" }),
    ).toMatch(/^€/);
  });
});
