import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatCard } from "../StatCard";

describe("StatCard Component", () => {
  it("renders the title and formatted value", () => {
    render(<StatCard title="Total Revenue" value={1234.56} />);

    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText(/\$1,234.56/)).toBeInTheDocument();
  });

  it("applies the success variant class", () => {
    const { container } = render(
      <StatCard title="Profit" value={500} variant="success" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-success");
    expect(card).toHaveClass("text-success-content");
  });

  it("applies the error variant class", () => {
    const { container } = render(
      <StatCard title="Loss" value={-500} variant="error" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-error");
    expect(card).toHaveClass("text-error-content");
  });
});
