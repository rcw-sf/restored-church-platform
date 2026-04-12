import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NumericInput from "@/components/ui/NumericInput";

describe("NumericInput", () => {
  it("allows digit keys", () => {
    const onChange = vi.fn();
    render(<NumericInput type="number" value="" onChange={onChange} />);
    const input = screen.getByRole("spinbutton");

    const event = new KeyboardEvent("keydown", { key: "5", cancelable: true });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents non-digit keys", () => {
    const onChange = vi.fn();
    render(<NumericInput type="number" value="" onChange={onChange} />);
    const input = screen.getByRole("spinbutton");

    const event = new KeyboardEvent("keydown", { key: "a", cancelable: true });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("allows control keys like Backspace", () => {
    const onChange = vi.fn();
    render(<NumericInput type="number" value="" onChange={onChange} />);
    const input = screen.getByRole("spinbutton");

    const event = new KeyboardEvent("keydown", {
      key: "Backspace",
      cancelable: true,
    });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("allows a single dot when step is 0.01", () => {
    const onChange = vi.fn();
    render(
      <NumericInput type="number" step="0.01" value="10" onChange={onChange} />,
    );
    const input = screen.getByRole("spinbutton");

    const event = new KeyboardEvent("keydown", {
      key: ".",
      cancelable: true,
    });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents dot when step is not 0.01", () => {
    render(<NumericInput type="number" value="" onChange={vi.fn()} />);
    const input = screen.getByRole("spinbutton");
    const event = new KeyboardEvent("keydown", { key: ".", cancelable: true });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("prevents multiple dots", () => {
    render(
      <NumericInput type="number" step="0.01" value="1.2" onChange={vi.fn()} />,
    );
    const input = screen.getByRole("spinbutton");
    const event = new KeyboardEvent("keydown", { key: ".", cancelable: true });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("calls onKeyDown prop if provided", () => {
    const onKeyDown = vi.fn();
    render(
      <NumericInput
        type="text"
        value=""
        onChange={vi.fn()}
        onKeyDown={onKeyDown}
      />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalled();
  });
});