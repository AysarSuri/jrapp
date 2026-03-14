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

const TEMPLATE = "dd / mm / yyyy";

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = React.useState(() => formatToDisplay(value));

    React.useEffect(() => {
      setDisplayValue(formatToDisplay(value));
    }, [value]);

    const emitIfValid = React.useCallback((display: string) => {
      const parts = display.split(" / ");
      if (parts.length !== 3) return;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (isValidDate(day, month, year)) {
        const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
        onChange({ target: { value: iso } });
      }
    }, [onChange]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const cur = displayValue;

      if (e.key === "Tab") return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (cur.length < 14) return;
        e.preventDefault();
        const parts = cur.split(" / ");
        if (parts.length !== 3) return;
        let dd = parseInt(parts[0], 10);
        let mm = parseInt(parts[1], 10);
        let yyyy = parseInt(parts[2], 10);
        const delta = e.key === "ArrowUp" ? 1 : -1;
        let sS: number, sE: number;
        if (start <= 2) { dd += delta; if (dd < 1) dd = 31; if (dd > 31) dd = 1; sS = 0; sE = 2; }
        else if (start <= 7) { mm += delta; if (mm < 1) mm = 12; if (mm > 12) mm = 1; sS = 5; sE = 7; }
        else { yyyy += delta; sS = 10; sE = 14; }
        const nd = `${String(dd).padStart(2,"0")} / ${String(mm).padStart(2,"0")} / ${String(yyyy).padStart(4,"0")}`;
        setDisplayValue(nd);
        emitIfValid(nd);
        requestAnimationFrame(() => input.setSelectionRange(sS, sE));
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (cur.length === 0) return;

        if (start === end) {
          if (start === 0) return;
          let delPos = start - 1;
          while (delPos >= 0 && !/[0-9]/.test(cur[delPos])) delPos--;
          if (delPos < 0) return;
          const chars = cur.split("");
          chars[delPos] = "0";
          const nd = chars.join("");
          setDisplayValue(nd);
          emitIfValid(nd);
          requestAnimationFrame(() => input.setSelectionRange(delPos, delPos));
        } else {
          const chars = cur.split("");
          for (let i = start; i < end; i++) {
            if (/[0-9]/.test(chars[i])) chars[i] = "0";
          }
          const nd = chars.join("");
          setDisplayValue(nd);
          emitIfValid(nd);
          requestAnimationFrame(() => input.setSelectionRange(start, start));
        }
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        if (start === end) {
          if (start >= cur.length) return;
          let delPos = start;
          while (delPos < cur.length && !/[0-9]/.test(cur[delPos])) delPos++;
          if (delPos >= cur.length) return;
          const chars = cur.split("");
          chars[delPos] = "0";
          const nd = chars.join("");
          setDisplayValue(nd);
          emitIfValid(nd);
          const nextPos = delPos + 1;
          requestAnimationFrame(() => input.setSelectionRange(nextPos, nextPos));
        } else {
          const chars = cur.split("");
          for (let i = start; i < end; i++) {
            if (/[0-9]/.test(chars[i])) chars[i] = "0";
          }
          const nd = chars.join("");
          setDisplayValue(nd);
          emitIfValid(nd);
          requestAnimationFrame(() => input.setSelectionRange(start, start));
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const digit = e.key;

        if (cur.length < 14) {
          const digits = cur.replace(/[^0-9]/g, "") + digit;
          let formatted: string;
          if (digits.length <= 2) formatted = digits;
          else if (digits.length <= 4) formatted = `${digits.slice(0,2)} / ${digits.slice(2)}`;
          else formatted = `${digits.slice(0,2)} / ${digits.slice(2,4)} / ${digits.slice(4,8)}`;
          if (formatted.length > 14) return;
          setDisplayValue(formatted);
          if (digits.length >= 8) {
            emitIfValid(formatted);
          }
          requestAnimationFrame(() => input.setSelectionRange(formatted.length, formatted.length));
          return;
        }

        const digitSlots = [0, 1, 5, 6, 10, 11, 12, 13];
        const chars = cur.split("");

        if (start !== end) {
          for (let i = start; i < end; i++) {
            if (digitSlots.includes(i)) chars[i] = "0";
          }
          const firstSlot = digitSlots.find(s => s >= start && s < end);
          if (firstSlot !== undefined) {
            chars[firstSlot] = digit;
            const nd = chars.join("");
            setDisplayValue(nd);
            emitIfValid(nd);
            let np = firstSlot + 1;
            if (np === 2) np = 5;
            if (np === 7) np = 10;
            requestAnimationFrame(() => input.setSelectionRange(np, np));
          }
        } else {
          let slot = start;
          while (slot < 14 && !digitSlots.includes(slot)) slot++;
          if (slot >= 14) return;
          chars[slot] = digit;
          const nd = chars.join("");
          setDisplayValue(nd);
          emitIfValid(nd);
          let np = slot + 1;
          if (np === 2) np = 5;
          if (np === 7) np = 10;
          requestAnimationFrame(() => input.setSelectionRange(np, np));
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    };

    const handleChange = () => {
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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background ps-10 pe-3 py-2 text-base font-bold shadow-sm transition-all duration-200 ring-offset-background placeholder:text-muted-foreground/60 placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        <div className="absolute start-0 top-0 h-full w-9 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-muted-foreground pointer-events-none" />
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
