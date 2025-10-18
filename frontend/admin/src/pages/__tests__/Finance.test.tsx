import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useFinanceData } from "../../hooks/useFinanceData";
import Finance from "../Finance";

// Mock the hook so we can test the UI in isolation
vi.mock("../../hooks/useFinanceData");

describe("Finance Component", () => {
  it("renders a loading spinner when data is fetching", () => {
    vi.mocked(useFinanceData).mockReturnValue({
      loading: true,
      error: null,
      income: { weeklyContribution: 0, specialMissions: 0, benevolence: 0 },
      expenses: [],
      centralAdmin: { budget: 0, breakdown: [] },
    });

    render(<Finance />);

    const loader = screen.getByTestId("loading-spinner");
    expect(loader).toBeInTheDocument();
  });

  it("renders financial data correctly when loaded", () => {
    vi.mocked(useFinanceData).mockReturnValue({
      loading: false,
      error: null,
      income: {
        weeklyContribution: 5000,
        specialMissions: 1000,
        benevolence: 500,
      },
      expenses: [{ category: "Rent", amount: 2000 }],
      centralAdmin: { budget: 10000, breakdown: [] },
    });

    render(<Finance />);

    // Check if the amounts are formatted and displayed
    expect(screen.getAllByText(/\$5,000/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Rent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$2,000/)[0]).toBeInTheDocument();
  });

  it("displays negative net income with error variant", () => {
    vi.mocked(useFinanceData).mockReturnValue({
      loading: false,
      error: null,
      income: { weeklyContribution: 1000, specialMissions: 0, benevolence: 0 },
      expenses: [{ category: "Rent", amount: 2000 }],
      centralAdmin: { budget: 0, breakdown: [] },
    });

    render(<Finance />);

    const netIncomeStat = screen.getByText(/Net Income/i).closest(".card");
    expect(netIncomeStat).toHaveClass("bg-error");
  });

  it("shows an error message when the hook fails", () => {
    vi.mocked(useFinanceData).mockReturnValue({
      loading: false,
      error: "Failed to load financial data",
      income: { weeklyContribution: 0, specialMissions: 0, benevolence: 0 },
      expenses: [],
      centralAdmin: { budget: 0, breakdown: [] },
    });

    render(<Finance />);

    expect(
      screen.getByText(/Failed to load financial data/i),
    ).toBeInTheDocument();
  });
});
