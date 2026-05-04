import { DateTime } from "luxon";
import { getEnvironment } from "../env.js";
import {
  PaymentType,
  PushpayAccessTokenResponse,
  PushpayPaymentsResponse,
  PushpayTransaction,
} from "../types/pushpay.js";

let MAX_LOOP = 50;

export function setMaxLoop(value: number): void {
  MAX_LOOP = value;
}

export function resetMaxLoop(): void {
  MAX_LOOP = 50;
}

let accessTokenCache: { token: string; expiresAt: number } | null = null;

export function clearAccessTokenCache(): void {
  accessTokenCache = null;
}

async function getAccessToken(): Promise<string> {
  const env = getEnvironment();
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  const authString = Buffer.from(
    `${env.pushpayAuthTokenUsername}:${env.pushpayAuthTokenPassword}`,
  ).toString("base64");
  const response = await fetch(env.pushpayAuthTokenApiBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "read list_my_merchants merchant:view_payments",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Pushpay Auth error ${response.status}: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as PushpayAccessTokenResponse;

  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60000,
  };

  return data.access_token;
}

export async function fetchPushpayGiving(
  from: DateTime,
  to: DateTime,
): Promise<PushpayTransaction[]> {
  const env = getEnvironment();
  const token = await getAccessToken();
  let allTransactions: PushpayTransaction[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(
      `${env.pushpayGivingApiBaseUrl}/organization/${env.pushpayOrganizationId}/payments`,
    );
    url.searchParams.set(
      "from",
      from.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'"),
    );
    url.searchParams.set("to", to.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'"));
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("page", String(page));

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          await new Promise((r) => setTimeout(r, Number(retryAfter) * 1000));
          continue;
        } else {
          // If no retry-after header, throw error
          throw new Error(
            `Pushpay giving API error ${res.status}: Rate limited without retry-after header`,
          );
        }
      }

      throw new Error(
        `Pushpay giving API error ${res.status}: ${await res.text()}`,
      );
    }

    const data = (await res.json()) as PushpayPaymentsResponse;

    allTransactions = allTransactions.concat(data.items);
    hasMore = data.page + 1 < data.totalPages;
    page++;

    if (page >= MAX_LOOP) {
      return allTransactions;
    }

    if (hasMore) await new Promise((r) => setTimeout(r, 500));
  }

  return allTransactions;
}

export function parsePaymentType(type: string): PaymentType {
  const t = type.toLowerCase();
  if (t.includes("check")) return "Check";
  if (t.includes("cash")) return "Cash";
  if (t.includes("ach") || t.includes("card") || t.includes("bank"))
    return "Online";
  return "Other";
}
