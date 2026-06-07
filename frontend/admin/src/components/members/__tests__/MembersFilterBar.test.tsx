import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MembersFilterBar from "../MembersFilterBar";

describe("MembersFilterBar Component", () => {
  const defaultProps = {
    searchTerm: "",
    onSearchChange: vi.fn(),
    regionFilter: "",
    onRegionChange: vi.fn(),
    superRegionFilter: "",
    onSuperRegionChange: vi.fn(),
    ministryFilter: "",
    onMinistryChange: vi.fn(),
    regionOptions: ["San Francisco", "San Jose"],
    superRegionOptions: ["Peninsula", "South Bay"],
    ministryOptions: ["Singles", "Marrieds"],
    onResetFilters: vi.fn(),
  };

  it("renders correctly with search bar and filter button", () => {
    render(<MembersFilterBar {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Search name, email, phone..."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Filters/i }),
    ).toBeInTheDocument();
    // Reset Filters button should not be displayed when there are no active filters
    expect(
      screen.queryByRole("button", { name: /Reset Filters/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onSearchChange when search term changes", () => {
    render(<MembersFilterBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(
      "Search name, email, phone...",
    );
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    expect(defaultProps.onSearchChange).toHaveBeenCalledWith("Alice");
  });

  it("toggles the filter panel when Filters button is clicked", () => {
    render(<MembersFilterBar {...defaultProps} />);

    // Initially dropdowns are not visible
    expect(
      screen.queryByLabelText("Filter by Super Region"),
    ).not.toBeInTheDocument();

    // Click to open
    const toggleBtn = screen.getByRole("button", { name: /Filters/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByLabelText("Filter by Super Region")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by Region")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by Ministry")).toBeInTheDocument();

    // Click to close
    fireEvent.click(toggleBtn);
    expect(
      screen.queryByLabelText("Filter by Super Region"),
    ).not.toBeInTheDocument();
  });

  it("triggers callbacks when select options are changed", () => {
    render(<MembersFilterBar {...defaultProps} />);

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));

    // Change Super Region
    const superRegionSelect = screen.getByLabelText("Filter by Super Region");
    fireEvent.change(superRegionSelect, { target: { value: "Peninsula" } });
    expect(defaultProps.onSuperRegionChange).toHaveBeenCalledWith("Peninsula");

    // Change Region
    const regionSelect = screen.getByLabelText("Filter by Region");
    fireEvent.change(regionSelect, { target: { value: "San Francisco" } });
    expect(defaultProps.onRegionChange).toHaveBeenCalledWith("San Francisco");

    // Change Ministry
    const ministrySelect = screen.getByLabelText("Filter by Ministry");
    fireEvent.change(ministrySelect, { target: { value: "Singles" } });
    expect(defaultProps.onMinistryChange).toHaveBeenCalledWith("Singles");
  });

  it("displays Reset Filters and triggers callback when filters are active", () => {
    const propsWithActiveFilter = {
      ...defaultProps,
      regionFilter: "San Francisco",
    };

    render(<MembersFilterBar {...propsWithActiveFilter} />);

    const resetBtn = screen.getByRole("button", { name: /Reset Filters/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(defaultProps.onResetFilters).toHaveBeenCalled();
  });
});
