import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getEnvironment } from "../../env.js";
import {
  PushpayAccessTokenResponse,
  PushpayPaymentsResponse,
  PushpayTransaction,
} from "../../types/pushpay.js";
import {
  fetchPushpayGiving,
  parsePaymentType,
  clearAccessTokenCache,
  setMaxLoop,
  resetMaxLoop,
} from "../giving.js";

// Mock fetch
global.fetch = vi.fn();
const mockedFetch = vi.mocked(fetch);

// Mock getEnvironment
vi.mock("../../env.js");
const mockedGetEnvironment = vi.mocked(getEnvironment);

describe("pushpay giving client", () => {
  const mockEnv = {
    pushpayChmsApiBaseUrl: "https://chms.pushpay.com",
    pushpayChmsApiUsername: "chms-user",
    pushpayChmsApiPassword: "chms-pass",
    pushpayAuthTokenUsername: "test-user",
    pushpayAuthTokenPassword: "test-pass",
    pushpayAuthTokenApiBaseUrl: "https://auth.pushpay.com/oauth/token",
    pushpayGivingApiBaseUrl: "https://api.pushpay.com/v1",
    pushpayOrganizationId: "test-org-id",
    contributionFundKey: "general",
    benevolenceFundKey: "benevolence",
    specialMissionsFundKey: "missions",
    firebaseProjectId: "test-project",
    tenantId: "test",
    syncType: "yesterday" as const,
    pushpayRateLimitMs: 6000,
    maxSyncStateTtlDays: 30,
    maxDailyUsageTtlDays: 60,
    transactionTtlDays: 30,
    weeklyGivingSummaryTtlDays: 90,
    githubActionCachePath: "/tmp",
    googleSpreadsheetId: "test-sheet-id",
  };

  const mockAccessTokenResponse: PushpayAccessTokenResponse = {
    access_token: "test-access-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope: "read list_my_merchants merchant:view_payments",
  };

  const mockTransaction: PushpayTransaction = {
    transactionId: "txn-123",
    status: "Completed",
    payer: {
      fullName: "John Doe",
      email: "john@example.com",
    },
    communityMember: {
      key: "member-456",
    },
    amount: {
      amount: 100.0,
      currency: "USD",
    },
    paymentMethodType: "Online",
    createdOn: "2023-01-01T12:00:00Z",
    givenOn: "2023-01-01T12:00:00Z",
    fund: {
      key: "fund-789",
      name: "General Fund",
    },
  };

  const mockPaymentsResponse: PushpayPaymentsResponse = {
    items: [mockTransaction],
    page: 0,
    pageSize: 100,
    totalPages: 1,
    totalItems: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetEnvironment.mockReturnValue(mockEnv);
    clearAccessTokenCache();
  });

  afterEach(() => {
    vi.resetAllMocks();
    resetMaxLoop();
  });

  describe("fetchPushpayGiving", () => {
    it("should fetch transactions successfully", async () => {
      // Mock auth response
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          json: async () => mockAccessTokenResponse,
          text: async () => "",
          type: "basic" as const,
          url: "",
          redirected: false,
          clone: () => ({}) as Response,
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
        } as Response)
        // Mock payments response
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          json: async () => mockPaymentsResponse,
          text: async () => "",
          type: "basic" as const,
          url: "",
          redirected: false,
          clone: () => ({}) as Response,
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
        } as Response);

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");
      const result = await fetchPushpayGiving(from, to);

      expect(result).toEqual([mockTransaction]);
      expect(mockedFetch).toHaveBeenCalledTimes(2); // Auth + One page only

      // Verify auth call
      const authCall = mockedFetch.mock.calls[0];
      expect(authCall[0]).toBe(mockEnv.pushpayAuthTokenApiBaseUrl);
      expect(authCall[1]).toMatchObject({
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: expect.stringMatching(/^Basic /),
        },
      });

      // Verify payments call
      const paymentsCall = mockedFetch.mock.calls[1];
      const paymentsUrl = paymentsCall[0] as URL;
      expect(paymentsUrl).toBeInstanceOf(URL);
      expect(paymentsUrl.href).toContain(mockEnv.pushpayGivingApiBaseUrl);
      expect(paymentsUrl.href).toContain(mockEnv.pushpayOrganizationId);
      expect(paymentsCall[1]).toMatchObject({
        method: "GET",
        headers: {
          Authorization: "Bearer test-access-token",
        },
      });
    });

    it("should handle authentication errors", async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        text: async () => "Unauthorized",
        type: "basic" as Response["type"],
        url: "",
        redirected: false,
        clone: () => ({}) as Response,
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
      } as Response);

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");

      await expect(fetchPushpayGiving(from, to)).rejects.toThrow(
        "Pushpay Auth error 401: Unauthorized",
      );
    });

    it("should handle API errors", async () => {
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          json: async () => mockAccessTokenResponse,
          text: async () => "",
          type: "basic" as const,
          url: "",
          redirected: false,
          clone: () => ({}) as Response,
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: new Headers(),
          text: async () => "Internal Server Error",
          type: "basic" as const,
          url: "",
          redirected: false,
          clone: () => ({}) as Response,
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
        } as Response);

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");

      await expect(fetchPushpayGiving(from, to)).rejects.toThrow(
        "Pushpay giving API error 500: Internal Server Error",
      );
    });

    it("should handle rate limiting with retry-after header", async () => {
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockAccessTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers({ "retry-after": "1" }),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: async () => "Rate Limited",
          json: vi.fn(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockPaymentsResponse,
        });

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");

      // Mock setTimeout to avoid actual delay
      vi.useFakeTimers();
      const mockSetTimeout = vi.fn((cb: () => void, delay: number) => {
        if (delay === 1000) {
          // Rate limit delay - execute immediately
          cb();
          return { ref: 1 } as unknown as NodeJS.Timeout;
        }
        return { ref: 1 } as unknown as NodeJS.Timeout;
      });
      vi.stubGlobal("setTimeout", mockSetTimeout);

      const result = await fetchPushpayGiving(from, to);

      expect(result).toEqual([mockTransaction]);
      expect(mockedFetch).toHaveBeenCalledTimes(3); // Auth + Rate limit + Success
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      vi.useRealTimers();
    });

    it("should handle rate limiting without retry-after header", async () => {
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockAccessTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: async () => "Rate Limited",
          json: vi.fn(),
        });

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");

      await expect(fetchPushpayGiving(from, to)).rejects.toThrow(
        "Pushpay giving API error 429: Rate limited without retry-after header",
      );
    });

    it("should handle pagination correctly", async () => {
      // Override MAX_LOOP to allow pagination
      setMaxLoop(10);

      const multiPageResponse: PushpayPaymentsResponse = {
        items: [mockTransaction],
        page: 0,
        pageSize: 1,
        totalPages: 2,
        totalItems: 2,
      };

      const secondPageResponse: PushpayPaymentsResponse = {
        items: [{ ...mockTransaction, transactionId: "txn-456" }],
        page: 1,
        pageSize: 1,
        totalPages: 2,
        totalItems: 2,
      };

      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockAccessTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => multiPageResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => secondPageResponse,
        });

      // Mock setTimeout for pagination delay
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((cb: () => void) => {
        cb();
        return { ref: 1 } as unknown as NodeJS.Timeout;
      }) as unknown as typeof setTimeout;

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");
      const result = await fetchPushpayGiving(from, to);

      expect(result).toHaveLength(2);
      expect(result[0].transactionId).toBe("txn-123");
      expect(result[1].transactionId).toBe("txn-456");

      global.setTimeout = originalSetTimeout;
      resetMaxLoop();
    });

    it("should format date parameters correctly", async () => {
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockAccessTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockPaymentsResponse,
        });

      const from = DateTime.fromISO("2023-01-01T10:30:00");
      const to = DateTime.fromISO("2023-01-02T15:45:00");

      await fetchPushpayGiving(from, to);

      const paymentsCall = mockedFetch.mock.calls[1];
      const url = new URL(paymentsCall[0] as string);

      expect(url.searchParams.get("from")).toBe(
        from.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'"),
      );
      expect(url.searchParams.get("to")).toBe(
        to.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'"),
      );
      expect(url.searchParams.get("pageSize")).toBe("100");
      expect(url.searchParams.get("page")).toBe("0");
    });

    it("should respect MAX_LOOP limit", async () => {
      // Override MAX_LOOP to hit limit
      setMaxLoop(1);

      const multiPageResponse: PushpayPaymentsResponse = {
        items: [mockTransaction],
        page: 0,
        pageSize: 1,
        totalPages: 5, // More pages than MAX_LOOP
        totalItems: 5,
      };

      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => mockAccessTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          type: "basic" as Response["type"],
          url: "",
          redirected: false,
          clone: vi.fn(),
          body: null,
          bodyUsed: false,
          bytes: vi.fn(),
          arrayBuffer: vi.fn(),
          blob: vi.fn(),
          formData: vi.fn(),
          text: vi.fn(),
          json: async () => multiPageResponse,
        });

      const from = DateTime.fromISO("2023-01-01");
      const to = DateTime.fromISO("2023-01-02");
      const result = await fetchPushpayGiving(from, to);

      // Should return after first page due to MAX_LOOP = 1
      expect(result).toHaveLength(1);
      expect(mockedFetch).toHaveBeenCalledTimes(2); // Auth + One page only

      vi.useRealTimers();
    });
  });

  describe("parsePaymentType", () => {
    it("should parse check payment types", () => {
      expect(parsePaymentType("Check")).toBe("Check");
      expect(parsePaymentType("check")).toBe("Check");
      expect(parsePaymentType("CHECK")).toBe("Check");
      expect(parsePaymentType("Electronic Check")).toBe("Check");
    });

    it("should parse cash payment types", () => {
      expect(parsePaymentType("Cash")).toBe("Cash");
      expect(parsePaymentType("cash")).toBe("Cash");
      expect(parsePaymentType("CASH")).toBe("Cash");
      expect(parsePaymentType("Cash Donation")).toBe("Cash");
    });

    it("should parse online payment types", () => {
      expect(parsePaymentType("ACH")).toBe("Online");
      expect(parsePaymentType("ach")).toBe("Online");
      expect(parsePaymentType("Card")).toBe("Online");
      expect(parsePaymentType("card")).toBe("Online");
      expect(parsePaymentType("Credit Card")).toBe("Online");
      expect(parsePaymentType("Debit Card")).toBe("Online");
      expect(parsePaymentType("Bank Transfer")).toBe("Online");
    });

    it("should return Other for unknown payment types", () => {
      expect(parsePaymentType("Unknown")).toBe("Other");
      expect(parsePaymentType("")).toBe("Other");
      expect(parsePaymentType("Stock")).toBe("Other");
      expect(parsePaymentType("In-Kind")).toBe("Other");
    });

    it("should handle case insensitive matching", () => {
      expect(parsePaymentType("cHeCk")).toBe("Check");
      expect(parsePaymentType("CaSh")).toBe("Cash");
      expect(parsePaymentType("ACh")).toBe("Online");
      expect(parsePaymentType("CaRd")).toBe("Online");
    });

    it("should handle partial matches", () => {
      expect(parsePaymentType("Electronic Check Transfer")).toBe("Check");
      expect(parsePaymentType("Cash Collection")).toBe("Cash");
      expect(parsePaymentType("ACH Payment")).toBe("Online");
      expect(parsePaymentType("Card Processing")).toBe("Online");
    });
  });
});
