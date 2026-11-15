import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
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
  icon?: React.ElementType;
  accent?: "slate" | "emerald" | "blue" | "amber";
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  "data-testid"?: string;
};

const ACCENTS = {
  slate: {
    ring: "focus-visible:ring-slate-400/40 data-[state=open]:border-slate-400/50 data-[state=open]:ring-slate-400/25",
    hover: "hover:border-slate-400/40",
    icon: "text-slate-500 dark:text-slate-400",
    check: "text-slate-600 dark:text-slate-300",
    selected: "data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800/70",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  emerald: {
    ring: "focus-visible:ring-emerald-400/40 data-[state=open]:border-emerald-400/50 data-[state=open]:ring-emerald-400/25",
    hover: "hover:border-emerald-400/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    check: "text-emerald-600 dark:text-emerald-400",
    selected: "data-[selected=true]:bg-emerald-50 dark:data-[selected=true]:bg-emerald-950/40",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  },
  blue: {
    ring: "focus-visible:ring-blue-400/40 data-[state=open]:border-blue-400/50 data-[state=open]:ring-blue-400/25",
    hover: "hover:border-blue-400/40",
    icon: "text-blue-600 dark:text-blue-400",
    check: "text-blue-600 dark:text-blue-400",
    selected: "data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-950/40",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  },
  amber: {
    ring: "focus-visible:ring-amber-400/40 data-[state=open]:border-amber-400/50 data-[state=open]:ring-amber-400/25",
    hover: "hover:border-amber-400/40",
    icon: "text-amber-600 dark:text-amber-400",
    check: "text-amber-600 dark:text-amber-400",
    selected: "data-[selected=true]:bg-amber-50 dark:data-[selected=true]:bg-amber-950/40",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  },
} as const;

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
  icon: Icon,
  accent = "slate",
  className,
  triggerClassName,
  contentClassName,
  "data-testid": testId,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  const tone = ACCENTS[accent];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-state={open ? "open" : "closed"}
          data-testid={testId}
          className={cn(
            "group h-11 w-full justify-between gap-2 rounded-2xl border border-border/70 bg-card/90 px-3 text-sm font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200",
            "hover:bg-card focus-visible:ring-2",
            tone.hover,
            tone.ring,
            !selected && "text-muted-foreground font-medium",
            disabled && "cursor-not-allowed opacity-55",
            className,
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {Icon ? (
              <span className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted/80 transition-colors",
                selected && tone.badge,
              )}>
                <Icon className={cn("h-3.5 w-3.5", tone.icon)} />
              </span>
            ) : null}
            <span className="truncate text-start tracking-tight">
              {selected?.label || placeholder}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {allowClear && value ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear"
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden rounded-2xl border border-border/60 bg-popover p-0 shadow-2xl ring-1 ring-black/5 dark:ring-white/10",
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
          <div className="border-b border-border/60 bg-muted/30 px-1">
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-11 text-sm font-medium"
            />
          </div>
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Search className="h-3 w-3" />
              {selected ? selected.label : placeholder}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums", tone.badge)}>
              {options.length}
            </span>
          </div>
          <CommandList className="max-h-72">
            <CommandEmpty className="px-4 py-8 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-muted-foreground">{emptyText}</p>
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {allowClear ? (
                <CommandItem
                  value={`__clear__ ${clearLabel}`}
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl px-2.5 py-2.5 text-sm",
                    tone.selected,
                  )}
                >
                  <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : cn("opacity-100", tone.check))} />
                  <span className="font-medium text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              ) : null}
              {options.map((option) => {
                const isActive = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.keywords ?? ""} ${option.value}`}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "cursor-pointer rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-colors",
                      tone.selected,
                      isActive && "bg-muted/60",
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isActive ? cn("opacity-100", tone.check) : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
