import DenominationInput from "@/components/ui/DenominationInput";
import { useState, useEffect } from "react";

interface DepositSectionProps {
  title: string;
  denominations: number[];
  onTotalChange?: (total: number) => void;
  onCountsChange?: (counts: Record<number, number>) => void;
  resetTrigger?: number | boolean;
}

function DepositSection({
  title,
  denominations,
  onTotalChange,
  onCountsChange,
  resetTrigger,
}: DepositSectionProps) {
  const [counts, setCounts] = useState<Record<number, number>>({});

  // Reset counts when resetTrigger changes
  useEffect(() => {
    setCounts({});
  }, [resetTrigger]);

  const handleChange = (denomination: number, value: number) => {
    setCounts((prev) => {
      const newCounts = { ...prev, [denomination]: value };
      // sum all denomination totals and pass up
      const total = Object.entries(newCounts).reduce(
        (sum, [denom, count]) => sum + Number(denom) * count,
        0,
      );
      onTotalChange?.(total);
      onCountsChange?.(newCounts);
      return newCounts;
    });
  };

  return (
    <div className="grid gap-3 mt-4 w-full">
      <span className="prose">
        <h2>{title}</h2>
      </span>
      {denominations.map((denomination) => (
        <DenominationInput
          key={denomination}
          multiplier={denomination}
          onValueChange={(count) => handleChange(denomination, count)}
          value={counts[denomination] || 0}
        />
      ))}
    </div>
  );
}

export default DepositSection;
