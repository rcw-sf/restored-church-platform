import { render, screen } from "@testing-library/react";
import type { ChartData } from "chart.js";
import { Pie } from "react-chartjs-2";
import { describe, it, expect, vi } from "vitest";
import { FinancePieChart } from "../FinancePieChart";

// Mock react-chartjs-2 as canvas is not supported in jsdom
vi.mock("react-chartjs-2", () => ({
  Pie: vi.fn(() => <div data-testid="mock-pie-chart" />),
}));

describe("FinancePieChart Component", () => {
  const mockData: ChartData<"pie"> = {
    labels: ["A", "B"],
    datasets: [
      {
        data: [10, 40],
        backgroundColor: ["#36A2EB", "#FF6384"],
      },
    ],
  };

  it("renders the pie chart", () => {
    render(<FinancePieChart data={mockData} />);
    expect(screen.getByTestId("mock-pie-chart")).toBeInTheDocument();
  });

  it("configures the tooltip to show percentages correctly", () => {
    render(<FinancePieChart data={mockData} />);

    // Get the options passed to the mocked Pie component
    const pieCall = vi.mocked(Pie).mock.calls[0][0];
    const labelCallback = pieCall.options?.plugins?.tooltip?.callbacks?.label;

    expect(labelCallback).toBeDefined();

    if (labelCallback) {
      // Mock the context object that Chart.js would pass to the callback
      const mockContext = {
        label: "A",
        raw: 10,
        chart: {
          data: {
            datasets: [{ data: [10, 40] }],
          },
        },
      };

      // We use a partial mock for the Chart.js context
      // @ts-expect-error - Mocking internal Chart.js context types is complex
      const result = labelCallback(mockContext);

      // Total is 50, value is 10. Percentage should be 20.0%
      expect(result).toBe("A: 20.0%");
    }
  });
});
