import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../DatePicker";

describe("DatePicker Component", () => {
  it("should render the DatePicker component", () => {
    render(<DatePicker value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText("Select Date")).toBeInTheDocument();
  });

  it("should call onChange with the selected date", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <DatePicker value="" onChange={handleChange} />,
    );
    const input = screen.getByPlaceholderText("Select Date");
    fireEvent.click(input);
    const calendarDate = container.querySelector("calendar-date");
    expect(calendarDate).toBeInTheDocument();
    fireEvent.change(calendarDate!, { target: { value: "2024-01-01" } });
    expect(handleChange).toHaveBeenCalledWith("2024-01-01");
  });

  it("should clear the date when clear button is clicked", () => {
    const handleChange = vi.fn();
    render(<DatePicker value="2024-01-01" onChange={handleChange} />);
    const clearButton = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearButton);
    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("should close the calendar dropdown when clicking outside", () => {
    const { container } = render(<DatePicker value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText("Select Date");

    // Open calendar
    fireEvent.click(input);
    expect(container.querySelector("calendar-date")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    // Verify calendar is closed
    expect(container.querySelector("calendar-date")).not.toBeInTheDocument();
  });
});
