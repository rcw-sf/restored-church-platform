import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "../Home";

describe("Home Component", () => {
  it("renders correctly", () => {
    render(<Home />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
