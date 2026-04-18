import ChecksSection from "@/components/ui/ChecksSection";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("ChecksSection", () => {
  const mockChecks = [{ number: "101", amount: 50.0 }];

  it("renders the section title and check fields", () => {
    render(<ChecksSection checks={mockChecks} setChecks={vi.fn()} />);
    expect(screen.getByText("Checks")).toBeDefined();
    expect(screen.getByDisplayValue("101")).toBeDefined();
    expect(screen.getByDisplayValue("50")).toBeDefined();
  });

  it("calls setChecks when adding a new check", () => {
    const setChecks = vi.fn();
    render(<ChecksSection checks={mockChecks} setChecks={setChecks} />);

    const addButton = screen.getByRole("button", { name: /add check/i });
    fireEvent.click(addButton);

    expect(setChecks).toHaveBeenCalledWith([
      ...mockChecks,
      { number: "", amount: 0 },
    ]);
  });

  it("calls setChecks when updating check number", () => {
    const setChecks = vi.fn();
    render(<ChecksSection checks={mockChecks} setChecks={setChecks} />);

    const numberInput = screen.getByPlaceholderText("Check #");
    fireEvent.change(numberInput, { target: { value: "102" } });

    expect(setChecks).toHaveBeenCalledWith([{ number: "102", amount: 50.0 }]);
  });

  it("calls setChecks when updating check amount", () => {
    const setChecks = vi.fn();
    render(<ChecksSection checks={mockChecks} setChecks={setChecks} />);

    const amountInput = screen.getByPlaceholderText("Amount");
    fireEvent.change(amountInput, { target: { value: "75.50" } });

    expect(setChecks).toHaveBeenCalledWith([{ number: "101", amount: 75.5 }]);
  });
});
