import "cally";
import { Calendar, X } from "lucide-react";
import React, { useRef, useEffect, useState } from "react";

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  placement?: "bottom" | "top";
  align?: "left" | "right";
}

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  required = false,
  placeholder = "Select Date",
  placement = "bottom",
  align = "left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const CalendarDate = "calendar-date" as React.ElementType;
  const CalendarMonth = "calendar-month" as React.ElementType;
  const CalendarMonthGrid = "calendar-month-grid" as React.ElementType;

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          required={required}
          readOnly
          placeholder={placeholder}
          value={value}
          onClick={() => setIsOpen(!isOpen)}
          className="input input-bordered w-full pr-10 cursor-pointer bg-base-100 focus:outline-none focus:border-primary transition-all duration-200"
        />
        {value && !required ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setIsOpen(false);
            }}
            className="absolute right-3 btn btn-ghost btn-circle btn-xs hover:bg-base-200 text-base-content/40 hover:text-base-content/80 flex items-center justify-center"
            aria-label="Clear date"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <Calendar className="absolute right-3 w-5 h-5 text-base-content/40 cursor-pointer pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 p-3 bg-base-100 rounded-2xl shadow-2xl border border-base-200 ${
            placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${align === "right" ? "left-0 md:right-0 md:left-auto" : "left-0"}`}
        >
          <CalendarDate
            className="cally bg-base-100"
            value={value}
            onchange={(e: Event) => {
              const target = e.target as HTMLInputElement | null;
              onChange(target?.value ?? "");
              setIsOpen(false); // Close dropdown on date select
            }}
          >
            <CalendarMonth>
              <CalendarMonthGrid></CalendarMonthGrid>
            </CalendarMonth>
          </CalendarDate>
        </div>
      )}
    </div>
  );
};
