import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEnvironment } from "../../env.js";
import {
  fetchPushpayChms,
  createIndividual,
  updateIndividual,
} from "../chms.js";

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
    // mockEnv may not include every required property of Environment type (like googleSpreadsheetId),
    // so cast to any to satisfy TypeScript for tests
    vi.mocked(getEnvironment).mockReturnValue(
      mockEnv as ReturnType<typeof getEnvironment>,
    );

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

describe("createIndividual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should throw an error if first_name or last_name is missing", async () => {
    await expect(createIndividual({ first_name: "Jane" })).rejects.toThrow(
      "first_name and last_name are required",
    );
    await expect(createIndividual({ last_name: "Doe" })).rejects.toThrow(
      "first_name and last_name are required",
    );
  });

  it("should send a POST request with correct url encoded payload", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<response>ok</response>",
    } as Response);

    const payload = {
      first_name: "Jane",
      last_name: "Doe",
      udf_text_10: "500",
    };

    const result = await createIndividual(payload);
    expect(result).toBe("<response>ok</response>");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        body: "first_name=Jane&last_name=Doe&udf_text_10=500",
      }),
    );

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get("srv")).toBe("create_individual");
  });
});

describe("updateIndividual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should send a POST request with correct url encoded payload and id", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<response>ok</response>",
    } as Response);

    const payload = {
      udf_pulldown_6: "West",
    };

    const result = await updateIndividual("12345", payload);
    expect(result).toBe("<response>ok</response>");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        body: "udf_pulldown_6=West",
      }),
    );

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get("srv")).toBe("update_individual");
    expect(calledUrl.searchParams.get("individual_id")).toBe("12345");
  });
});
