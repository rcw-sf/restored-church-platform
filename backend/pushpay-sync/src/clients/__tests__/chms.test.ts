import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEnvironment } from "../../env.js";
import { fetchPushpayChms } from "../chms.js";

vi.mock("../../env.js", () => ({
  getEnvironment: vi.fn(),
}));

describe("fetchPushpayChms", () => {
  const mockEnv = {
    pushpayChmsApiUsername: "testuser",
    pushpayChmsApiPassword: "testpassword",
    pushpayChmsApiBaseUrl: "https://api.example.com/",
    pushpayGivingApiBaseUrl: "https://giving.example.com/",
    pushpayAuthTokenApiBaseUrl: "https://auth.example.com/",
    pushpayAuthTokenUsername: "authuser",
    pushpayAuthTokenPassword: "authpassword",
    pushpayOrganizationId: "org123",
    contributionFundKey: "contribution",
    benevolenceFundKey: "benevolence",
    specialMissionsFundKey: "missions",
    firebaseProjectId: "test-project",
    tenantId: "test-tenant",
    syncType: "yesterday" as const,
    pushpayRateLimitMs: 6000,
    maxSyncStateTtlDays: 30,
    maxDailyUsageTtlDays: 60,
    transactionTtlDays: 30,
    weeklyGivingSummaryTtlDays: 90,
    githubActionCachePath: "/tmp",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvironment).mockReturnValue(mockEnv);

    // Mock global fetch
    global.fetch = vi.fn();

    // Suppress console logs during tests to keep output clean
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should fetch data successfully with correct parameters and headers", async () => {
    const mockResponseText = "<xml>data</xml>";
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => mockResponseText,
    } as Response);

    const result = await fetchPushpayChms(123, "test_srv", false);

    expect(result).toBe(mockResponseText);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from("testuser:testpassword").toString("base64")}`,
        },
      }),
    );

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get("srv")).toBe("test_srv");
    expect(calledUrl.searchParams.get("id")).toBe("123");
    expect(calledUrl.searchParams.get("include_inactive")).toBe("false");
  });

  it("should use default values for srv and includeInactive", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "ok",
    } as Response);

    await fetchPushpayChms(456);

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get("srv")).toBe("execute_advanced_search");
    expect(calledUrl.searchParams.get("include_inactive")).toBe("true");
  });

  it("should throw an error when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    } as Response);

    await expect(fetchPushpayChms(123)).rejects.toThrow(
      "Pushpay error 404: Not Found",
    );
  });
});
