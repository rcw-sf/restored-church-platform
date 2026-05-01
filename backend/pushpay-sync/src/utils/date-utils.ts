/**
 * Date parser with timezone validation
 * Parses "yyyy-MM-dd HH:mm:ss" format using Luxon for reliable timezone handling
 */
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
