import * as React from "react";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface DateInputProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
}

function formatToDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
}

function isValidDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function parseFromDisplay(displayDate: string): string {
  const cleaned = displayDate.replace(/[^0-9/]/g, "");
  const parts = cleaned.split("/");
  if (parts.length !== 3) return "";

  if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isValidDate(day, month, year)) return "";
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return "";
}

function autoFormat(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4, 8)}`;
}

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = React.useState(() => formatToDisplay(value));

    React.useEffect(() => {
      setDisplayValue(formatToDisplay(value));
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      const formatted = autoFormat(raw);
      if (formatted.length > 14) return;

      setDisplayValue(formatted);

      const iso = parseFromDisplay(formatted);
      if (iso) {
        onChange({ target: { value: iso } });
      }
    };

    const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value;
      setDisplayValue(formatToDisplay(iso));
      onChange({ target: { value: iso } });
    };

    const testId = props["data-testid"];

    return (
      <div ref={ref} className={cn("relative", className)}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd / mm / yyyy"
          value={displayValue}
          onChange={handleTextChange}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background ps-10 pe-3 py-2 text-base font-bold shadow-sm transition-all duration-200 ring-offset-background placeholder:text-muted-foreground/60 placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        <div className="absolute start-0 top-0 h-full w-9 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={hiddenRef}
            type="date"
            value={value}
            onChange={handleCalendarChange}
            disabled={disabled}
            data-testid={testId ? `${testId}-calendar` : "button-calendar"}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            tabIndex={-1}
          />
        </div>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
