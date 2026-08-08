/**
 * Date parser with timezone validation
 * Parses "yyyy-MM-dd HH:mm:ss" format using Luxon for reliable timezone handling
 */
import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";

/**
 * Parses "yyyy-MM-dd HH:mm:ss" format to ISO string
 * Uses Luxon for reliable timezone handling across environments
 */
export function parseDateToISO(
  dateStr: string | undefined,
): string | undefined {
  if (!dateStr) return undefined;

  // Use Luxon for reliable timezone handling and format validation
  const dateTime = DateTime.fromFormat(dateStr, "yyyy-MM-dd HH:mm:ss", {
    zone: "America/Los_Angeles",
  });

  if (!dateTime.isValid) return undefined;

  // Convert to UTC ISO string
  return dateTime.toUTC().toISO();
}

export const formatPushpayDate = (
  dateVal: Timestamp | string | undefined,
): string | undefined => {
  if (!dateVal) return undefined;
  if ((dateVal as Timestamp).toDate) {
    return DateTime.fromJSDate((dateVal as Timestamp).toDate()).toFormat(
      "yyyy-MM-dd",
    );
  }
  if (typeof dateVal === "string") {
    const parsed = DateTime.fromISO(dateVal);
    if (parsed.isValid) {
      return parsed.toFormat("yyyy-MM-dd");
    }
    return dateVal;
  }
  return String(dateVal);
};

export const formatSheetDate = (
  dateVal: Timestamp | string | undefined,
): string => {
  if (!dateVal) return "";
  if ((dateVal as Timestamp).toDate) {
    return DateTime.fromJSDate((dateVal as Timestamp).toDate()).toFormat(
      "MM/dd/yyyy",
    );
  }
  if (typeof dateVal === "string") {
    const parsed = DateTime.fromISO(dateVal);
    if (parsed.isValid) {
      return parsed.toFormat("MM/dd/yyyy");
    }
    return dateVal;
  }
  return String(dateVal);
};
