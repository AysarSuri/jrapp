import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Search, X, MapPin } from "lucide-react";

interface Address {
  id: number;
  name: string;
}

interface AddressSearchSelectProps {
  addresses: Address[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  inputClassName?: string;
}

export function AddressSearchSelect({
  addresses,
  value,
  onValueChange,
  placeholder,
  "data-testid": testId,
  className = "",
  showAllOption = false,
  allOptionLabel,
  inputClassName = "",
}: AddressSearchSelectProps) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = addresses.filter(a =>
    a.name.toLowerCase().includes(searchText.toLowerCase())
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

  const handleSelect = (name: string) => {
    onValueChange(name);
    setSearchText("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onValueChange("");
    setSearchText("");
    setIsOpen(false);
  };

  const displayValue = value === "all" ? (allOptionLabel || t("All Addresses")) : (value || "");

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          data-testid={testId}
          placeholder={placeholder || t("Select address...")}
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
              handleSelect(filtered[0].name);
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
            <X className="h-5 w-5" />
          </button>
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
              {allOptionLabel || t("All Addresses")}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              {t("No addresses found")}
            </div>
          ) : (
            filtered.map(a => (
              <button
                key={a.id}
                type="button"
                className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 ${a.name === value ? "bg-accent font-medium" : ""}`}
                onClick={() => handleSelect(a.name)}
                data-testid={testId ? `${testId}-${a.id}` : undefined}
              >
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {a.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
