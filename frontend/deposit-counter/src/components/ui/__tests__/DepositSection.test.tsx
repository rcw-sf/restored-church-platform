import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DepositSection from "@/components/ui/DepositSection";

describe("DepositSection", () => {
  const denominations = [1, 5, 10];

  it("renders with title and denominations", () => {
    render(
      <DepositSection title="Test Section" denominations={denominations} />,
    );
    expect(screen.getByText("Test Section")).toBeDefined();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
  });

  it("calculates total correctly when inputs change", () => {
    const onTotalChange = vi.fn();
    render(
      <DepositSection
        title="Bills"
        denominations={[1, 5]}
        onTotalChange={onTotalChange}
      />,
    );

    const inputs = screen.getAllByRole("spinbutton");
    // Enter '2' for $1 bill
    fireEvent.change(inputs[0], { target: { value: "2" } });

    expect(onTotalChange).toHaveBeenCalledWith(2);

    // Enter '3' for $5 bill
    fireEvent.change(inputs[1], { target: { value: "3" } });

    // Total should be 2*1 + 3*5 = 17
    expect(onTotalChange).toHaveBeenCalledWith(17);
  });

  it("calls onCountsChange and handles resetTrigger", () => {
    const onCountsChange = vi.fn();
    const { rerender } = render(
      <DepositSection
        title="T"
        denominations={[1]}
        onCountsChange={onCountsChange}
        resetTrigger={1}
      />,
    );
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    expect(onCountsChange).toHaveBeenCalledWith({ 1: 5 });

    rerender(<DepositSection title="T" denominations={[1]} resetTrigger={2} />);
    expect(input).toHaveValue(0);
  });
});