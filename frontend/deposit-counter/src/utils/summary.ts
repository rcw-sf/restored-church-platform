import type { SummaryItem } from "@/types/SummaryItem";
import { DateTime } from "luxon";

export const resultFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const countFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatDenominations(
  denominations: number[],
  counts: Record<number, number>,
  isCoin = false,
) {
  let text = "";
  denominations.forEach((denom) => {
    const count = counts[denom] || 0;
    if (count !== 0) {
      const result = count * denom;
      const denomFormatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: isCoin ? 2 : 0,
      });
      if (isCoin) {
        text += `  ${denomFormatter.format(denom)} x ${countFormatter.format(count)} = ${resultFormatter.format(result)}\n`;
      } else {
        text += `  ${denomFormatter.format(denom)} x ${countFormatter.format(count)} = ${resultFormatter.format(result)}\n`;
      }
    }
  });
  return text;
}

export function generateTextSummary(
  description: string,
  date: string,
  billTotal: number,
  billCounts: Record<number, number>,
  coinTotal: number,
  coinCounts: Record<number, number>,
  checks: { number: string; amount: number }[],
  summaryItems: SummaryItem[],
) {
  let text = "";
  const formattedDate = DateTime.fromISO(date, {
    zone: "America/Los_Angeles",
  }).toLocaleString(DateTime.DATE_FULL);
  text += `${description} (${formattedDate})\n\n`;

  text += "Bills:\n";
  text +=
    billTotal === 0
      ? "  No Bills\n"
      : formatDenominations(Object.keys(billCounts).map(Number), billCounts);

  text += "\nCoins:\n";
  text +=
    coinTotal === 0
      ? "  No Coins\n"
      : formatDenominations(
          Object.keys(coinCounts).map(Number),
          coinCounts,
          true,
        );

  text += "\nChecks:\n";
  if (checks.length === 0) {
    text += "  No Checks\n";
  } else {
    checks.forEach((check) => {
      text += `  #${check.number || "(blank)"}: ${resultFormatter.format(check.amount || 0)}\n`;
    });
  }

  text += "\nSummary:\n";
  summaryItems.forEach(({ label, value }) => {
    text += `  ${label}: ${resultFormatter.format(value)}\n`;
  });

  return text;
}
