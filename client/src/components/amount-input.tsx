import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  currencyInputStep,
  formatAmountInput,
  getCurrencyDecimalPlaces,
  getCurrencyMeta,
} from "@/hooks/use-default-currency";
import { cn } from "@/lib/utils";

export type AmountInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "step" | "value" | "onChange" | "onBlur"
> & {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  currency?: string;
  showCurrencyHint?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

/** Standard amount/price field: LTR mono, currency step, fixed decimals on blur. */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      value,
      onChange,
      currency = "IQD",
      showCurrencyHint = false,
      className,
      onBlur,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const step = currencyInputStep(currency);
    const dp = getCurrencyDecimalPlaces(currency);
    const meta = getCurrencyMeta(currency);
    const displayValue = value == null ? "" : String(value);

    return (
      <div className="relative w-full min-w-0">
        <Input
          ref={ref}
          type="number"
          inputMode="decimal"
          dir="ltr"
          step={step}
          placeholder={placeholder ?? formatAmountInput(0, currency)}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            onChange(formatAmountInput(e.target.value || "0", currency));
            onBlur?.(e);
          }}
          className={cn(
            "h-9 text-sm font-mono text-right tabular-nums",
            showCurrencyHint && "pr-12",
            className,
          )}
          {...props}
        />
        {showCurrencyHint && (
          <span
            className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-muted-foreground"
            title={`${currency} · ${dp} dp`}
          >
            {meta.symbol}
          </span>
        )}
      </div>
    );
  },
);
AmountInput.displayName = "AmountInput";
