import type { ChangeEvent, KeyboardEvent } from "react";

export interface NumericInputProps {
  type: "text" | "number";
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  step?: string;
}
