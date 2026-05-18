import { DateTime } from "luxon";
import { calculateSundayDate } from "../date-utils.js";

/**
 * Calculate effective from date based on last successful sync
 */
export function calculateEffectiveFromDate(
  from: DateTime,
  lastSuccessfulSync: { dateRange?: { to?: string } } | null,
): DateTime {
  if (!lastSuccessfulSync?.dateRange?.to) {
    return from;
  }

  const lastToDate = DateTime.fromISO(lastSuccessfulSync.dateRange.to);
  // Use the last successful sync's 'to' date minus 1 second as the new 'from' date
  // Both 'from' and 'to' parameters are exclusive, so we subtract 1 second to avoid
  // missing payments at the exact boundary time
  const calculatedFrom = lastToDate.minus({ seconds: 1 });

  // Only use the calculated from date if it's not after the original from date
  // This ensures we respect SYNC_TYPE boundaries and don't skip data
  if (calculatedFrom <= from) {
    console.log(
      `🔄 Using last successful sync's to date (${lastSuccessfulSync.dateRange.to}) as from date`,
    );
    return calculatedFrom;
  } else {
    console.log(
      `📅 Last successful sync's to date (${lastSuccessfulSync.dateRange.to}) would skip data, using SYNC_TYPE based from date instead`,
    );
    return from;
  }
}

/**
 * Calculate the gift date from givenOn or createdOn
 */
export function calculateGiftDate(
  givenOn: string | undefined,
  createdOn: string,
): DateTime {
  return givenOn
    ? DateTime.fromFormat(givenOn, "yyyy-MM-dd", {
        zone: "America/Los_Angeles",
      })
    : DateTime.fromISO(createdOn).setZone("America/Los_Angeles");
}

/**
 * Calculate Sunday date range for querying existing records
 */
export function calculateSundayRange(
  effectiveFrom: DateTime,
  to: DateTime,
): { startSunday: string; endSunday: string } {
  const startSunday = calculateSundayDate(effectiveFrom).toFormat("yyyy-MM-dd");
  const endSunday = calculateSundayDate(to).toFormat("yyyy-MM-dd");
  return { startSunday, endSunday };
}
