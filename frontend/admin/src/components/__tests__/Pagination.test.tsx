import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Pagination from "../Pagination";

describe("Pagination", () => {
  const mockOnPageChange = vi.fn();

  it("renders nothing when totalPages is 1 or less", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={10}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />,
    );

    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByTestId("pagination-container"),
    ).not.toBeInTheDocument();
  });

  it("renders correctly when totalPages is greater than 1", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={25}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
        itemName="members"
      />,
    );

    expect(screen.getByTestId("pagination-container")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-container")).toHaveTextContent(
      "Showing 1 to 10 of 25 members",
    );
    expect(screen.getByTestId("current-page-label")).toHaveTextContent(
      "Page 1 of 3",
    );
  });

  it("correctly handles the last page showing math", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        totalItems={25}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
        itemName="items"
      />,
    );

    expect(screen.getByTestId("pagination-container")).toHaveTextContent(
      "Showing 21 to 25 of 25 items",
    );
    expect(screen.getByTestId("current-page-label")).toHaveTextContent(
      "Page 3 of 3",
    );
  });

  it("disables previous button on the first page and calls callback when clicking next button", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={25}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />,
    );

    const prevButton = screen.getByTestId("prev-page-button");
    const nextButton = screen.getByTestId("next-page-button");

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it("disables next button on the last page and calls callback when clicking previous button", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        totalItems={25}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />,
    );

    const prevButton = screen.getByTestId("prev-page-button");
    const nextButton = screen.getByTestId("next-page-button");

    expect(prevButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.click(prevButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });
});
