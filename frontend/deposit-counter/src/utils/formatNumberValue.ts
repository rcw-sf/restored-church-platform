export interface FormatNumberValueOptions {
  style?: "currency" | "decimal" | "percent";
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatNumberValue(
  value: number,
  {
    style = "currency",
    currency = "USD",
    minimumFractionDigits,
    maximumFractionDigits,
  }: FormatNumberValueOptions = {},
): string {
  return new Intl.NumberFormat("en-US", {
    style,
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}
