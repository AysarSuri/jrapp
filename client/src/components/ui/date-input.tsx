import * as React from "react";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DateInputProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
}

function isRtlLang(lang: string): boolean {
  return lang === "ar" || lang === "ckb";
}

function formatToDisplay(isoDate: string, lang: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  if (isRtlLang(lang)) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isValidDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function parseFromDisplay(displayDate: string, lang: string): string {
  const cleaned = displayDate.replace(/[^0-9/]/g, "");
  const parts = cleaned.split("/");

  if (isRtlLang(lang)) {
    if (parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isValidDate(day, month, year)) return "";
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
  } else {
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isValidDate(day, month, year)) return "";
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return "";
}

function getPlaceholder(lang: string): string {
  return isRtlLang(lang) ? "yyyy/mm/dd" : "dd/mm/yyyy";
}

function autoSlash(raw: string, lang: string): string {
  if (isRtlLang(lang)) {
    if (raw.length === 4 && !raw.includes("/")) {
      return raw + "/";
    } else if (raw.length === 7 && raw.charAt(4) === "/" && !raw.substring(5).includes("/")) {
      return raw + "/";
    }
  } else {
    if (raw.length === 2 && !raw.includes("/")) {
      return raw + "/";
    } else if (raw.length === 5 && raw.charAt(2) === "/" && !raw.substring(3).includes("/")) {
      return raw + "/";
    }
  }
  return raw;
}

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = React.useState(() => formatToDisplay(value, lang));

    React.useEffect(() => {
      setDisplayValue(formatToDisplay(value, lang));
    }, [value, lang]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/[^0-9/]/g, "");
      raw = autoSlash(raw, lang);
      if (raw.length > 10) raw = raw.substring(0, 10);

      setDisplayValue(raw);

      const iso = parseFromDisplay(raw, lang);
      if (iso) {
        onChange({ target: { value: iso } });
      }
    };

    const handleCalendarClick = () => {
      if (hiddenRef.current && !disabled) {
        try {
          hiddenRef.current.showPicker();
        } catch {
          hiddenRef.current.click();
        }
      }
    };

    const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value;
      setDisplayValue(formatToDisplay(iso, lang));
      onChange({ target: { value: iso } });
    };

    const testId = props["data-testid"];

    return (
      <div ref={ref} className={cn("relative", className)}>
        <input
          type="text"
          inputMode="numeric"
          placeholder={getPlaceholder(lang)}
          value={displayValue}
          onChange={handleTextChange}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-9"
          )}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          disabled={disabled}
          data-testid={testId ? `${testId}-calendar` : "button-calendar"}
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ pointerEvents: "none" }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
