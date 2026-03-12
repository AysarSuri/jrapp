import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import type { Product } from "@shared/schema";
import { getProductName } from "@/lib/language-utils";
import { Search } from "lucide-react";

interface ProductSearchSelectProps {
  products: Product[];
  value: number | null;
  onSelect: (productId: string) => void;
  onAfterSelect?: () => void;
  placeholder?: string;
  "data-testid"?: string;
}

export default function ProductSearchSelect({
  products,
  value,
  onSelect,
  onAfterSelect,
  placeholder,
  "data-testid": testId,
}: ProductSearchSelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedProduct = value ? products.find(p => p.id === value) : null;
  const displayText = selectedProduct ? getProductName(selectedProduct) : "";

  const visibleProducts = products.filter(p => !p.hidden);

  const filtered = search.trim()
    ? visibleProducts.filter(p => {
        const q = search.toLowerCase();
        return (
          getProductName(p).toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          p.name.toLowerCase().includes(q)
        );
      })
    : visibleProducts;

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={open ? search : displayText}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && open && filtered.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              onSelect(String(filtered[0].id));
              setSearch("");
              setOpen(false);
            }
          }}
          placeholder={placeholder || t("Select product...")}
          className="h-9 text-sm ps-7 truncate"
          autoComplete="off"
          data-testid={testId}
        />
      </div>
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-y-auto"
        >
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
                  if (onAfterSelect) requestAnimationFrame(onAfterSelect);
                }}
                data-testid={`option-product-${p.id}`}
              >
                {getProductName(p)} <span className="text-muted-foreground">({p.barcode})</span>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
