import Home from "@/pages/Home";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Luxon to be deterministic
vi.mock("luxon", async () => {
  const actual = await vi.importActual<typeof import("luxon")>("luxon");
  return {
    ...actual,
    DateTime: {
      ...actual.DateTime,
      now: () =>
        actual.DateTime.fromISO("2024-01-01T00:00:00Z", {
          zone: "UTC",
        }) as import("luxon").DateTime,
    },
  };
});

describe("Home Page", () => {
  it("renders all sections and initial grand total", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Bills" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Coins" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Checks" })).toBeDefined();

    // Summary section should show initial totals
    const grandTotalElement = screen.getByText("Grand Total").closest("div")!;
    expect(grandTotalElement).toHaveTextContent("$0.00");
  });

  it("calculates grand total correctly when bill and coin counts change", () => {
    render(<Home />);

    // Find inputs.
    // Bill denominations: [1, 2, 5, 10, 20, 50, 100] (7 items)
    // Coin denominations: [0.01, 0.05, 0.1, 0.25, 0.5, 1] (6 items)
    const inputs = screen.getAllByRole("spinbutton");

    // Set 2 x $1 bills (index 0)
    fireEvent.change(inputs[0], { target: { value: "2" } });

    // Set 1 x $0.25 coin (index 7 + 3 = 10)
    fireEvent.change(inputs[10], { target: { value: "1" } });

    const grandTotalElement = screen.getByText("Grand Total").closest("div")!;
    expect(grandTotalElement).toHaveTextContent("$2.25");
  });

  it("shows error toast when attempting to copy summary without a description", async () => {
    render(<Home />);

    const copyButton = screen.getByRole("button", {
      name: /copy summary to clipboard/i,
    });
    fireEvent.click(copyButton);

    expect(screen.getAllByText("Description is required.")).toHaveLength(2);
  });

  it("resets the form correctly when the reset button is clicked", async () => {
    render(<Home />);

    // 1. Fill data
    const descInput = screen.getByRole("textbox");
    fireEvent.change(descInput, { target: { value: "To be cleared" } });

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "10" } }); // $10 total ($1 bills)

    expect(screen.getByText("Grand Total").closest("div")!).toHaveTextContent(
      "$10.00",
    );

    // 2. Click Reset
    const resetButton = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetButton);

    // 3. Verify reset
    await waitFor(() => {
      expect(descInput).toHaveValue("");
      expect(inputs[0]).toHaveValue(null);
      const grandTotalElement = screen.getByText("Grand Total").closest("div")!;
      expect(grandTotalElement).toHaveTextContent("$0.00");
      expect(descInput).toHaveFocus();
    });
  });

  it("sets the default date to today in yyyy-MM-dd format", () => {
    render(<Home />);
    const expectedDate = "2024-01-01";

    // The DescriptionDateInput uses setDate and handles the date input
    // We check if an input exists with today's date value
    const dateInput = screen.getByDisplayValue(expectedDate);
    expect(dateInput).toBeDefined();
    expect(dateInput).toHaveAttribute("type", "date");
  });
});
