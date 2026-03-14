import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import type { Product } from "@shared/schema";
import { getProductName } from "@/lib/language-utils";
import { X, ChevronDown } from "lucide-react";

interface ProductCodeSearchSelectProps {
  products: Product[];
  value: string;
  onSelect: (productId: string) => void;
  onClear?: () => void;
  placeholder?: string;
  "data-testid"?: string;
}

export default function ProductCodeSearchSelect({
  products,
  value,
  onSelect,
  onClear,
  placeholder,
  "data-testid": testId,
}: ProductCodeSearchSelectProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    }
  }, []);

  const visibleProducts = products.filter(p => !p.hidden);

  const filtered = search.trim()
    ? visibleProducts.filter(p => {
        const q = search.toLowerCase();
        return (
          p.barcode.toLowerCase().includes(q) ||
          getProductName(p).toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        );
      })
    : visibleProducts;

  useEffect(() => {
    if (open) updatePosition();
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

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onSelect("");
    }
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={open ? search : value}
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
          placeholder={placeholder || t("Product Code")}
          className={`h-9 text-sm font-mono ${isRtl ? "pl-7" : "pr-7"}`}
          autoComplete="off"
          data-testid={testId}
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${isRtl ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className={`absolute ${isRtl ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />
        )}
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
                  value === p.barcode ? "bg-accent/50 font-medium" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(String(p.id));
                  setSearch("");
                  setOpen(false);
                }}
                data-testid={`option-product-code-${p.id}`}
              >
                <span className="font-mono font-bold">{p.barcode}</span>
                <span className="text-muted-foreground ms-2">- {getProductName(p)}</span>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
