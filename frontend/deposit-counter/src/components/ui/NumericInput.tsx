import type { ChangeEvent, KeyboardEvent } from "react";

interface NumericInputProps {
  type: "text" | "number";
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  step?: string;
}

export default function NumericInput({
  type,
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  step,
}: NumericInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation/editing keys
    if (
      [
        "Backspace",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Delete",
        "Home",
        "End",
      ].includes(e.key)
    ) {
      return;
    }

    // Allow dot for decimals if step=0.01
    if (type === "number" && step === "0.01" && e.key === ".") {
      if ((e.currentTarget.value.match(/\./g) || []).length >= 1) {
        e.preventDefault();
      }
      return;
    }

    // Only allow digits
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <input
      type={type}
      inputMode="numeric"
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        handleKeyDown(e);
        if (onKeyDown) onKeyDown(e);
      }}
      placeholder={placeholder}
      className={className}
      step={step}
      min="0"
    />
  );
}
