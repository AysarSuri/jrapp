import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string;
};

type SearchableComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  "data-testid"?: string;
};

export function SearchableCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results",
  disabled = false,
  allowClear = false,
  clearLabel = "None",
  className,
  triggerClassName,
  contentClassName,
  "data-testid": testId,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "h-10 w-full justify-between gap-2 rounded-xl border-border/70 bg-background/80 px-3 text-sm font-semibold shadow-sm transition-all",
            "hover:border-primary/40 hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/30",
            !selected && "text-muted-foreground font-medium",
            disabled && "opacity-60",
            className,
            triggerClassName,
          )}
        >
          <span className="truncate text-start">{selected?.label || placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {allowClear && value ? (
              <span
                role="button"
                tabIndex={-1}
                className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-hidden rounded-2xl border border-border/70 p-0 shadow-xl",
          contentClassName,
        )}
      >
        <Command
          filter={(itemValue, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return 1;
            return itemValue.toLowerCase().includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className="h-11 text-sm" />
          <CommandList className="max-h-64">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {allowClear ? (
                <CommandItem
                  value={`__clear__ ${clearLabel}`}
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm"
                >
                  <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                  <span className="text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              ) : null}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.keywords ?? ""} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
