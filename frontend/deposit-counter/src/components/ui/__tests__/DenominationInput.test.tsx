import DenominationInput from "@/components/ui/DenominationInput";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("DenominationInput", () => {
  it("manages internal state when value prop is missing", () => {
    const onValueChange = vi.fn();
    render(<DenominationInput multiplier={10} onValueChange={onValueChange} />);

    const input = screen.getByPlaceholderText("0");
    fireEvent.change(input, { target: { value: "5" } });

    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(screen.getByText("$50.00")).toBeDefined();

    fireEvent.change(input, { target: { value: "" } });
    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it("renders provided value prop", () => {
    render(
      <DenominationInput multiplier={20} value={3} onValueChange={vi.fn()} />,
    );
    const input = screen.getByDisplayValue("3");
    expect(input).toBeDefined();
    expect(screen.getByText("$60.00")).toBeDefined();
  });
});
