import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import type { Product } from "@shared/schema";
import { getProductName } from "@/lib/language-utils";
import { Search } from "lucide-react";

interface ProductSearchSelectProps {
  products: Product[];
  value: number | null;
  onSelect: (productId: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export default function ProductSearchSelect({
  products,
  value,
  onSelect,
  placeholder,
  "data-testid": testId,
}: ProductSearchSelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = value ? products.find(p => p.id === value) : null;
  const displayText = selectedProduct ? `${getProductName(selectedProduct)} (${selectedProduct.barcode})` : "";

  const filtered = search.trim()
    ? products.filter(p => {
        const q = search.toLowerCase();
        return (
          getProductName(p).toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
          (p.nameKu && p.nameKu.toLowerCase().includes(q))
        );
      })
    : products;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open && !search) {
      setSearch("");
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={open ? search : displayText}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          placeholder={placeholder || t("Select product...")}
          className="h-9 text-sm ps-7 truncate"
          autoComplete="off"
          data-testid={testId}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              {t("No products found")}
            </div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                type="button"
                className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer ${
                  value === p.id ? "bg-accent/50 font-medium" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(String(p.id));
                  setSearch("");
                  setOpen(false);
                }}
                data-testid={`option-product-${p.id}`}
              >
                {getProductName(p)} <span className="text-muted-foreground">({p.barcode})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
