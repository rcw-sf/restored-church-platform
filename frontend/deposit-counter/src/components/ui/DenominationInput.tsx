import FormatNumber from "@/components/ui/FormatNumber";
import NumericInput from "@/components/ui/NumericInput";
import { useState } from "react";

interface DenominationInputProps {
  multiplier: number;
  onValueChange: (value: number) => void;
  value?: number;
}

function DenominationInput({
  multiplier,
  onValueChange,
  value,
}: DenominationInputProps) {
  const [currencyCount, setCurrencyCount] = useState(0);
  const count = value !== undefined ? value : currencyCount;

  return (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full">
      {/* Input group with multiplier inside input */}
      <label className="input w-full md:flex-1">
        <NumericInput
          type="number"
          value={count === 0 ? "" : count}
          onChange={(e) => {
            const valueAsNumber =
              e.target.value === "" ? 0 : Number(e.target.value);
            if (value === undefined) {
              setCurrencyCount(valueAsNumber);
            }
            onValueChange(valueAsNumber);
          }}
          className="input input-bordered w-full text-lg"
          placeholder="0"
        />

        <span className="badge badge-primary w-40 dark:badge-primary">
          x <FormatNumber value={multiplier} style="currency" currency="USD" />
        </span>
      </label>

      {/* Result */}
      <div className="text-right font-medium text-lg w-full md:w-24">
        <FormatNumber
          value={multiplier * count}
          style="currency"
          currency="USD"
        />
      </div>
    </div>
  );
}

export default DenominationInput;
