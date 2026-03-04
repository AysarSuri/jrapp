import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import type { Product } from "@shared/schema";
import { getProductName } from "@/lib/language-utils";

interface ProductCodeSearchSelectProps {
  products: Product[];
  value: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export default function ProductCodeSearchSelect({
  products,
  value,
  onSelect,
  placeholder,
  "data-testid": testId,
}: ProductCodeSearchSelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const selectedViaDropdown = useRef(false);

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    }
  }, []);

  const filtered = search.trim()
    ? products.filter(p => {
        const q = search.toLowerCase();
        return (
          p.barcode.toLowerCase().includes(q) ||
          getProductName(p).toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        );
      })
    : products;

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open, updatePosition]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={open ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch("");
          selectedViaDropdown.current = false;
        }}
        onBlur={() => {
          setTimeout(() => {
            if (selectedViaDropdown.current) {
              selectedViaDropdown.current = false;
              setOpen(false);
              return;
            }
            const s = search.trim();
            if (s) {
              const exact = products.find(p => p.barcode === s);
              if (exact) {
                onSelect(String(exact.id));
              }
            }
            setSearch("");
            setOpen(false);
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && filtered.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            onSelect(String(filtered[0].id));
            setSearch("");
            setOpen(false);
            selectedViaDropdown.current = true;
          }
        }}
        placeholder={placeholder || t("Product Code")}
        className="h-11 text-base font-bold font-mono"
        autoComplete="off"
        data-testid={testId}
      />
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
                  selectedViaDropdown.current = true;
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
