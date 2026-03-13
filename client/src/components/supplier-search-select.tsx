import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
}

interface SupplierSearchSelectProps {
  suppliers: Supplier[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  inputClassName?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export function SupplierSearchSelect({
  suppliers,
  value,
  onValueChange,
  placeholder,
  "data-testid": testId,
  className = "",
  inputClassName = "",
  showAllOption = false,
  allOptionLabel,
}: SupplierSearchSelectProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = suppliers.find(s => String(s.id) === value);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchText.toLowerCase())
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

  const handleSelect = (id: string) => {
    onValueChange(id);
    setSearchText("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onValueChange("");
    setSearchText("");
    setIsOpen(false);
  };

  const displayValue = value === "all" ? (allOptionLabel || t("All Suppliers")) : (selectedSupplier?.name || "");

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute ${isRtl ? "right-2.5" : "left-2.5"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none`} />
        <Input
          ref={inputRef}
          data-testid={testId}
          placeholder={placeholder || t("Select supplier...")}
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
              handleSelect(String(filtered[0].id));
            }
          }}
          className={`${isRtl ? "pr-8 pl-8" : "pl-8 pr-8"} ${inputClassName}`}
        />
        {(value && value !== "" && value !== "all") ? (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${isRtl ? "left-2.5" : "right-2.5"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className={`absolute ${isRtl ? "left-2.5" : "right-2.5"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover shadow-lg">
          {showAllOption && (
            <button
              type="button"
              className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${value === "all" ? "bg-accent font-medium" : ""}`}
              onClick={() => handleSelect("all")}
              data-testid={testId ? `${testId}-all` : undefined}
            >
              {allOptionLabel || t("All Suppliers")}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              {t("No suppliers found")}
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${String(s.id) === value ? "bg-accent font-medium" : ""}`}
                onClick={() => handleSelect(String(s.id))}
                data-testid={testId ? `${testId}-${s.id}` : undefined}
              >
                {s.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
