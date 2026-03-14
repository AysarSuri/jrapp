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

function getSectionAtCursor(pos: number): "day" | "month" | "year" {
  if (pos <= 2) return "day";
  if (pos <= 7) return "month";
  return "year";
}

function getSectionRange(section: "day" | "month" | "year"): [number, number] {
  if (section === "day") return [0, 2];
  if (section === "month") return [5, 7];
  return [10, 14];
}

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = React.useState(() => formatToDisplay(value));

    React.useEffect(() => {
      setDisplayValue(formatToDisplay(value));
    }, [value]);

    const emitIfValid = (dd: string, mm: string, yyyy: string) => {
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      if (isValidDate(day, month, year)) {
        onChange({ target: { value: `${yyyy}-${mm}-${dd}` } });
      }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      const digits = raw.replace(/[^0-9]/g, "");

      let formatted: string;
      if (digits.length <= 2) {
        formatted = digits;
      } else if (digits.length <= 4) {
        formatted = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
      } else {
        formatted = `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4, 8)}`;
      }

      if (formatted.length > 14) return;

      setDisplayValue(formatted);

      if (digits.length >= 8) {
        const dd = digits.slice(0, 2);
        const mm = digits.slice(2, 4);
        const yyyy = digits.slice(4, 8);
        emitIfValid(dd, mm, yyyy);
      }

      requestAnimationFrame(() => {
        if (inputRef.current) {
          let newPos = cursorPos;
          if (digits.length === 2 && raw.length < formatted.length) newPos = 5;
          else if (digits.length === 4 && raw.length < formatted.length) newPos = 10;
          if (newPos > formatted.length) newPos = formatted.length;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const current = displayValue;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (current.length < 14) return;
        e.preventDefault();
        const section = getSectionAtCursor(start);
        const parts = current.split(" / ");
        if (parts.length !== 3) return;

        let dd = parseInt(parts[0], 10);
        let mm = parseInt(parts[1], 10);
        let yyyy = parseInt(parts[2], 10);
        const delta = e.key === "ArrowUp" ? 1 : -1;

        if (section === "day") {
          dd += delta;
          if (dd < 1) dd = 31;
          if (dd > 31) dd = 1;
        } else if (section === "month") {
          mm += delta;
          if (mm < 1) mm = 12;
          if (mm > 12) mm = 1;
        } else {
          yyyy += delta;
        }

        const newDD = String(dd).padStart(2, "0");
        const newMM = String(mm).padStart(2, "0");
        const newYYYY = String(yyyy).padStart(4, "0");
        const newDisplay = `${newDD} / ${newMM} / ${newYYYY}`;
        setDisplayValue(newDisplay);
        emitIfValid(newDD, newMM, newYYYY);

        const [sStart, sEnd] = getSectionRange(section);
        requestAnimationFrame(() => {
          input.setSelectionRange(sStart, sEnd);
        });
        return;
      }

      if (/^[0-9]$/.test(e.key) && start !== end && current.length === 14) {
        e.preventDefault();
        const section = getSectionAtCursor(start);
        const [sStart, sEnd] = getSectionRange(section);
        const parts = current.split(" / ");
        if (parts.length !== 3) return;

        let sectionValue: string;
        if (section === "day") sectionValue = parts[0];
        else if (section === "month") sectionValue = parts[1];
        else sectionValue = parts[2];

        const maxLen = section === "year" ? 4 : 2;

        let newSectionValue: string;
        if (start === sStart && end === sEnd) {
          newSectionValue = e.key.padStart(maxLen, "0").slice(-maxLen);
          if (maxLen === 2) {
            newSectionValue = e.key;
          } else {
            newSectionValue = e.key;
          }
        } else {
          const localStart = start - sStart;
          const localEnd = end - sStart;
          newSectionValue = sectionValue.slice(0, localStart) + e.key + sectionValue.slice(localEnd);
        }

        if (newSectionValue.length > maxLen) {
          newSectionValue = newSectionValue.slice(-maxLen);
        }
        newSectionValue = newSectionValue.padStart(maxLen, "0");

        if (section === "day") parts[0] = newSectionValue;
        else if (section === "month") parts[1] = newSectionValue;
        else parts[2] = newSectionValue;

        const newDisplay = `${parts[0]} / ${parts[1]} / ${parts[2]}`;
        setDisplayValue(newDisplay);

        const dd = parts[0];
        const mm = parts[1];
        const yyyy = parts[2];
        emitIfValid(dd, mm, yyyy);

        const newCursorPos = sStart + Math.min(newSectionValue.replace(/^0+/, "").length || 1, maxLen);
        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
        return;
      }
    };

    const handleDoubleClick = () => {
      const input = inputRef.current;
      if (!input || displayValue.length < 14) return;

      const pos = input.selectionStart || 0;
      const section = getSectionAtCursor(pos);
      const [sStart, sEnd] = getSectionRange(section);

      requestAnimationFrame(() => {
        input.setSelectionRange(sStart, sEnd);
      });
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
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="dd / mm / yyyy"
          value={displayValue}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
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
