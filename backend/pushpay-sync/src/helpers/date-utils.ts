import { DateTime } from "luxon";

/**
 * Returns the Sunday of the week for a given date.
 * If Monday-Saturday, returns the following Sunday.
 * If Sunday, returns itself.
 */
export function calculateSundayDate(date: DateTime): DateTime {
  if (date.weekday === 7) {
    return date.startOf("day");
  }
  return date.plus({ days: 7 - date.weekday }).startOf("day");
}
