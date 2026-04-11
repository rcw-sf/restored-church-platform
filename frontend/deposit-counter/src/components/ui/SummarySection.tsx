import FormatNumber from "@/components/ui/FormatNumber";

export interface SummaryItem {
  label: string;
  value: number;
  bold?: boolean;
  count?: number;
}

interface SummarySectionProps {
  summaryItems: SummaryItem[];
}

export default function SummarySection({ summaryItems }: SummarySectionProps) {
  return (
    <>
      <span className="prose">
        <h2>Summary</h2>
      </span>
      <div className="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100 shadow">
        {summaryItems.map(({ label, bold, value, count }, index) => (
          <div
            key={index}
            className="flex justify-between items-center px-4 py-2"
          >
            <span className={bold ? "font-bold" : "font-normal"}>
              {label} {label === "Checks" ? `(${count})` : ""}
            </span>
            <span className={bold ? "font-bold" : "font-normal"}>
              <FormatNumber value={value} style="currency" currency="USD" />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
