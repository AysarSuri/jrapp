import { useState, useMemo, useEffect, useRef, type ElementType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/sm/contexts/LanguageContext";
import { useBranch } from "@/sm/contexts/BranchContext";
import { useToast } from "@/hooks/use-toast";
import { fmtN, fmtQty } from "@/sm/lib/utils";
import { format } from "date-fns";
import {
  useListProducts,
  useListProductions,
  useCreateProduction,
  useUpdateProduction,
  useGetProduction,
  getGetProductionQueryKey,
  useDeleteProduction,
  useGetNextProductionNumber,
} from "@/sm/api-client-react";
import { BranchSelectField } from "@/sm/components/BranchSelectField";
import { DateInput } from "@/sm/components/DateInput";
import { useAppSettings } from "@/sm/contexts/AppSettingsContext";
import { printReport } from "@/sm/utils/printReport";
import { resolveStoreIdentity } from "@/sm/lib/print-store";
import {
  Split, Plus, X, Search, Package, Trash2, PackagePlus,
  List, Calendar, Clock, FileText, ArrowLeft, Eye, AlertCircle, Hash, Boxes, Building2, Printer, Pencil, RotateCcw,
} from "lucide-react";

const inputCls = "w-full px-3 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-lg font-semibold";
const labelCls = "text-base font-bold text-muted-foreground mb-1.5 block";

const today = () => format(new Date(), "yyyy-MM-dd");
const nowTime = () => new Date().toTimeString().slice(0, 8);

/* Normalize Arabic/Persian digits to ASCII so barcodes match regardless of
   keyboard locale (scanners emit ASCII; users may type Arabic-Indic digits). */
const toEn = (s: string) =>
  s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
   .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));

const normalizeAr = (s: string) =>
  (s || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "").toLowerCase();

const matchProd = (p: any, raw: string) => {
  if (!raw.trim()) return true;
  const q = normalizeAr(raw.trim());
  const qt = toEn(raw.trim());
  return (
    normalizeAr(p.nameAr || "").includes(q) ||
    normalizeAr(p.name || "").includes(q) ||
    (p.barcode && toEn(p.barcode).includes(qt))
  );
};

/* "اثنين" = product usable as BOTH wholesale and retail, so it belongs in
   both pickers: source (جملة) shows جملة+اثنين, produced (مفرد) shows مفرد+اثنين. */
const isWholesale = (p: any) => { const t = p.productType ?? "جملة"; return t === "جملة" || t === "اثنين"; };
const isRetail = (p: any) => { const t = p.productType ?? "جملة"; return t === "مفرد" || t === "اثنين"; };

/* Escape every dynamic value before it is injected into the print HTML. */
const escHtml = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/* Build + open the A4 print document for a single production, reusing the shared
   printReport scaffold (fonts, XSS-safe layout, reports-printer guard). */
function printProductionDoc(prod: any, storeName: string) {
  const dateStr = prod.productionDate
    ? prod.productionDate.replaceAll("-", "/")
    : prod.createdAt ? format(new Date(prod.createdAt), "yyyy/MM/dd") : "";
  const timeStr = prod.productionTime ? prod.productionTime.slice(0, 5) : "";
  const stamp = [dateStr, timeStr].filter(Boolean).join(" · ");
  const srcName = prod.sourceProductNameAr || prod.sourceProductName || "—";
  const srcQty = `${fmtQty(Number(prod.sourceQuantity))} ${prod.sourceUnit || ""}`.trim();

  printReport({
    title: `تحويل وإنتاج #${prod.productionNumber}`,
    subtitle: prod.notes ? `ملاحظات: ${escHtml(prod.notes)}` : undefined,
    storeName: escHtml(storeName),
    accentColor: "#059669",
    orientation: "portrait",
    dateRange: stamp || undefined,
    cards: [
      { label: "المصدر (جملة)", value: escHtml(srcName) },
      { label: "الكمية المستهلكة", value: escHtml(srcQty) },
      { label: "الفرع", value: escHtml(prod.branchName || "—") },
      { label: "عدد المنتجات الناتجة", value: fmtN((prod.items || []).length) },
    ],
    columns: [
      { label: "#", align: "center", width: "44px" },
      { label: "المنتج الناتج (مفرد)", align: "right" },
      { label: "الباركود", align: "center" },
      { label: "الكمية", align: "center" },
    ],
    rows: (prod.items || []).map((it: any, idx: number) => ({
      cells: [
        String(idx + 1),
        escHtml(it.productNameAr || it.productName || ""),
        it.barcode ? `<span class="mono">${escHtml(it.barcode)}</span>` : "—",
        escHtml(`${fmtQty(it.quantity)} ${it.unit || ""}`.trim()),
      ],
    })),
  });
}

/* Build + print the A4 report for the filtered transfer/production log. */
function printProductionsList(rows: any[], storeName: string, dateRange?: string) {
  printReport({
    title: "تقرير سجل التحويل والإنتاج",
    storeName: escHtml(storeName),
    accentColor: "#059669",
    orientation: "landscape",
    dateRange,
    cards: [
      { label: "عدد العمليات", value: fmtN(rows.length) },
    ],
    columns: [
      { label: "#", align: "center", width: "50px" },
      { label: "رقم القائمة", align: "center" },
      { label: "المنتج المصدر (جملة)", align: "right" },
      { label: "الفرع", align: "center" },
      { label: "التاريخ", align: "center" },
    ],
    rows: rows.map((p: any, idx: number) => ({
      cells: [
        String(idx + 1),
        `#${escHtml(p.productionNumber)}`,
        escHtml(p.sourceProductNameAr || p.sourceProductName || "—"),
        escHtml(p.branchName || "—"),
        escHtml(
          p.productionDate
            ? p.productionDate.replaceAll("-", "/")
            : p.createdAt ? format(new Date(p.createdAt), "yyyy/MM/dd") : "—"
        ),
      ],
    })),
  });
}

type ProducedItem = {
  productId: number;
  barcode: string;
  nameAr: string;
  unit: string;
  quantity: number;
};

/* Accent palettes so the source (emerald) and produced (teal) pickers share
   the exact same professional layout but keep their own color identity. */
const ACCENTS = {
  emerald: {
    name: "text-emerald-600",
    icon: "text-emerald-500",
    head: "from-emerald-500/10",
    iconBox: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/25",
    badge: "bg-emerald-600",
    hover: "hover:from-emerald-100 hover:via-emerald-50 dark:hover:from-emerald-900/30 dark:hover:via-emerald-900/15",
    hoverText: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
  },
  teal: {
    name: "text-teal-600",
    icon: "text-teal-500",
    head: "from-teal-500/10",
    iconBox: "from-teal-500/15 to-teal-500/5 border-teal-500/25",
    badge: "bg-teal-600",
    hover: "hover:from-teal-100 hover:via-teal-50 dark:hover:from-teal-900/30 dark:hover:via-teal-900/15",
    hoverText: "group-hover:text-teal-700 dark:group-hover:text-teal-300",
  },
} as const;

/* Professional product search field mirroring the sales form:
   click/focus shows the full list, typing filters by name OR barcode,
   an X inside clears the text, and Enter (or a barcode scanner) picks the
   exact-barcode match — otherwise the top result. */
function ProductCombobox({
  value, onChange, matches, onPick, placeholder, disabled, accent, Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  matches: any[];
  onPick: (p: any) => void;
  placeholder: string;
  disabled?: boolean;
  accent: keyof typeof ACCENTS;
  Icon: ElementType;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ac = ACCENTS[accent];

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          className={`${inputCls} pe-11`}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={e => {
            if (e.key === "Escape") { onChange(""); setOpen(false); return; }
            if (e.key === "Enter") {
              const code = toEn(value.trim());
              const exact = matches.find(p => p.barcode && toEn(p.barcode) === code);
              // Only auto-pick the top result for a non-empty query, so an empty
              // field lets the global Enter-as-Tab hook advance focus normally.
              const pick = exact || (value.trim() && matches.length ? matches[0] : null);
              if (pick) { e.preventDefault(); onPick(pick); }
            }
          }}
        />
        {value
          ? (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(""); inputRef.current?.focus(); }}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )
          : <Search className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        }
      </div>

      {open && !disabled && (
        <div className="absolute start-0 end-0 top-full mt-1.5 bg-card border border-border rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5 z-50 max-h-[22rem] overflow-y-auto">
          <div className={`px-4 py-2.5 bg-gradient-to-l ${ac.head} via-transparent to-transparent border-b border-border flex items-center justify-between sticky top-0 z-10 backdrop-blur-md`}>
            <div className="flex items-center gap-2">
              <Search className={`w-3.5 h-3.5 ${ac.icon}`} />
              <span className="text-[13px] font-bold text-foreground">
                {value.trim() ? <>{t("transfer.results")}: <span className={ac.name}>"{value.trim()}"</span></> : t("transfer.all_products")}
              </span>
            </div>
            <span className={`text-[11px] font-black text-white ${ac.badge} px-2.5 py-0.5 rounded-full shadow-sm`}>{matches.length}</span>
          </div>

          {matches.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onPick(p); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gradient-to-l ${ac.hover} hover:to-transparent text-start border-b border-border/40 last:border-0 transition-all group`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ac.iconBox} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-all`}>
                <Icon className={`w-5 h-5 ${ac.icon}`} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-bold text-foreground ${ac.hoverText} truncate leading-tight transition-colors`}>{p.nameAr || p.name}</p>
                {p.barcode && (
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate" dir="ltr">
                    <span className="opacity-60">#</span>{p.barcode}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold text-muted-foreground shrink-0 tabular-nums" dir="ltr">
                {fmtQty(Number(p.currentStock) || 0)} {p.unit}
              </span>
            </button>
          ))}

          {matches.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">{t("prod.no_results_dd")}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{t("prod.try_another")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   CREATE PRODUCTION FORM
════════════════════════════════ */
function ProductionForm({ editing, onSaved, onCancelEdit }: {
  editing: any | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}) {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, isBranchLocked } = useBranch();
  const { fmtMoney, allowNegativeStock } = useAppSettings();
  const editingId: number | null = editing?.id ?? null;

  const [branchId, setBranchId] = useState<number | null>(selectedBranchId);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(nowTime());
  const [timeAuto, setTimeAuto] = useState(true);

  const [sourceId, setSourceId] = useState<number | null>(null);
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceQty, setSourceQty] = useState<number>(1);

  const [items, setItems] = useState<ProducedItem[]>([]);
  const [producedSearch, setProducedSearch] = useState("");

  /* Products for the selected branch (per-branch stock in currentStock). */
  const { data: allProducts = [] } = useListProducts(branchId ? { branchId } : {});

  const { data: next } = useGetNextProductionNumber();

  /* Auto-tick the time every second until the user picks one manually. */
  useEffect(() => {
    if (!timeAuto) return;
    const id = setInterval(() => setTime(nowTime()), 1000);
    return () => clearInterval(id);
  }, [timeAuto]);

  const createProduction = useCreateProduction({
    mutation: {
      onSuccess: () => {
        toast({ title: "✓ " + t("prod.success_title"), description: t("prod.success_desc") });
        setItems([]);
        setNotes("");
        setSourceId(null);
        setSourceSearch("");
        setSourceQty(1);
        setDate(today());
        setTime(nowTime());
        setTimeAuto(true);
        qc.invalidateQueries({ queryKey: ["/api/inventory"] });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        onSaved();
      },
      onError: (e: any) =>
        toast({ title: t("common.error"), description: e?.response?.data?.error || e?.message || t("prod.fail"), variant: "destructive" }),
    },
  });

  const updateProduction = useUpdateProduction({
    mutation: {
      onSuccess: () => {
        toast({ title: "✓ " + t("prod.edit_success_title"), description: t("prod.edit_success_desc") });
        qc.invalidateQueries({ queryKey: ["/api/inventory"] });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        onSaved();
      },
      onError: (e: any) =>
        toast({ title: t("common.error"), description: e?.response?.data?.error || e?.message || t("prod.edit_fail"), variant: "destructive" }),
    },
  });

  /* Prefill all fields when entering edit mode (the form is re-keyed per record,
     so this runs once on mount for the production being edited). */
  useEffect(() => {
    if (!editing) return;
    setBranchId(editing.branchId ?? null);
    setSourceId(editing.sourceProductId ?? null);
    setSourceSearch(editing.sourceProductNameAr || editing.sourceProductName || "");
    setSourceQty(Number(editing.sourceQuantity) || 1);
    setDate(editing.productionDate || today());
    setTime(editing.productionTime || nowTime());
    setTimeAuto(false);
    setNotes(editing.notes || "");
    setItems((editing.items || []).map((it: any) => ({
      productId: it.productId,
      barcode: it.barcode || "",
      nameAr: it.productNameAr || it.productName || "",
      unit: it.unit || "",
      quantity: Number(it.quantity) || 1,
    })));
  }, [editing]);

  const busy = createProduction.isPending || updateProduction.isPending;

  const source = useMemo(
    () => (allProducts as any[]).find(p => p.id === sourceId) || null,
    [allProducts, sourceId],
  );
  const sourceAvailable = Number(source?.currentStock) || 0;

  /* Per-branch cost flow (mirrors backend recomputeProductCost in SMALL units):
     consumed value = sourceQty(small) × (branchCost / cf_source), spread equally per
     produced small unit → each produced product's resulting cost (big = small × its cf). */
  const cfOf = (p: any) => { const c = Number(p?.conversionFactor) || 1; return c > 0 ? c : 1; };
  const sourceCostBig = Number(source?.branchCost ?? source?.purchasePrice) || 0;
  const sourceCostSmall = sourceCostBig / cfOf(source);
  const totalSourceCost = (Number(sourceQty) || 0) * sourceCostSmall;
  const totalProducedQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const producedUnitCostSmall = totalProducedQty > 0 ? totalSourceCost / totalProducedQty : 0;
  const producedCost = (productId: number) => {
    const p = (allProducts as any[]).find(x => x.id === productId);
    const cf = cfOf(p);
    return { small: producedUnitCostSmall, big: producedUnitCostSmall * cf, dual: !!(p?.bigUnit && p?.smallUnit && cf > 1) };
  };
  /* When editing, the original source qty is already consumed from current stock,
     so the editable ceiling is current + original (the PUT returns it first). */
  const effectiveAvailable =
    sourceAvailable +
    (editingId != null && sourceId === (editing?.sourceProductId ?? null) ? (Number(editing?.sourceQuantity) || 0) : 0);

  const sourceMatches = useMemo(() => {
    if (!branchId) return [];
    return (allProducts as any[]).filter(p => !p.isHidden && isWholesale(p) && matchProd(p, sourceSearch));
  }, [allProducts, sourceSearch, branchId]);

  const producedMatches = useMemo(() => {
    if (!branchId) return [];
    return (allProducts as any[])
      .filter(p => !p.isHidden && isRetail(p) && p.id !== sourceId && matchProd(p, producedSearch));
  }, [allProducts, producedSearch, branchId, sourceId]);

  const pickSource = (p: any) => {
    if (!allowNegativeStock && (p.currentStock ?? 0) <= 0) {
      toast({ title: t("prod.out_of_stock"), description: `المنتج "${p.nameAr || p.name}" نفد من المخزن (الكمية: ${p.currentStock ?? 0})`, variant: "destructive" });
      return;
    }
    setSourceId(p.id);
    setSourceSearch(p.nameAr || p.name);
  };

  const clearSource = () => {
    setSourceId(null);
    setSourceSearch("");
  };

  const addProduced = (p: any) => {
    if (!items.some(i => i.productId === p.id)) {
      setItems(prev => [
        ...prev,
        { productId: p.id, barcode: p.barcode || "", nameAr: p.nameAr || p.name, unit: p.unit, quantity: 1 },
      ]);
    }
    setProducedSearch("");
  };

  const updateQty = (productId: number, qty: number) =>
    setItems(prev => prev.map(i => (i.productId === productId ? { ...i, quantity: qty } : i)));

  const removeItem = (productId: number) =>
    setItems(prev => prev.filter(i => i.productId !== productId));

  const posInt = (n: number) => Number.isInteger(n) && n > 0;

  const canSubmit =
    (isBranchLocked || branchId != null) &&
    sourceId != null &&
    posInt(sourceQty) &&
    sourceQty <= effectiveAvailable &&
    items.length > 0 &&
    items.every(i => posInt(i.quantity));

  const submit = () => {
    if (!canSubmit || busy) return;
    if (date > today()) {
      toast({ title: t("common.error"), description: t("prod.future_date_err"), variant: "destructive" });
      return;
    }
    const data = {
      branchId: branchId ?? null,
      sourceProductId: sourceId!,
      sourceQuantity: sourceQty,
      productionDate: date,
      productionTime: time,
      notes: notes.trim() || null,
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    };
    if (editingId != null) {
      updateProduction.mutate({ id: editingId, data });
    } else {
      createProduction.mutate({ data });
    }
  };

  return (
    <div className="space-y-5">
      {editingId != null && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
            <Pencil className="w-4 h-4" />
            {t("prod.editing_hint")} {editing.productionNumber}
          </div>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-400/50 text-amber-700 dark:text-amber-300 font-bold text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            <X className="w-4 h-4" />{t("prod.cancel_edit")}</button>
        </div>
      )}

      {/* Branch + number + date + time — all on one row, identical size/font */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>
            <Building2 className="inline w-4 h-4 me-1 text-emerald-500" />
            {t("prod.branch_label")}
          </label>
          <BranchSelectField
            value={branchId}
            onChange={(v) => { setBranchId(v); clearSource(); setItems([]); }}
            hideLabel
            sizeClassName={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            <Hash className="inline w-4 h-4 me-1 text-emerald-500" />
            {t("prod.op_no_label")}
          </label>
          <div className={`${inputCls} bg-muted/40 cursor-not-allowed flex items-center`} dir="ltr">
            #{editingId != null ? editing.productionNumber : (next?.nextNumber ?? "—")}
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <Calendar className="inline w-4 h-4 me-1 text-emerald-500" />
            {t("common.date")}
          </label>
          <DateInput value={date} max={today()} onChange={e => setDate(e.target.value)} sizeClassName={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            <Clock className="inline w-4 h-4 me-1 text-emerald-500" />
            {t("table.time")}
          </label>
          <input
            type="time"
            step="1"
            value={time}
            onChange={e => { setTime(e.target.value); setTimeAuto(false); }}
            className={inputCls}
            dir="ltr"
          />
        </div>
      </div>

      {/* Source product (جملة) */}
      <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
        <div className="flex items-center gap-2 font-black text-emerald-600">
          <Package className="w-5 h-5" />
          المنتج المصدر (جملة)
        </div>

        {source ? (
          <div className="grid grid-cols-3 gap-4 items-start">
            <div>
              <label className={labelCls}>
                <Package className="inline w-4 h-4 me-1 text-emerald-500" />
                {t("prod.source_simple")}
              </label>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-card border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold truncate">{source.nameAr || source.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {t("prod.available")} {fmtQty(effectiveAvailable)} {source.unit}
                    {source.barcode ? ` · ${source.barcode}` : ""}
                  </p>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                    {t("prod.cost_price")} {fmtMoney(sourceCostBig)}
                  </p>
                </div>
                <button onClick={clearSource} className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("prod.consumed_qty")}</label>
              <input
                type="number"
                min={1}
                step={1}
                value={sourceQty}
                onChange={e => setSourceQty(Math.floor(Number(e.target.value)))}
                className={`${inputCls} ${
                  !posInt(sourceQty) || sourceQty > effectiveAvailable ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""
                }`}
                dir="ltr"
              />
              {sourceQty > effectiveAvailable && (
                <p className="mt-1.5 text-sm font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />{t("prod.qty_exceeds")}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>&nbsp;</label>
              <button
                onClick={submit}
                disabled={!canSubmit || busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-black text-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Split className="w-5 h-5" />
                {busy
                  ? (editingId != null ? t("common.saving") : t("common.saving"))
                  : (editingId != null ? t("prod.update_btn") : t("prod.submit_btn"))}
              </button>
            </div>
          </div>
        ) : (
          <ProductCombobox
            value={sourceSearch}
            onChange={setSourceSearch}
            matches={sourceMatches}
            onPick={pickSource}
            placeholder={branchId ? t("prod.search_source_ph") : t("prod.select_branch_first")}
            disabled={!branchId}
            accent="emerald"
            Icon={Package}
          />
        )}
      </div>

      {/* Conversion arrow */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Split className="w-5 h-5 text-emerald-500 rotate-90" />
        <span className="text-sm font-bold">{t("prod.converted_to")}</span>
      </div>

      {/* Produced (مفرد) + notes (اختياري) — side by side on one row */}
      <div className="grid grid-cols-2 gap-4 items-start">
        <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
        <div className="flex items-center gap-2 font-black text-teal-600">
          <Boxes className="w-5 h-5" />
          المنتجات الناتجة (مفرد)
        </div>

        <ProductCombobox
          value={producedSearch}
          onChange={setProducedSearch}
          matches={producedMatches}
          onPick={addProduced}
          placeholder={branchId ? t("prod.search_result_ph") : t("prod.select_branch_first")}
          disabled={!branchId}
          accent="teal"
          Icon={PackagePlus}
        />

        {items.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-sm font-bold text-muted-foreground">
                  <th className="px-4 py-2 text-start">{t("table.product")}</th>
                  <th className="px-4 py-2 text-center">{t("prod.col_produced_qty")}</th>
                  <th className="px-4 py-2 text-center">{t("prod.col_cost")}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const invalid = !posInt(item.quantity);
                  return (
                    <tr key={item.productId} className="border-t border-border">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{item.nameAr}</p>
                          {item.barcode && <span className="text-xs text-muted-foreground" dir="ltr">{item.barcode}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={item.quantity}
                          onChange={e => updateQty(item.productId, Math.floor(Number(e.target.value)))}
                          className={`w-28 px-3 py-2 rounded-lg border text-center font-bold tabular-nums bg-background focus:outline-none focus:ring-2 ${
                            invalid ? "border-rose-500 focus:ring-rose-500/20" : "border-border focus:border-teal-500 focus:ring-teal-500/20"
                          }`}
                          dir="ltr"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {(() => {
                          const c = producedCost(item.productId);
                          return (
                            <div className="font-bold text-orange-600 dark:text-orange-400 tabular-nums leading-tight" dir="ltr">
                              <div>{fmtMoney(c.big)}</div>
                              {c.dual && (
                                <div className="text-[11px] text-muted-foreground font-semibold">{fmtMoney(c.small)} / مفرد</div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

        {/* Notes (اختياري) */}
        <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center gap-2 font-black text-emerald-600">
            <FileText className="w-5 h-5" />
            {t("transfer.notes")}
          </div>
          <textarea
            className={inputCls}
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t("prod.notes_ph")}
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   PRODUCTION DETAIL MODAL
════════════════════════════════ */
function ProductionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { t } = useLang();
  const { data: prod, isLoading } = useGetProduction(id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Split className="w-5 h-5 text-emerald-500" />
            {t("prod.detail_title")} #{prod?.productionNumber ?? ""}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading || !prod ? (
          <div className="p-12 text-center text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 text-center bg-emerald-500/10 rounded-2xl py-4 px-3">
                <p className="text-xs font-bold text-muted-foreground mb-1">{t("prod.source_detail")}</p>
                <p className="font-black text-emerald-600">{prod.sourceProductNameAr || prod.sourceProductName}</p>
                <p className="text-sm font-bold mt-1" dir="ltr">
                  {fmtQty(Number(prod.sourceQuantity))} {prod.sourceUnit ?? ""}
                </p>
              </div>
              <ArrowLeft className="w-6 h-6 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center bg-teal-500/10 rounded-2xl py-4 px-3">
                <p className="text-xs font-bold text-muted-foreground mb-1">{t("common.branch")}</p>
                <p className="font-black text-teal-600">{prod.branchName ?? "—"}</p>
              </div>
            </div>

            {(prod.productionDate || prod.productionTime) && (
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground" dir="ltr">
                <Calendar className="w-4 h-4 text-emerald-500" />
                {prod.productionDate ? prod.productionDate.replaceAll("-", "/") : ""}
                {prod.productionTime ? ` · ${prod.productionTime}` : ""}
              </div>
            )}

            {prod.notes && (
              <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm">
                <span className="font-bold text-muted-foreground">{t("common.notes")}:</span>
                {prod.notes}
              </div>
            )}

            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-sm font-bold text-muted-foreground">
                    <th className="px-4 py-3 text-start">{t("prod.col_result")}</th>
                    <th className="px-4 py-3 text-center">{t("table.quantity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {prod.items.map(item => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-bold">{item.productNameAr || item.productName}</p>
                        {item.barcode && <p className="text-xs text-muted-foreground" dir="ltr">{item.barcode}</p>}
                      </td>
                      <td className="px-4 py-3 text-center font-bold tabular-nums" dir="ltr">
                        {fmtQty(item.quantity)} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Hidden helpers: fetch a single production by id, then either hydrate the edit
   form (EditLoader) or fire the print document (Printer). Each is re-mounted per
   action and forces a fresh fetch (staleTime 0 + refetchOnMount), firing its
   side-effect exactly once — only after the refetch settles — via the ref guard,
   so a stale React Query cache can never prefill/print old data. */
function ProductionEditLoader({ id, onLoaded }: { id: number; onLoaded: (d: any) => void }) {
  const { data, isSuccess, isFetching } = useGetProduction(id, {
    query: { queryKey: getGetProductionQueryKey(id), staleTime: 0, refetchOnMount: "always" },
  });
  const done = useRef(false);
  useEffect(() => {
    if (isSuccess && !isFetching && data && !done.current) { done.current = true; onLoaded(data); }
  }, [isSuccess, isFetching, data, onLoaded]);
  return null;
}

function ProductionPrinter({ id, storeName, onDone }: { id: number; storeName: string; onDone: () => void }) {
  const { data, isSuccess, isFetching } = useGetProduction(id, {
    query: { queryKey: getGetProductionQueryKey(id), staleTime: 0, refetchOnMount: "always" },
  });
  const done = useRef(false);
  useEffect(() => {
    if (isSuccess && !isFetching && data && !done.current) { done.current = true; printProductionDoc(data, storeName); onDone(); }
  }, [isSuccess, isFetching, data, storeName, onDone]);
  return null;
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function ProductionsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const { selectedBranchId, selectedBranch, activeBranches, isBranchLocked } = useBranch();
  const { storeName } = useAppSettings();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"new" | "list">("new");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any | null>(null);
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);
  const [pendingPrintId, setPendingPrintId] = useState<number | null>(null);

  // ── Transfer-log search filters ──
  const [fNumber, setFNumber] = useState("");
  const [fProduct, setFProduct] = useState("");
  const [fBranch, setFBranch] = useState<number | "">("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const listParams = selectedBranchId != null ? { branchId: selectedBranchId } : {};
  const { data: productions = [], refetch } = useListProductions(listParams);

  useEffect(() => { refetch(); }, [selectedBranchId, refetch]);

  const filtered = useMemo(() => {
    return (productions as any[]).filter(p => {
      if (fNumber.trim() && !String(p.productionNumber).includes(toEn(fNumber.trim()))) return false;
      if (fProduct.trim()) {
        const q = normalizeAr(fProduct.trim());
        const name = normalizeAr(p.sourceProductNameAr || p.sourceProductName || "");
        if (!name.includes(q)) return false;
      }
      if (fBranch !== "" && p.branchId !== fBranch) return false;
      const d: string = p.productionDate || (p.createdAt ? String(p.createdAt).slice(0, 10) : "");
      if (fFrom && d && d < fFrom) return false;
      if (fTo && d && d > fTo) return false;
      return true;
    });
  }, [productions, fNumber, fProduct, fBranch, fFrom, fTo]);

  const hasFilter = !!(fNumber.trim() || fProduct.trim() || fBranch !== "" || fFrom || fTo);
  const resetFilters = () => { setFNumber(""); setFProduct(""); setFBranch(""); setFFrom(""); setFTo(""); };
  const handlePrintList = () => {
    const dr = (fFrom || fTo)
      ? `${fFrom ? fFrom.replaceAll("-", "/") : "…"} — ${fTo ? fTo.replaceAll("-", "/") : "…"}`
      : undefined;
    printProductionsList(filtered, resolveStoreIdentity(selectedBranch, { name: storeName }).name, dr);
  };

  const fInput = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all";
  const fLabel = "text-xs font-bold text-muted-foreground mb-1 block";

  const deleteProduction = useDeleteProduction({
    mutation: {
      onSuccess: () => {
        toast({ title: t("transfer.deleted_title"), description: t("prod.deleted_desc") });
        setDeleteId(null);
        qc.invalidateQueries({ queryKey: ["/api/inventory"] });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        refetch();
      },
      onError: (e: any) =>
        toast({ title: t("common.error"), description: e?.response?.data?.error || e?.message || t("prod.fail_delete"), variant: "destructive" }),
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header + Tabs on one row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Split className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{t("nav.productions")}</h1>
            <p className="text-sm text-muted-foreground">{t("prod.subtitle")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-muted/50 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setTab("new")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              tab === "new" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {editData ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editData ? t("prod.edit_tab") : t("prod.new_tab")}
          </button>
          <button
            onClick={() => setTab("list")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              tab === "list" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />{t("prod.log_tab")} ({productions.length})</button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card rounded-3xl border border-border p-5 md:p-6">
        {tab === "new" ? (
          <ProductionForm
            key={editData ? `edit-${editData.id}` : "new"}
            editing={editData}
            onSaved={() => { refetch(); setEditData(null); setTab("list"); }}
            onCancelEdit={() => { setEditData(null); setTab("list"); }}
          />
        ) : (
          <>
            {/* ── Search filters ── */}
            <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className={fLabel}><Hash className="inline w-3.5 h-3.5 me-1" />{t("table.list_no")}</label>
                  <input
                    className={fInput}
                    placeholder={t("prod.search_op_ph")}
                    value={fNumber}
                    onChange={e => setFNumber(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className={fLabel}><Search className="inline w-3.5 h-3.5 me-1" />{t("pm.col_source_product")}</label>
                  <input
                    className={fInput}
                    placeholder={t("prod.search_prod_ph")}
                    value={fProduct}
                    onChange={e => setFProduct(e.target.value)}
                  />
                </div>
                {!isBranchLocked && (
                  <div>
                    <label className={fLabel}><Building2 className="inline w-3.5 h-3.5 me-1" />{t("common.branch")}</label>
                    <select
                      className={fInput}
                      value={fBranch === "" ? "" : String(fBranch)}
                      onChange={e => setFBranch(e.target.value === "" ? "" : Number(e.target.value))}
                    >
                      <option value="">{t("prod.all_branches")}</option>
                      {activeBranches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={fLabel}><Calendar className="inline w-3.5 h-3.5 me-1" />{t("common.from_date")}</label>
                  <DateInput value={fFrom} onChange={e => setFFrom(e.target.value)} sizeClassName={fInput} />
                </div>
                <div>
                  <label className={fLabel}><Calendar className="inline w-3.5 h-3.5 me-1" />{t("common.to_date")}</label>
                  <DateInput value={fTo} onChange={e => setFTo(e.target.value)} sizeClassName={fInput} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <span className="text-sm font-bold text-muted-foreground">{t("prod.results")}: <span className="text-emerald-600">{filtered.length}</span> من {productions.length}
                </span>
                <div className="flex items-center gap-2">
                  {hasFilter && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />{t("prod.reset")}</button>
                  )}
                  <button
                    onClick={handlePrintList}
                    disabled={filtered.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />{t("prod.print_report")}</button>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Split className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-bold">
                  {productions.length === 0 ? t("prod.no_records") : t("prod.no_results_list")}
                </p>
              </div>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-sm font-bold text-muted-foreground">
                  <th className="px-4 py-3 text-center"><Hash className="inline w-4 h-4 me-1" />{t("common.number")}</th>
                  <th className="px-4 py-3 text-center">{t("pm.col_source_product")}</th>
                  <th className="px-4 py-3 text-center">{t("common.branch")}</th>
                  <th className="px-4 py-3 text-center"><Calendar className="inline w-4 h-4 me-1" />{t("common.date")}</th>
                  <th className="px-4 py-3 text-center">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-center font-black tabular-nums" dir="ltr">#{p.productionNumber}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">{p.sourceProductNameAr || p.sourceProductName}</td>
                    <td className="px-4 py-3 text-center font-bold text-teal-600">{p.branchName ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-muted-foreground" dir="ltr">
                      {p.productionDate
                        ? `${p.productionDate.replaceAll("-", "/")}${p.productionTime ? " " + p.productionTime.slice(0, 5) : ""}`
                        : p.createdAt ? format(new Date(p.createdAt), "yyyy/MM/dd HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailId(p.id)}
                          className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          title={t("prod.view_details")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingPrintId(p.id)}
                          className="p-2 rounded-lg text-sky-500 hover:bg-sky-500/10 transition-colors"
                          title={t("common.print")}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingEditId(p.id)}
                          className="p-2 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                          title={t("common.edit")}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </>
        )}
      </div>

      {detailId != null && <ProductionDetail id={detailId} onClose={() => setDetailId(null)} />}

      {pendingEditId != null && (
        <ProductionEditLoader
          id={pendingEditId}
          onLoaded={(d) => { setEditData(d); setPendingEditId(null); setTab("new"); }}
        />
      )}
      {pendingPrintId != null && (
        <ProductionPrinter
          id={pendingPrintId}
          storeName={resolveStoreIdentity(selectedBranch, { name: storeName }).name}
          onDone={() => setPendingPrintId(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-center mb-2">{t("prod.confirm_delete")}</h3>
            <p className="text-center text-muted-foreground mb-6">{t("prod.confirm_delete_msg")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors"
              >{t("common.cancel")}</button>
              <button
                onClick={() => deleteProduction.mutate({ id: deleteId })}
                disabled={deleteProduction.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleteProduction.isPending ? t("common.deleting") : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
