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

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = React.useState(() => formatToDisplay(value));
    const composingRef = React.useRef(false);

    React.useEffect(() => {
      if (!composingRef.current) {
        setDisplayValue(formatToDisplay(value));
      }
    }, [value]);

    const emitIfValid = (dd: string, mm: string, yyyy: string) => {
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      if (isValidDate(day, month, year)) {
        onChange({ target: { value: `${yyyy}-${mm}-${dd}` } });
      }
    };

    const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
      const ev = e.nativeEvent as InputEvent;
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const current = displayValue;

      if (ev.inputType === "insertText" && ev.data && /^[0-9]$/.test(ev.data)) {
        if (current.length === 14 && start !== end) {
          e.preventDefault();
          composingRef.current = true;

          const digit = ev.data;
          const chars = current.split("");
          const digitPositions = [0, 1, 5, 6, 10, 11, 12, 13];

          let replacedAny = false;
          for (let i = start; i < end; i++) {
            if (digitPositions.includes(i)) {
              chars[i] = "0";
              replacedAny = true;
            }
          }

          if (!replacedAny) {
            composingRef.current = false;
            return;
          }

          const firstDigitInRange = digitPositions.find(p => p >= start && p < end);
          if (firstDigitInRange !== undefined) {
            chars[firstDigitInRange] = digit;
          }

          const newDisplay = chars.join("");
          setDisplayValue(newDisplay);

          const parts = newDisplay.split(" / ");
          if (parts.length === 3) {
            emitIfValid(parts[0], parts[1], parts[2]);
          }

          const nextPos = (firstDigitInRange !== undefined ? firstDigitInRange : start) + 1;
          let cursorTarget = nextPos;
          if (cursorTarget === 2 || cursorTarget === 3 || cursorTarget === 4) cursorTarget = 5;
          if (cursorTarget === 7 || cursorTarget === 8 || cursorTarget === 9) cursorTarget = 10;

          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(cursorTarget, cursorTarget);
            }
            composingRef.current = false;
          });
          return;
        }
      }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
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
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input || displayValue.length < 14) return;

      const start = input.selectionStart ?? 0;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const parts = displayValue.split(" / ");
        if (parts.length !== 3) return;

        let dd = parseInt(parts[0], 10);
        let mm = parseInt(parts[1], 10);
        let yyyy = parseInt(parts[2], 10);
        const delta = e.key === "ArrowUp" ? 1 : -1;

        let sStart: number, sEnd: number;
        if (start <= 2) {
          dd += delta;
          if (dd < 1) dd = 31;
          if (dd > 31) dd = 1;
          sStart = 0; sEnd = 2;
        } else if (start <= 7) {
          mm += delta;
          if (mm < 1) mm = 12;
          if (mm > 12) mm = 1;
          sStart = 5; sEnd = 7;
        } else {
          yyyy += delta;
          sStart = 10; sEnd = 14;
        }

        const newDD = String(dd).padStart(2, "0");
        const newMM = String(mm).padStart(2, "0");
        const newYYYY = String(yyyy).padStart(4, "0");
        const newDisplay = `${newDD} / ${newMM} / ${newYYYY}`;
        setDisplayValue(newDisplay);
        emitIfValid(newDD, newMM, newYYYY);

        requestAnimationFrame(() => {
          input.setSelectionRange(sStart, sEnd);
        });
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
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="dd / mm / yyyy"
          value={displayValue}
          onBeforeInput={handleBeforeInput}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
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
