import { getEnvironment } from "../env.js";

export async function fetchPushpayChms(
  id: number,
  srv: string = "execute_advanced_search",
  includeInactive: boolean = true,
): Promise<string> {
  const environment = getEnvironment();

  const HEADERS = {
    Authorization: `Basic ${Buffer.from(`${environment.pushpayChmsApiUsername}:${environment.pushpayChmsApiPassword}`).toString("base64")}`,
  };

  const url = new URL(environment.pushpayChmsApiBaseUrl);
  url.searchParams.set("srv", srv);
  url.searchParams.set("id", String(id));
  url.searchParams.set("include_inactive", String(includeInactive));

  console.log(`Fetching Pushpay data from ${url}`);

  const res = await fetch(url, {
    method: "GET",
    headers: HEADERS,
  });

  console.log(`Reponse Code: ${res.status}`);

  if (!res.ok) {
    throw new Error(`Pushpay error ${res.status}: ${await res.text()}`);
  }

  return res.text();
}
