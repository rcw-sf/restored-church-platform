import { google } from "googleapis";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEnvironment } from "../../env.js";
import {
  AdditionSheetRow,
  MembershipSheetRow,
  TakeawaySheetRow,
} from "../../types/google-sheets.js";
import {
  clearSheet,
  appendToAdditionsSheet,
  appendToMembershipListSheet,
  appendToTakeawaysSheet,
} from "../google-sheets.js";

vi.mock("../../env.js", () => ({
  getEnvironment: vi.fn(),
}));

// Mock googleapis
vi.mock("googleapis", () => {
  const mockClear = vi.fn();
  const mockUpdate = vi.fn();

  return {
    google: {
      auth: {
        GoogleAuth: vi.fn().mockImplementation(function () {
          return {};
        }),
      },
      sheets: vi.fn().mockReturnValue({
        spreadsheets: {
          values: {
            clear: mockClear,
            update: mockUpdate,
          },
        },
      }),
    },
  };
});

describe("google-sheets.ts", () => {
  let mockClear: import("vitest").Mock;
  let mockUpdate: import("vitest").Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.mocked(getEnvironment).mockReturnValue({
      tenantId: "test-tenant",
      googleSpreadsheetId: "test-sheet-id",
    } as unknown as import("../../env.js").Environment);

    // Get the mocked methods
    const sheets = google.sheets({ version: "v4" }) as unknown as {
      spreadsheets: {
        values: {
          clear: import("vitest").Mock;
          update: import("vitest").Mock;
        };
      };
    };
    mockClear = sheets.spreadsheets.values.clear;
    mockUpdate = sheets.spreadsheets.values.update;
  });

  describe("clearSheet", () => {
    it("should call sheets.spreadsheets.values.clear with the correct spreadsheet and range", async () => {
      await clearSheet("ADDITIONS");
      expect(mockClear).toHaveBeenCalledWith({
        spreadsheetId: "test-sheet-id",
        range: "ADDITIONS!A2:Z",
      });
    });

    it("should skip if GOOGLE_SPREADSHEET_ID is not set", async () => {
      vi.mocked(getEnvironment).mockReturnValue({
        tenantId: "test-tenant",
      } as unknown as import("../../env.js").Environment);
      await clearSheet("ADDITIONS");
      expect(console.warn).toHaveBeenCalledWith(
        "[Google Sheets] Skipping clearSheet: GOOGLE_SPREADSHEET_ID is not set",
      );
      expect(mockClear).not.toHaveBeenCalled();
    });
  });

  describe("appendToAdditionsSheet", () => {
    it("should format rows and call sheets.spreadsheets.values.update", async () => {
      const mockRows: AdditionSheetRow[] = [
        {
          id: "row1",
          date: "01/01/2023",
          type: "Baptism",
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          region: "San Mateo",
          ministry: "Campus",
          bibleTalk: "Uptown BT",
          weeklyPledge: "100",
          phone: "555-0000",
          email: "john@example.com",
          physicalBirthday: "01/01/1995",
          spiritualBirthday: "01/01/2015",
          homeAddress: "123 Main St",
          notes: "Some notes",
        },
      ];

      await appendToAdditionsSheet(mockRows);

      expect(mockUpdate).toHaveBeenCalledWith({
        spreadsheetId: "test-sheet-id",
        range: "ADDITIONS!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              "row1",
              "01/01/2023",
              "Baptism",
              "John",
              "Doe",
              "Male",
              "San Mateo",
              "Campus",
              "Uptown BT",
              "100",
              "555-0000",
              "john@example.com",
              "01/01/1995",
              "01/01/2015",
              "123 Main St",
              "Some notes",
            ],
          ],
        },
      });
    });
  });

  describe("appendToMembershipListSheet", () => {
    it("should format rows and call sheets.spreadsheets.values.update", async () => {
      const mockRows: MembershipSheetRow[] = [
        {
          id: "row1",
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          region: "San Mateo",
          ministry: "Campus",
          bibleTalk: "Uptown BT",
          weeklyPledge: "100",
          phone: "555-0000",
          email: "john@example.com",
          physicalBirthday: "01/01/1995",
          spiritualBirthday: "01/01/2015",
          homeAddress: "123 Main St",
          notes: "Some notes",
        },
      ];

      await appendToMembershipListSheet(mockRows);

      expect(mockUpdate).toHaveBeenCalledWith({
        spreadsheetId: "test-sheet-id",
        range: "MEMBERSHIP LIST!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              "row1",
              "John",
              "Doe",
              "Male",
              "San Mateo",
              "Campus",
              "Uptown BT",
              "100",
              "555-0000",
              "john@example.com",
              "01/01/1995",
              "01/01/2015",
              "123 Main St",
              "Some notes",
            ],
          ],
        },
      });
    });
  });

  describe("appendToTakeawaysSheet", () => {
    it("should skip if GOOGLE_SPREADSHEET_ID is not set", async () => {
      vi.mocked(getEnvironment).mockReturnValue({
        googleSpreadsheetId: "",
      } as unknown as import("../../env.js").Environment);
      await appendToTakeawaysSheet([]);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should format rows and call sheets.spreadsheets.values.update", async () => {
      vi.mocked(getEnvironment).mockReturnValue({
        googleSpreadsheetId: "test-sheet",
        tenantId: "test-tenant",
      } as unknown as import("../../env.js").Environment);

      const rows: TakeawaySheetRow[] = [
        {
          id: "1",
          date: "01/01/2023",
          type: "Fallaway",
          firstName: "John",
          lastName: "Doe",
          gender: "Male",
          region: "San Mateo",
          ministry: "Campus",
          bibleTalk: "Downtown",
          weeklyPledge: "100",
          phone: "555-0000",
          email: "john@example.com",
          physicalBirthday: "01/01/1995",
          spiritualBirthday: "01/01/2015",
          movedTo: "Los Angeles",
          homeAddress: "123 Main St",
          notes: "Some notes",
        },
      ];

      await appendToTakeawaysSheet(rows);

      expect(mockUpdate).toHaveBeenCalledWith({
        spreadsheetId: "test-sheet",
        range: "TAKEAWAYS!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              "1",
              "01/01/2023",
              "Fallaway",
              "John",
              "Doe",
              "Male",
              "San Mateo",
              "Campus",
              "Downtown",
              "100",
              "555-0000",
              "john@example.com",
              "01/01/1995",
              "01/01/2015",
              "123 Main St",
              "Los Angeles",
              "Some notes",
            ],
          ],
        },
      });
    });
  });
});
