import type { FinanceDocument } from "@/types/finance";
import { renderHook, waitFor } from "@testing-library/react";
import { getDoc, type DocumentSnapshot } from "firebase/firestore";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFinanceData } from "../useFinanceData";

// Mock firebase/firestore functions
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

// Mock the firestore db instance
vi.mock("@/lib/firestore", () => ({
  default: {},
}));

describe("useFinanceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console logs during tests to keep output clean
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should initialize with default values and loading state", async () => {
    // Mock getDoc to stay pending to verify initial state
    vi.mocked(getDoc).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFinanceData());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.income).toEqual({
      weeklyContribution: 0,
      specialMissions: 0,
      benevolence: 0,
    });
    expect(result.current.expenses).toEqual([]);
    expect(result.current.centralAdmin).toEqual({
      budget: 0,
      breakdown: [],
    });
  });

  it("should fetch and set data correctly for a flat document structure", async () => {
    const mockData = {
      income: {
        weeklyContribution: 1000,
        specialMissions: 200,
        benevolence: 100,
      },
      expenses: [{ name: "Electricity", amount: 150 }],
      centralAdmin: { budget: 5000, breakdown: [] },
    };

    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockData,
    } as unknown as DocumentSnapshot<FinanceDocument>);

    const { result } = renderHook(() => useFinanceData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.income).toEqual(mockData.income);
    expect(result.current.expenses).toEqual(mockData.expenses);
    expect(result.current.centralAdmin).toEqual(mockData.centralAdmin);
  });

  it("should handle the nested 'public_finance_dashboard.current' structure", async () => {
    const mockNestedData = {
      public_finance_dashboard: {
        current: {
          income: {
            weeklyContribution: 2000,
            specialMissions: 400,
            benevolence: 200,
          },
          expenses: [{ name: "Water", amount: 50 }],
          centralAdmin: { budget: 10000, breakdown: [] },
        },
      },
    };

    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockNestedData,
    } as unknown as DocumentSnapshot<FinanceDocument>);

    const { result } = renderHook(() => useFinanceData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.income).toEqual(
      mockNestedData.public_finance_dashboard.current.income,
    );
    expect(result.current.expenses).toEqual(
      mockNestedData.public_finance_dashboard.current.expenses,
    );
  });

  it("should handle non-existent document gracefully", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
    } as unknown as DocumentSnapshot<FinanceDocument>);

    const { result } = renderHook(() => useFinanceData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it("should set an error state when fetching fails", async () => {
    vi.mocked(getDoc).mockRejectedValue(
      new Error("Firestore connection failure"),
    );

    const { result } = renderHook(() => useFinanceData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("Failed to load financial data");
  });
});
