import { google } from "googleapis";
import { getEnvironment } from "../env.js";
import {
  AdditionSheetRow,
  MembershipSheetRow,
  TakeawaySheetRow,
} from "../types/google-sheets.js";

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function clearSheet(tabName: string): Promise<void> {
  const env = getEnvironment();
  if (!env.googleSpreadsheetId) {
    console.warn(
      `[Google Sheets] Skipping clearSheet: GOOGLE_SPREADSHEET_ID is not set`,
    );
    return;
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: env.googleSpreadsheetId,
    range: `${tabName}!A2:Z`,
  });

  console.log(
    `[Google Sheets] Cleared ${tabName} sheet for tenant ${env.tenantId}`,
  );
}

export async function appendToAdditionsSheet(
  rows: AdditionSheetRow[],
): Promise<void> {
  const env = getEnvironment();
  if (!env.googleSpreadsheetId) {
    console.warn(
      `[Google Sheets] Skipping appendToAdditionsSheet: GOOGLE_SPREADSHEET_ID is not set`,
    );
    return;
  }

  const formattedRows = rows.map((r) => [
    r.id,
    r.date,
    r.type,
    r.firstName,
    r.lastName,
    r.gender,
    r.region,
    r.ministry,
    r.bibleTalk,
    r.weeklyPledge,
    r.phone,
    r.email,
    r.physicalBirthday,
    r.spiritualBirthday,
    r.homeAddress,
    r.notes,
  ]);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.googleSpreadsheetId,
    range: `ADDITIONS!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: formattedRows,
    },
  });

  console.log(
    `[Google Sheets] Updated ADDITIONS sheet for tenant ${env.tenantId} with ${formattedRows.length} rows`,
  );
}

export async function appendToMembershipListSheet(
  rows: MembershipSheetRow[],
): Promise<void> {
  const env = getEnvironment();
  if (!env.googleSpreadsheetId) {
    console.warn(
      `[Google Sheets] Skipping appendToMembershipListSheet: GOOGLE_SPREADSHEET_ID is not set`,
    );
    return;
  }

  const formattedRows = rows.map((r) => [
    r.id,
    r.firstName,
    r.lastName,
    r.gender,
    r.region,
    r.ministry,
    r.bibleTalk,
    r.weeklyPledge,
    r.phone,
    r.email,
    r.physicalBirthday,
    r.spiritualBirthday,
    r.homeAddress,
    r.notes,
  ]);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.googleSpreadsheetId,
    range: `MEMBERSHIP LIST!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: formattedRows,
    },
  });

  console.log(
    `[Google Sheets] Updated MEMBERSHIP LIST sheet for tenant ${env.tenantId} with ${formattedRows.length} rows`,
  );
}

export async function appendToTakeawaysSheet(
  rows: TakeawaySheetRow[],
): Promise<void> {
  const env = getEnvironment();
  if (!env.googleSpreadsheetId) {
    console.warn(
      `[Google Sheets] Skipping appendToTakeawaysSheet: GOOGLE_SPREADSHEET_ID is not set`,
    );
    return;
  }

  const formattedRows = rows.map((r) => [
    r.id,
    r.date,
    r.type,
    r.firstName,
    r.lastName,
    r.gender,
    r.region,
    r.ministry,
    r.bibleTalk,
    r.reasonForFallaway,
    r.movedTo,
    r.phone,
    r.email,
    r.notes,
  ]);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.googleSpreadsheetId,
    range: `TAKEAWAYS!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: formattedRows,
    },
  });

  console.log(
    `[Google Sheets] Updated TAKEAWAYS sheet for tenant ${env.tenantId} with ${formattedRows.length} rows`,
  );
}
