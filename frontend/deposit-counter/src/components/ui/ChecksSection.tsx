import NumericInput from "@/components/ui/NumericInput";
import { FaDollarSign } from "react-icons/fa6";

export interface Check {
  number: string;
  amount: number;
}

interface ChecksSectionProps {
  checks: Check[];
  setChecks: (checks: Check[]) => void;
}

export default function ChecksSection({
  checks,
  setChecks,
}: ChecksSectionProps) {
  return (
    <div className="flex gap-3 flex-col mt-4">
      <span className="prose">
        <h2>Checks</h2>
      </span>
      <div className="flex flex-col gap-3">
        {checks.map((check, idx) => (
          <div key={idx} className="flex gap-3 items-center">
            <NumericInput
              type="text"
              placeholder="Check #"
              value={check.number}
              onChange={(e) => {
                setChecks(
                  checks.map((c, i) =>
                    i === idx ? { ...c, number: e.target.value } : c,
                  ),
                );
              }}
              className="input input-bordered w-32 text-lg"
            />
            <label className="input flex-1">
              <FaDollarSign />
              <NumericInput
                type="number"
                step="0.01"
                placeholder="Amount"
                value={check.amount || ""}
                onChange={(e) => {
                  setChecks(
                    checks.map((c, i) =>
                      i === idx ? { ...c, amount: Number(e.target.value) } : c,
                    ),
                  );
                }}
                className="input input-bordered text-lg"
              />
            </label>
          </div>
        ))}
        <button
          className="btn btn-outline p-4 w-full md:w-auto"
          onClick={() => setChecks([...checks, { number: "", amount: 0 }])}
          aria-label="Add Check"
        >
          Add Check
        </button>
      </div>
    </div>
  );
}
