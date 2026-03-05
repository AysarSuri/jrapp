import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface ExpenseTypeItem {
  id: number;
  name: string;
}

interface ExpenseTypeSearchSelectProps {
  items: ExpenseTypeItem[];
  value?: string;
  onValueChange: (id: string, name: string) => void;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  inputClassName?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export function ExpenseTypeSearchSelect({
  items,
  value,
  onValueChange,
  placeholder,
  "data-testid": testId,
  className = "",
  inputClassName = "",
  showAllOption = false,
  allOptionLabel,
}: ExpenseTypeSearchSelectProps) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find(i => String(i.id) === value);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (!value || value === "all") {
          setSearchText("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleSelect = (id: string, name: string) => {
    onValueChange(id, name);
    setSearchText("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onValueChange("", "");
    setSearchText("");
    setIsOpen(false);
  };

  const displayValue = value === "all"
    ? (allOptionLabel || t("All Expense Types"))
    : (selectedItem?.name || "");

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          data-testid={testId}
          placeholder={placeholder || t("Select expense type...")}
          value={isOpen ? searchText : displayValue}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchText("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isOpen && filtered.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(String(filtered[0].id), filtered[0].name);
            }
          }}
          className={`pl-8 pr-8 ${inputClassName}`}
        />
        {(value && value !== "") && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover shadow-lg">
          {showAllOption && (
            <button
              type="button"
              className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${value === "all" ? "bg-accent font-medium" : ""}`}
              onClick={() => handleSelect("all", allOptionLabel || t("All Expense Types"))}
              data-testid={testId ? `${testId}-all` : undefined}
            >
              {allOptionLabel || t("All Expense Types")}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              {t("No expense types found")}
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                type="button"
                className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${String(item.id) === value ? "bg-accent font-medium" : ""}`}
                onClick={() => handleSelect(String(item.id), item.name)}
                data-testid={testId ? `${testId}-${item.id}` : undefined}
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
