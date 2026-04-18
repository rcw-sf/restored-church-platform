interface BreakdownItemProps {
  category: string;
  amount: number;
  percentage: number;
}

export function BreakdownItem({
  category,
  amount,
  percentage,
}: BreakdownItemProps) {
  return (
    <div className="flex justify-between items-center border-b border-base-200 pb-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{category}</span>
        <span className="text-xs opacity-60">{percentage.toFixed(1)}%</span>
      </div>
      <div className="font-bold tabular-nums">
        $
        {amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}
