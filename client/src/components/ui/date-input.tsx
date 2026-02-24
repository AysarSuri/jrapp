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
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseFromDisplay(displayDate: string): string {
  const cleaned = displayDate.replace(/[^0-9/]/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return "";
}

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = React.useState(() => formatToDisplay(value));

    React.useEffect(() => {
      setDisplayValue(formatToDisplay(value));
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/[^0-9/]/g, "");

      if (raw.length === 2 && !raw.includes("/")) {
        raw = raw + "/";
      } else if (raw.length === 5 && raw.charAt(2) === "/" && !raw.substring(3).includes("/")) {
        raw = raw + "/";
      }

      if (raw.length > 10) raw = raw.substring(0, 10);

      setDisplayValue(raw);

      const iso = parseFromDisplay(raw);
      if (iso) {
        onChange({ target: { value: iso } });
      }
    };

    const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value;
      setDisplayValue(formatToDisplay(iso));
      onChange({ target: { value: iso } });
    };

    const openCalendar = () => {
      if (hiddenRef.current && !disabled) {
        hiddenRef.current.showPicker?.();
      }
    };

    return (
      <div ref={ref} className={cn("relative", className)}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={displayValue}
          onChange={handleTextChange}
          disabled={disabled}
          data-testid={props["data-testid"]}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-9"
          )}
        />
        <button
          type="button"
          onClick={openCalendar}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          tabIndex={-1}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={handleCalendarChange}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
