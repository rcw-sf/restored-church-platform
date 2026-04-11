import ChecksSection from "@/components/ui/ChecksSection";
import DepositSection from "@/components/ui/DepositSection";
import DescriptionDateInput from "@/components/ui/DescriptionDateInput";
import SummarySection from "@/components/ui/SummarySection";
import Toast from "@/components/ui/Toast";
import type { SummaryItem } from "@/types/SummaryItem";
import { generateTextSummary } from "@/utils/summary";
import { DateTime } from "luxon";
import { useState, useRef, useEffect } from "react";

interface Check {
  number: string;
  amount: number;
}

const billDenominations = [1, 2, 5, 10, 20, 50, 100];
const coinDenominations = [0.01, 0.05, 0.1, 0.25, 0.5, 1];

function Home() {
  const descriptionRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const [date, setDate] = useState<string>(
    DateTime.now().toFormat("yyyy-MM-dd") as string,
  );
  const [billTotal, setBillTotal] = useState(0);
  const [coinTotal, setCoinTotal] = useState(0);
  const [checks, setChecks] = useState<Check[]>([]);
  const [billCounts, setBillCounts] = useState<Record<number, number>>({});
  const [coinCounts, setCoinCounts] = useState<Record<number, number>>({});
  const [toastMessage, setToastMessage] = useState<{
    message?: string;
    isError?: boolean;
  }>({});
  const [resetTrigger, setResetTrigger] = useState(0);

  useEffect(() => {
    descriptionRef.current?.focus();
  }, []);

  const checkCount = checks.filter(
    ({ number, amount }) => number && amount,
  ).length;
  const checkTotal = checks.reduce((sum, c) => sum + c.amount, 0);

  const grandTotal = billTotal + coinTotal + checkTotal;

  const summaryItems: SummaryItem[] = [
    { label: "Bills", value: billTotal },
    { label: "Coins", value: coinTotal },
    {
      label: "Checks",
      value: checkTotal,
      count: checkCount,
    },
    { label: "Grand Total", value: grandTotal, bold: true },
  ];

  // Handler for the copy summary button
  async function handleCopySummary() {
    if (!description.trim()) {
      setDescriptionError("Description is required.");
      setToastMessage({ message: "Description is required.", isError: true });
      setTimeout(() => setToastMessage({}), 3000);
      return;
    }
    const text = generateTextSummary(
      description,
      date,
      billTotal,
      billCounts,
      coinTotal,
      coinCounts,
      checks,
      summaryItems,
    );
    await navigator.clipboard.writeText(text);

    setToastMessage({ message: "Summary copied to clipboard!" });
    setTimeout(() => setToastMessage({}), 3000);
  }

  function resetForm() {
    setDescription("");
    setDescriptionError("");
    setDate(new Date().toISOString().slice(0, 10));
    setBillTotal(0);
    setCoinTotal(0);
    setChecks([]);
    setResetTrigger((prev) => prev + 1);
    setToastMessage({ message: "", isError: false });
    descriptionRef.current?.focus();
  }

  return (
    <div className="grid gap-2 w-full max-w-[700px] px-4 md:px-0">
      <DescriptionDateInput
        description={description}
        setDescription={setDescription}
        descriptionError={descriptionError}
        setDescriptionError={setDescriptionError}
        date={date}
        setDate={setDate}
        descriptionRef={descriptionRef}
      />

      {/* Bills Section */}
      <DepositSection
        title="Bills"
        denominations={billDenominations}
        onTotalChange={setBillTotal}
        onCountsChange={setBillCounts}
        resetTrigger={resetTrigger}
      />

      {/* Coins Section */}
      <DepositSection
        title="Coins"
        denominations={coinDenominations}
        onTotalChange={setCoinTotal}
        onCountsChange={setCoinCounts}
        resetTrigger={resetTrigger}
      />

      {/* Checks Section */}
      <ChecksSection checks={checks} setChecks={setChecks} />

      <SummarySection summaryItems={summaryItems} />

      {/* Copy Summary and Reset buttons */}
      <div className="flex flex-col w-full gap-2 mt-2 py-4 sm:flex-row sm:gap-4">
        <button
          className="btn btn-primary w-full sm:flex-1"
          onClick={() => {
            void handleCopySummary();
          }}
          type="button"
        >
          Copy Summary to Clipboard
        </button>
        <button
          className="btn btn-secondary w-full sm:flex-1"
          onClick={resetForm}
          type="button"
        >
          Reset
        </button>
      </div>

      <Toast
        message={toastMessage.message || ""}
        isError={toastMessage.isError}
      />
    </div>
  );
}

export default Home;
