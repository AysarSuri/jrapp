import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";

interface SearchSelectItem {
  id: number | string;
  name: string;
}

interface SearchSelectProps {
  items: SearchSelectItem[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  noResultsText?: string;
  "data-testid"?: string;
  className?: string;
  inputClassName?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
}

export function SearchSelect({
  items,
  value,
  onValueChange,
  placeholder,
  noResultsText,
  "data-testid": testId,
  className = "",
  inputClassName = "",
  showAllOption = false,
  allOptionLabel,
  disabled = false,
}: SearchSelectProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find(item => String(item.id) === value);

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
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

  const displayValue = value === "all"
    ? (allOptionLabel || t("All"))
    : (selectedItem?.name || "");

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute ${isRtl ? "right-2.5" : "left-2.5"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none`} />
        <Input
          ref={inputRef}
          data-testid={testId}
          placeholder={placeholder || t("Search...")}
          value={isOpen ? searchText : displayValue}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchText("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isOpen) {
              e.preventDefault();
              e.stopPropagation();
              if (filtered.length > 0) {
                handleSelect(String(filtered[0].id));
              }
            }
          }}
          className={`${isRtl ? "pr-8 pl-8" : "pl-8 pr-8"} ${inputClassName}`}
          disabled={disabled}
        />
        {(value && value !== "" && value !== "all" && !disabled) ? (
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
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover shadow-lg">
          {showAllOption && (
            <button
              type="button"
              className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${value === "all" ? "bg-accent font-medium" : ""}`}
              onClick={() => handleSelect("all")}
              data-testid={testId ? `${testId}-all` : undefined}
            >
              {allOptionLabel || t("All")}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              {noResultsText || t("No results found")}
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={String(item.id)}
                type="button"
                className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${String(item.id) === value ? "bg-accent font-medium" : ""}`}
                onClick={() => handleSelect(String(item.id))}
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
