import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BreakdownItem } from "../BreakdownItem";

describe("BreakdownItem Component", () => {
  it("renders category, formatted amount and percentage", () => {
    render(
      <BreakdownItem category="Education" amount={1500} percentage={25.54} />,
    );

    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText(/\$1,500.00/)).toBeInTheDocument();
    expect(screen.getByText("25.5%")).toBeInTheDocument();
  });
});
