import DescriptionDateInput from "@/components/ui/DescriptionDateInput";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("DescriptionDateInput", () => {
  it("handles description changes and validation", () => {
    const setDescription = vi.fn();
    const setDescriptionError = vi.fn();
    render(
      <DescriptionDateInput
        description=""
        setDescription={setDescription}
        descriptionError=""
        setDescriptionError={setDescriptionError}
        date=""
        setDate={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Description");
    fireEvent.change(input, { target: { value: "Gift" } });
    expect(setDescription).toHaveBeenCalledWith("Gift");
    expect(setDescriptionError).toHaveBeenCalledWith("");

    fireEvent.blur(input);
    expect(setDescriptionError).toHaveBeenCalledWith(
      "Description is required.",
    );
  });

  it("handles date changes", () => {
    const setDate = vi.fn();
    render(
      <DescriptionDateInput
        description="T"
        setDescription={vi.fn()}
        descriptionError=""
        setDescriptionError={vi.fn()}
        date="2024-01-01"
        setDate={setDate}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("2024-01-01"), {
      target: { value: "2024-01-02" },
    });
    expect(setDate).toHaveBeenCalledWith("2024-01-02");
  });
});
