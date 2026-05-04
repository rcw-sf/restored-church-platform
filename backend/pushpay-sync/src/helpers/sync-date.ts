import { DateTime } from "luxon";
import { Environment, getEnvironment } from "../env.js";

export function getSyncDates(syncType: Environment["syncType"]): {
  from: DateTime;
  to: DateTime;
} {
  const env = getEnvironment();

  // If custom date range is provided via environment variables, use those
  if (env.syncFrom && env.syncTo) {
    const from = DateTime.fromISO(env.syncFrom, {
      zone: "America/Los_Angeles",
    });
    const to = DateTime.fromISO(env.syncTo, { zone: "America/Los_Angeles" });

    if (!from.isValid || !to.isValid) {
      throw new Error(
        `Invalid date format in SYNC_FROM or SYNC_TO. Expected ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss). Got: SYNC_FROM=${env.syncFrom}, SYNC_TO=${env.syncTo}`,
      );
    }

    if (from > to) {
      throw new Error(
        `SYNC_FROM (${env.syncFrom}) cannot be after SYNC_TO (${env.syncTo})`,
      );
    }

    return { from, to };
  }

  // Otherwise use syncType-based dates
  if (syncType === "today") {
    const today = DateTime.now().setZone("America/Los_Angeles");
    return { from: today.startOf("day"), to: today };
  } else if (syncType === "yesterday") {
    const yesterday = DateTime.now()
      .setZone("America/Los_Angeles")
      .minus({ days: 1 });
    return { from: yesterday.startOf("day"), to: yesterday.endOf("day") };
  } else {
    const today = DateTime.now().setZone("America/Los_Angeles");
    const monday = today.startOf("week");
    return { from: monday, to: today };
  }
}
