import { describe, expect, it } from "vitest";
import {
  countFormatter,
  formatDenominations,
  generateTextSummary,
  resultFormatter,
} from "../summary";

describe("formatDenominations", () => {
  it("returns empty string when all counts are zero", () => {
    expect(formatDenominations([1, 5, 10], { 1: 0, 5: 0, 10: 0 })).toBe("");
  });

  it("formats bills with whole-dollar amounts", () => {
    expect(formatDenominations([20], { 20: 3 })).toBe("  $20 x 3 = $60.00\n");
  });

  it("formats coins with two decimal places on the denomination", () => {
    expect(formatDenominations([0.25], { 0.25: 4 }, true)).toBe(
      "  $0.25 x 4 = $1.00\n",
    );
  });

  it("skips zero denominations and keeps order", () => {
    expect(formatDenominations([1, 5, 10], { 1: 0, 5: 2, 10: 0 })).toBe(
      "  $5 x 2 = $10.00\n",
    );
  });

  it("treats a missing count as zero", () => {
    expect(formatDenominations([5], {})).toBe("");
  });

  it("formats several bill lines in denomination order", () => {
    expect(formatDenominations([1, 5], { 1: 1, 5: 1 })).toBe(
      "  $1 x 1 = $1.00\n  $5 x 1 = $5.00\n",
    );
  });
});

describe("formatters", () => {
  it("exposes stable count and currency formatters for UI reuse", () => {
    expect(countFormatter.format(42)).toBe("42");
    expect(resultFormatter.format(10)).toBe("$10.00");
  });
});

describe("generateTextSummary", () => {
  it("includes description and a formatted date line", () => {
    const text = generateTextSummary(
      "Sunday offering",
      "2024-01-15",
      0,
      {},
      0,
      {},
      [],
      [],
    );
    expect(text).toMatch(/^Sunday offering \(.+\)\n\n/);
  });

  it("shows empty sections when there are no bills, coins, or checks", () => {
    const text = generateTextSummary("X", "2024-01-15", 0, {}, 0, {}, [], []);
    expect(text).toContain("Bills:\n  No Bills\n");
    expect(text).toContain("Coins:\n  No Coins\n");
    expect(text).toContain("Checks:\n  No Checks\n");
  });

  it("renders checks with blank number and zero amount when missing", () => {
    const text = generateTextSummary(
      "X",
      "2024-01-15",
      0,
      {},
      0,
      {},
      [{ number: "", amount: 0 }],
      [],
    );
    expect(text).toContain("#(blank): $0.00\n");
  });

  it("renders summary items using the shared currency formatter", () => {
    const text = generateTextSummary(
      "X",
      "2024-01-15",
      0,
      {},
      0,
      {},
      [],
      [{ label: "Total", value: 123.45 }],
    );
    expect(text).toContain(`Total: ${resultFormatter.format(123.45)}\n`);
  });

  it("lists bill denominations when billTotal is non-zero", () => {
    const text = generateTextSummary(
      "Offering",
      "2024-06-01",
      50,
      { 50: 1 },
      0,
      {},
      [],
      [],
    );
    expect(text).toContain("Bills:\n");
    expect(text).toContain("$50 x 1 = $50.00");
    expect(text).not.toContain("No Bills");
  });

  it("lists coin denominations when coinTotal is non-zero", () => {
    const text = generateTextSummary(
      "Offering",
      "2024-06-01",
      0,
      {},
      0.5,
      { 0.5: 1 },
      [],
      [],
    );
    expect(text).toContain("Coins:\n");
    expect(text).toContain("$0.50 x 1 = $0.50");
    expect(text).not.toContain("No Coins");
  });

  it("renders checks with number and amount when provided", () => {
    const text = generateTextSummary(
      "X",
      "2024-01-15",
      0,
      {},
      0,
      {},
      [{ number: "1001", amount: 250 }],
      [],
    );
    expect(text).toContain("#1001: $250.00\n");
    expect(text).not.toContain("No Checks");
  });

  it("renders every check and summary row in order", () => {
    const text = generateTextSummary(
      "X",
      "2024-01-15",
      0,
      {},
      0,
      {},
      [
        { number: "1", amount: 10 },
        { number: "2", amount: 20 },
      ],
      [
        { label: "Subtotal", value: 100 },
        { label: "Total", value: 200 },
      ],
    );
    expect(text).toContain("#1: $10.00\n");
    expect(text).toContain("#2: $20.00\n");
    expect(text).toContain(`Subtotal: ${resultFormatter.format(100)}\n`);
    expect(text).toContain(`Total: ${resultFormatter.format(200)}\n`);
  });

  it("uses denomination lines when billTotal is non-zero even if counts object is empty", () => {
    const text = generateTextSummary("X", "2024-01-15", 1, {}, 0, {}, [], []);
    expect(text).toContain("Bills:\n");
    expect(text).not.toContain("No Bills");
    expect(text).toMatch(/Bills:\n\nCoins:/);
  });
});
