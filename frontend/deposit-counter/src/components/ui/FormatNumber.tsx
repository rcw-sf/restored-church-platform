import { formatNumberValue } from "@/utils/formatNumberValue";

interface FormatNumberProps {
  value: number;
  style?: "currency" | "decimal" | "percent"; // more styles possible
  currency?: string; // only needed if style === "currency"
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export default function FormatNumber({
  value,
  style = "currency",
  currency = "USD",
  minimumFractionDigits,
  maximumFractionDigits,
}: FormatNumberProps) {
  return (
    <>
      {formatNumberValue(value, {
        style,
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
      })}
    </>
  );
}
