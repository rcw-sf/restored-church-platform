import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SummarySection from "@/components/ui/SummarySection";

describe("SummarySection", () => {
  it("renders summary items with correct formatting", () => {
    const items = [
      { label: "Bills", value: 100, bold: true },
      { label: "Checks", value: 50, count: 2 },
    ];
    render(<SummarySection summaryItems={items} />);

    expect(screen.getByText("Bills")).toHaveClass("font-bold");
    expect(screen.getByText("$100.00")).toBeDefined();
    expect(screen.getByText("Checks (2)")).toBeDefined();
    expect(screen.getByText("$50.00")).toBeDefined();
  });
});