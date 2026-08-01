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

export interface PushpayIndividualPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_phone?: string;
  home_phone?: string;
  work_phone?: string;
  mobile_phone?: string;
  emergency_phone?: string;
  gender?: string; // 'm' or 'f'
  birthday?: string; // date format
  anniversary?: string;
  membership_date?: string;
  membership_end?: string;
  marital_status?: string;
  mailing_street_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  mailing_country?: string;
  home_street_address?: string;
  home_city?: string;
  home_state?: string;
  home_zip?: string;
  home_country?: string;
  udf_pulldown_6?: string; // Region
  udf_pulldown_5?: string; // Ministry
  udf_text_10?: string; // Pledge
  udf_text_9?: string; // Bible Talk
  udf_date_6?: string; // Baptized Date
  udf_pulldown_2?: string; // Super Region
  udf_pulldown_4?: string; // Type (PM, Restoration, Baptism)
  udf_text_7?: string; // Pushpay Spouse Community Member Key
  udf_text_8?: string; // Pushpay Community Member Key
  udf_text_11?: string; // Moved To
  udf_text_12?: string; // Reason for Fallaway
}

export async function createIndividual(
  payload: PushpayIndividualPayload,
): Promise<string> {
  const environment = getEnvironment();

  if (!payload.first_name || !payload.last_name) {
    throw new Error(
      "first_name and last_name are required to create an individual in Pushpay",
    );
  }

  const HEADERS = {
    Authorization: `Basic ${Buffer.from(`${environment.pushpayChmsApiUsername}:${environment.pushpayChmsApiPassword}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const url = new URL(environment.pushpayChmsApiBaseUrl);
  url.searchParams.set("srv", "create_individual");

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) body.append(key, value);
  }

  console.log(`Creating Pushpay individual record...`);

  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `Pushpay create_individual error ${res.status}: ${await res.text()}`,
    );
  }

  return res.text();
}

export async function updateIndividual(
  individualId: string,
  payload: PushpayIndividualPayload,
): Promise<string> {
  const environment = getEnvironment();

  const HEADERS = {
    Authorization: `Basic ${Buffer.from(`${environment.pushpayChmsApiUsername}:${environment.pushpayChmsApiPassword}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const url = new URL(environment.pushpayChmsApiBaseUrl);
  url.searchParams.set("srv", "update_individual");
  url.searchParams.set("individual_id", individualId);

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) body.append(key, value);
  }

  console.log(`Updating Pushpay individual ${individualId}`);

  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `Pushpay update_individual error ${res.status}: ${await res.text()}`,
    );
  }

  return res.text();
}
