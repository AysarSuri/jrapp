import React, { useState } from "react";
import { useLang } from "@/sm/contexts/LanguageContext";
import { useAppSettings } from "@/sm/contexts/AppSettingsContext";
import { useAuth, canSeeAllBranches } from "@/sm/contexts/AuthContext";
import { useBranch } from "@/sm/contexts/BranchContext";
import { DateInput } from "@/sm/components/DateInput";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/sm/lib/utils";
import { printHtmlDirect } from "@/sm/lib/print-html-direct";
import { requireReportPrinter } from "@/sm/lib/printers";
import { REPORT_FONT_FACE_CSS } from "@/sm/lib/report-font";
import {
  CreditCard, ArrowDownCircle, ArrowUpCircle, Wallet,
  ShoppingCart, TrendingDown, TrendingUp,
  Truck, SlidersHorizontal, Calendar, Loader2,
  RefreshCw, Users, Undo2, Building2, History, Printer, FileText, X,
} from "lucide-react";

type BranchReport = { branchId: number | null; branchName: string; incomingTotal: number; outgoingTotal: number; balance: number };
type CardReport   = { cardId: number; cardName: string; incomingTotal: number; outgoingTotal: number; balance: number };

type CardCashierData = {
  scope: "single" | "all";
  cardScope: "single" | "all";
  openingBalance: number;
  carryForward: number;
  incoming: { salesCard: number; customerReceipts: number; supplierReturns: number; supplierReceived: number; ownerReturns: number; total: number };
  outgoing: { customerPaid: number; purchases: number; supplierPaid: number; expenses: number; ownerWithdrawals: number; total: number };
  balance: number;
  byBranch: BranchReport[];
  byCard: CardReport[];
};

type PaymentCard = { id: number; name: string };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtN(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
}
function fmtDate(s: string) {
  return s ? s.split("-").reverse().join("/") : "—";
}

type DetailRow = { date: string; ref: string; name: string; notes: string; amount: number; branchName: string; cardName: string };

function buildCardDetailHtml(opts: {
  labelAr: string; rows: DetailRow[]; total: number;
  fromDate: string; toDate: string; storeName: string;
  branchLabel: string; cardLabel: string; currency: string; isOutgoing: boolean;
}): string {
  const { labelAr, rows, total, fromDate, toDate, storeName, branchLabel, cardLabel, currency, isOutgoing } = opts;
  const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const accent      = isOutgoing ? "#7c3aed" : "#059669";
  const accentLight = isOutgoing ? "#f5f3ff" : "#f0fdf4";

  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td class="cnum">${i + 1}</td>
      <td class="cdate">${esc(fmtDate(r.date))}</td>
      <td class="cref">${esc(r.ref || "—")}</td>
      <td class="cname">${esc(r.name || "—")}</td>
      <td class="cnotes">${esc(r.notes || "")}</td>
      <td class="camount" dir="ltr">${fmtN(r.amount)}</td>
      <td class="cbranch">${esc(r.branchName || "")}</td>
      <td class="cbranch">${esc(r.cardName || "")}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
${REPORT_FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 landscape;margin:0.2cm}
body{font-family:'ReportFont',Vazirmatn,Tahoma,sans-serif;font-size:11px;padding:8px 10px;direction:rtl;background:#fff;color:#1e293b}
.hdr{background:linear-gradient(135deg,${accent} 0%,${accent}dd 100%);color:#fff;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
.hdr-title{font-size:17px;font-weight:900}
.hdr-sub{font-size:10px;opacity:.8;margin-top:2px}
.hdr-right{text-align:left}
.hdr-store{font-size:13px;font-weight:900}
.hdr-period{font-size:10px;opacity:.8;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:11px}
thead tr{background:#1e293b;color:#fff}
thead th{padding:6px 5px;font-weight:700;font-size:10.5px;white-space:nowrap}
tbody tr:nth-child(even){background:${accentLight}}
tbody td{padding:5px 5px;border-bottom:1px solid #f1f5f9}
.cnum{width:28px;text-align:center;color:#94a3b8}
.cdate{width:72px}
.cref{width:50px;text-align:center}
.cname{max-width:130px}
.cnotes{max-width:100px;color:#475569}
.camount{width:80px;text-align:left;font-weight:700;color:${accent}}
.cbranch{max-width:90px;font-size:10px;color:#475569}
tfoot tr{background:#f8fafc}
.foot-lbl{padding:7px 5px;font-weight:700;text-align:right;font-size:12px}
.foot-total{padding:7px 5px;font-weight:900;font-size:13px;text-align:left;color:${accent}}
.meta{margin-top:4px;font-size:10px;color:#94a3b8;text-align:left}
.empty{text-align:center;padding:20px;color:#94a3b8}
</style></head><body>
<div class="hdr">
  <div>
    <div class="hdr-title">${esc(labelAr)}</div>
    <div class="hdr-sub">قاصة البطاقات — ${isOutgoing ? "مدفوعات" : "مبالغ واصلة"}</div>
  </div>
  <div class="hdr-right">
    <div class="hdr-store">${esc(storeName)}${branchLabel ? ` — ${esc(branchLabel)}` : ""}${cardLabel ? ` | ${esc(cardLabel)}` : ""}</div>
    <div class="hdr-period">الفترة: ${fmtDate(fromDate)} — ${fmtDate(toDate)}</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>التاريخ</th><th>رقم</th><th>الاسم</th><th>ملاحظات</th>
    <th style="text-align:left">المبلغ</th><th>الفرع</th><th>البطاقة</th>
  </tr></thead>
  <tbody>${rows.length ? rowsHtml : `<tr><td colspan="8" class="empty">لا توجد سجلات في هذه الفترة</td></tr>`}</tbody>
  <tfoot><tr>
    <td colspan="5" class="foot-lbl">الإجمالي</td>
    <td class="foot-total" dir="ltr">${fmtN(total)} ${esc(currency)}</td>
    <td colspan="2"></td>
  </tr></tfoot>
</table>
${rows.length ? `<div class="meta">إجمالي السجلات: ${rows.length}</div>` : ""}
</body></html>`;
}

function buildCardSummaryHtml(opts: {
  data: CardCashierData; fromDate: string; toDate: string;
  storeName: string; branchLabel: string; cardLabel: string; currency: string;
}): string {
  const { data, fromDate, toDate, storeName, branchLabel, cardLabel, currency } = opts;
  const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
  const fd  = (s: string) => s ? s.split("-").reverse().join("/") : "—";
  const isPos = data.balance >= 0;

  const inRows: [string, number, string][] = [
    ["مبيعات (بطاقة)",          data.incoming.salesCard,        "#059669"],
    ["واصل من حركة الزبائن",    data.incoming.customerReceipts, "#0891b2"],
    ["مرجوعات الموردين",         data.incoming.supplierReturns,  "#65a30d"],
    ["واصل من دفع الموردين",    data.incoming.supplierReceived, "#059669"],
    ["مرجوعات صاحب المحل",      data.incoming.ownerReturns,     "#0d9488"],
  ];
  const outRows: [string, number, string][] = [
    ["مدفوع من حركة الزبائن",  data.outgoing.customerPaid,     "#e11d48"],
    ["المشتريات (بطاقة)",       data.outgoing.purchases,        "#ea580c"],
    ["مدفوعات الموردين",         data.outgoing.supplierPaid,     "#64748b"],
    ["المصاريف",                 data.outgoing.expenses,         "#dc2626"],
    ["سحوبات صاحب المحل",       data.outgoing.ownerWithdrawals, "#7c3aed"],
  ];

  const makeRows = (rows: [string, number, string][], isOut: boolean) =>
    rows.map(([lbl, val, clr]) => `
      <tr>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${clr};margin-left:6px;vertical-align:middle"></span>
          ${esc(lbl)}
        </td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700;color:${isOut ? "#7c3aed" : "#059669"}" dir="ltr">
          ${isOut ? "- " : "+ "}${fmt(val)}
        </td>
      </tr>`).join("");

  const byCardRows = data.byCard.map(c => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${esc(c.cardName)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;color:#059669" dir="ltr">+ ${fmt(c.incomingTotal)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;color:#7c3aed" dir="ltr">- ${fmt(c.outgoingTotal)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700;color:${c.balance >= 0 ? "#059669" : "#7c3aed"}" dir="ltr">${fmt(c.balance)}</td>
    </tr>`).join("");

  const byBranchRows = data.byBranch.map(b => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${esc(b.branchName || "—")}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;color:#059669" dir="ltr">+ ${fmt(b.incomingTotal)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;color:#7c3aed" dir="ltr">- ${fmt(b.outgoingTotal)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700;color:${b.balance >= 0 ? "#059669" : "#7c3aed"}" dir="ltr">${fmt(b.balance)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
${REPORT_FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0.2cm}
body{font-family:'ReportFont',Vazirmatn,Tahoma,sans-serif;font-size:12px;direction:rtl;background:#fff;color:#1e293b}
</style></head><body>

<div style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#fff;border-radius:10px;padding:14px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="font-size:20px;font-weight:900">تقرير قاصة البطاقات</div>
    <div style="font-size:11px;opacity:.85;margin-top:3px">كشف حساب — معاملات البطاقات فقط</div>
  </div>
  <div style="text-align:left">
    <div style="font-size:14px;font-weight:900">${esc(storeName)}${branchLabel ? ` — ${esc(branchLabel)}` : ""}</div>
    ${cardLabel ? `<div style="font-size:11px;opacity:.85;margin-top:2px">البطاقة: ${esc(cardLabel)}</div>` : ""}
    <div style="font-size:11px;opacity:.85;margin-top:2px">الفترة: ${fd(fromDate)} — ${fd(toDate)}</div>
  </div>
</div>

<div style="display:flex;gap:12px;margin-bottom:12px">
  <div style="flex:1;border:2px solid #059669;border-radius:8px;overflow:hidden">
    <div style="background:#059669;color:#fff;padding:8px 10px;font-weight:900;font-size:13px;display:flex;justify-content:space-between">
      <span>المبالغ الواصلة</span><span dir="ltr">+ ${fmt(data.incoming.total)} ${esc(currency)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">${makeRows(inRows, false)}</table>
  </div>
  <div style="flex:1;border:2px solid #7c3aed;border-radius:8px;overflow:hidden">
    <div style="background:#7c3aed;color:#fff;padding:8px 10px;font-weight:900;font-size:13px;display:flex;justify-content:space-between">
      <span>المدفوعات</span><span dir="ltr">- ${fmt(data.outgoing.total)} ${esc(currency)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">${makeRows(outRows, true)}</table>
  </div>
</div>

<div style="display:flex;gap:10px;margin-bottom:${(data.byCard.length > 1 || data.byBranch.length > 1) ? "12" : "0"}px">
  <div style="flex:1;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:11px;color:#1e293b;font-weight:700;margin-bottom:4px">الرصيد الافتتاحي للبطاقات</div>
    <div style="font-size:18px;font-weight:900;color:#7c3aed" dir="ltr">${fmt(data.openingBalance)} <span style="font-size:11px;font-weight:700;color:#1e293b">${esc(currency)}</span></div>
  </div>
  <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:11px;color:#064e3b;margin-bottom:4px">الباقي من قبل الفترة</div>
    <div style="font-size:18px;font-weight:900;color:#059669" dir="ltr">${fmt(data.carryForward)} <span style="font-size:11px;font-weight:700;color:#1e293b">${esc(currency)}</span></div>
  </div>
  <div style="flex:1;background:${isPos ? "#f0fdf4" : "#faf5ff"};border:2px solid ${isPos ? "#059669" : "#7c3aed"};border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:11px;color:${isPos ? "#064e3b" : "#4c1d95"};margin-bottom:4px">الرصيد الصافي</div>
    <div style="font-size:22px;font-weight:900;color:${isPos ? "#059669" : "#7c3aed"}" dir="ltr">${fmt(data.balance)} <span style="font-size:11px;font-weight:700;color:#1e293b">${esc(currency)}</span></div>
  </div>
</div>

${data.byCard.length > 1 ? `
<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px">
  <div style="background:#5b21b6;color:#fff;padding:8px 10px;font-weight:900;font-size:12px">توزيع البطاقات</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr style="background:#f8fafc">
      <th style="padding:7px 8px;text-align:right;font-weight:700">البطاقة</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700;color:#059669">واصل</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700;color:#7c3aed">مدفوع</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700">الرصيد</th>
    </tr></thead>
    <tbody>${byCardRows}</tbody>
  </table>
</div>` : ""}

${data.byBranch.length > 1 ? `
<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#1e293b;color:#fff;padding:8px 10px;font-weight:900;font-size:12px">توزيع الفروع</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr style="background:#f8fafc">
      <th style="padding:7px 8px;text-align:right;font-weight:700">الفرع</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700;color:#059669">واصل</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700;color:#7c3aed">مدفوع</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700">الرصيد</th>
    </tr></thead>
    <tbody>${byBranchRows}</tbody>
  </table>
</div>` : ""}

</body></html>`;
}

const inputCls = "w-full border border-border rounded-xl px-3 py-2.5 text-[15px] bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

export default function CardCashierPage() {
  const { t } = useLang();
  const { currency, storeName } = useAppSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedBranchId, activeBranches } = useBranch();

  const canAll = !!user && canSeeAllBranches(user.role);
  const [filterBranchId, setFilterBranchId] = useState<number | null>(null);
  const effBranchId = canAll ? filterBranchId : selectedBranchId;

  const [filterCardId, setFilterCardId] = useState<number | null>(null);

  const [filterFrom, setFilterFrom] = useState(todayStr());
  const [filterTo,   setFilterTo]   = useState(todayStr());

  const [printing, setPrinting]     = useState<Set<string>>(new Set());
  const [previewModal, setPreviewModal] = useState<{ html: string; label: string } | null>(null);

  /* ── payment cards list ── */
  const { data: cardsList } = useQuery<PaymentCard[]>({
    queryKey: ["payment-cards-list"],
    queryFn: () => fetchJson("/api/payment-cards"),
  });

  /* ── main data ── */
  const buildQ = () => {
    const params = new URLSearchParams();
    if (filterFrom) params.set("fromDate", filterFrom);
    if (filterTo)   params.set("toDate",   filterTo);
    if (effBranchId != null) params.set("branchId", String(effBranchId));
    if (filterCardId != null) params.set("cardId",  String(filterCardId));
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<CardCashierData>({
    queryKey: ["cashier-cards", filterFrom, filterTo, effBranchId, filterCardId],
    queryFn: () => fetchJson(`/api/cashier-cards?${buildQ()}`),
    staleTime: 30_000,
  });

  /* ── show summary ── */
  const showSummary = () => {
    if (!data) return;
    const branchLabel = effBranchId != null ? (activeBranches.find(b => b.id === effBranchId)?.name || "") : "";
    const cardLabel   = filterCardId != null ? (cardsList?.find(c => c.id === filterCardId)?.name || "") : "";
    const html = buildCardSummaryHtml({
      data, fromDate: filterFrom, toDate: filterTo,
      storeName, branchLabel, cardLabel, currency,
    });
    setPreviewModal({ html, label: t("cc.report_label") });
  };

  /* ── show category detail ── */
  const showDetail = async (category: string, isOutgoing: boolean) => {
    setPrinting(prev => new Set(prev).add(category));
    try {
      const params = new URLSearchParams({ category });
      if (filterFrom) params.set("fromDate", filterFrom);
      if (filterTo)   params.set("toDate",   filterTo);
      if (effBranchId  != null) params.set("branchId", String(effBranchId));
      if (filterCardId != null) params.set("cardId",   String(filterCardId));
      const detail = await fetchJson<{ labelAr: string; rows: DetailRow[]; total: number }>(`/api/cashier-cards/detail?${params}`);
      const branchLabel = effBranchId  != null ? (activeBranches.find(b => b.id === effBranchId)?.name   || "") : "";
      const cardLabel   = filterCardId != null ? (cardsList?.find(c => c.id === filterCardId)?.name || "") : "";
      const html = buildCardDetailHtml({
        labelAr: detail.labelAr, rows: detail.rows, total: detail.total,
        fromDate: filterFrom, toDate: filterTo, storeName, branchLabel, cardLabel, currency, isOutgoing,
      });
      setPreviewModal({ html, label: detail.labelAr });
    } catch {
      toast({ title: t("common.error"), description: t("cc.fetch_error"), variant: "destructive" });
    } finally {
      setPrinting(prev => { const s = new Set(prev); s.delete(category); return s; });
    }
  };

  const isPos = (data?.balance ?? 0) >= 0;

  return (
    <>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">{t("nav.card_cashier")}</h1>
              <p className="text-xs text-muted-foreground">{t("cc.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={showSummary}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> {t("cashier.print")}
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {t("fraud.refresh")}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-[15px] font-bold text-muted-foreground">{t("cashier.filters")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[15px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {t("common.from_date")}
              </label>
              <DateInput className={inputCls} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {t("common.to_date")}
              </label>
              <DateInput className={inputCls} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
          </div>

          {/* Card selector */}
          <div className="mt-3">
            <label className="block text-[15px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> {t("cc.card_label")}
            </label>
            <select
              className={inputCls}
              value={filterCardId == null ? "" : String(filterCardId)}
              onChange={e => setFilterCardId(e.target.value === "" ? null : parseInt(e.target.value))}
            >
              <option value="">{t("cc.all_cards")}</option>
              {(cardsList || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {canAll && (
            <div className="mt-3">
              <label className="block text-[15px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {t("cashier.branch")}
              </label>
              <select
                className={inputCls}
                value={filterBranchId == null ? "" : String(filterBranchId)}
                onChange={e => setFilterBranchId(e.target.value === "" ? null : parseInt(e.target.value))}
              >
                <option value="">{t("cashier.all_branches")}</option>
                {activeBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <p className="text-[15px] text-muted-foreground mt-2 text-center">
            {t("cashier.period")} {fmtDate(filterFrom)} — {fmtDate(filterTo)}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>{t("cc.loading")}</span>
          </div>
        ) : data && data.incoming && data.outgoing ? (
          <>
            {/* Carry-forward */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-[15px] font-semibold text-muted-foreground">{t("cc.opening_balance")}</span>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-violet-600" dir="ltr">{fmtN(data.openingBalance)}</span>
                <span className="text-sm text-muted-foreground mb-0.5">{currency}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-[15px] font-semibold text-muted-foreground">{t("cc.carry_forward")}</span>
                <span className="font-black text-emerald-600 mr-auto" dir="ltr">{fmtN(data.carryForward)} {currency}</span>
              </div>
            </div>

            {/* Incoming */}
            <div className="bg-card border border-emerald-500/30 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-emerald-500/5">
                <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-black text-[15px] text-emerald-700 dark:text-emerald-400">{t("cashier.incoming")}</span>
                <span className="mr-auto text-[15px] font-black text-emerald-600" dir="ltr">+ {fmtN(data.incoming.total)} <span className="text-xs font-normal text-muted-foreground">{currency}</span></span>
              </div>
              <div className="divide-y divide-border/50">
                <CashRow icon={<ShoppingCart className="w-4 h-4 text-emerald-600" />}  label={t("cc.sales_card")}           value={data.incoming.salesCard}        color="emerald" onPrint={() => showDetail("salesCard",        false)} printLoading={printing.has("salesCard")} />
                <CashRow icon={<Users        className="w-4 h-4 text-cyan-600" />}    label={t("cashier.customer_receipts")}    value={data.incoming.customerReceipts}  color="cyan"    onPrint={() => showDetail("customerReceipts",  false)} printLoading={printing.has("customerReceipts")} />
                <CashRow icon={<Undo2        className="w-4 h-4 text-lime-600" />}    label={t("cc.sup_returns_card")}  value={data.incoming.supplierReturns}   color="lime"    onPrint={() => showDetail("supplierReturns",   false)} printLoading={printing.has("supplierReturns")} />
                <CashRow icon={<Truck        className="w-4 h-4 text-emerald-600" />} label={t("cc.sup_received")}    value={data.incoming.supplierReceived}  color="emerald" onPrint={() => showDetail("supplierReceived",  false)} printLoading={printing.has("supplierReceived")} />
                <CashRow icon={<TrendingUp   className="w-4 h-4 text-teal-500" />}   label={t("cc.owner_returns")}      value={data.incoming.ownerReturns}      color="teal"    onPrint={() => showDetail("ownerReturns",      false)} printLoading={printing.has("ownerReturns")} />
              </div>
            </div>

            {/* Outgoing */}
            <div className="bg-card border border-violet-500/30 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-violet-500/5">
                <ArrowUpCircle className="w-5 h-5 text-violet-600" />
                <span className="font-black text-[15px] text-violet-700 dark:text-violet-400">{t("cashier.outgoing")}</span>
                <span className="mr-auto text-[15px] font-black text-violet-600" dir="ltr">- {fmtN(data.outgoing.total)} <span className="text-xs font-normal text-muted-foreground">{currency}</span></span>
              </div>
              <div className="divide-y divide-border/50">
                <CashRow icon={<Users       className="w-4 h-4 text-rose-500" />}   label={t("cc.cust_paid")}   value={data.outgoing.customerPaid}     color="rose"   negative onPrint={() => showDetail("customerPaid",    true)} printLoading={printing.has("customerPaid")} />
                <CashRow icon={<ShoppingCart className="w-4 h-4 text-orange-500" />} label={t("cc.purchases_card")}        value={data.outgoing.purchases}        color="orange" negative onPrint={() => showDetail("purchases",       true)} printLoading={printing.has("purchases")} />
                <CashRow icon={<Truck       className="w-4 h-4 text-slate-500" />}  label={t("cc.sup_paid")}         value={data.outgoing.supplierPaid}     color="slate"  negative onPrint={() => showDetail("supplierPaid",    true)} printLoading={printing.has("supplierPaid")} />
                <CashRow icon={<Wallet      className="w-4 h-4 text-red-500" />}    label={t("cashier.expenses")}                  value={data.outgoing.expenses}         color="red"    negative onPrint={() => showDetail("expenses",        true)} printLoading={printing.has("expenses")} />
                <CashRow icon={<TrendingDown className="w-4 h-4 text-violet-600" />} label={t("cashier.owner_withdrawals")}        value={data.outgoing.ownerWithdrawals} color="violet" negative onPrint={() => showDetail("ownerWithdrawals", true)} printLoading={printing.has("ownerWithdrawals")} />
              </div>
            </div>

            {/* Net Balance */}
            <div className={`rounded-2xl p-5 shadow-sm border-2 ${isPos ? "bg-emerald-500/10 border-emerald-500/40" : "bg-violet-500/10 border-violet-500/40"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className={`w-5 h-5 ${isPos ? "text-emerald-600" : "text-violet-600"}`} />
                  <span className="font-bold text-[15px]">{t("cc.net_balance")}</span>
                </div>
                <div className="text-center">
                  <span className={`text-3xl font-black ${isPos ? "text-emerald-600" : "text-violet-600"}`} dir="ltr">
                    {isPos ? "+" : ""}{fmtN(data.balance)}
                  </span>
                  <span className="text-sm text-muted-foreground mr-2">{currency}</span>
                </div>
              </div>
            </div>

            {/* By-Card breakdown */}
            {data.byCard.length > 1 && (
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                  <span className="font-bold text-[15px]">{t("cc.by_card")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                        <th className="px-3 py-2.5 text-right">{t("cc.card_label")}</th>
                        <th className="px-3 py-2.5 text-end">{t("cashier.received_col")}</th>
                        <th className="px-3 py-2.5 text-end">{t("cashier.paid_col")}</th>
                        <th className="px-3 py-2.5 text-end">{t("common.balance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.byCard.map(c => (
                        <tr key={c.cardId} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-semibold">{c.cardName}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-emerald-600" dir="ltr">{fmtN(c.incomingTotal)}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-violet-600" dir="ltr">{fmtN(c.outgoingTotal)}</td>
                          <td className={`px-3 py-2.5 text-end tabular-nums font-black ${c.balance >= 0 ? "text-emerald-600" : "text-violet-600"}`} dir="ltr">{fmtN(c.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* By-Branch breakdown */}
            {data.byBranch.length > 1 && (
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-[15px]">{t("cc.by_branch_title")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                        <th className="px-3 py-2.5 text-right">{t("cashier.branch")}</th>
                        <th className="px-3 py-2.5 text-end">{t("cashier.received_col")}</th>
                        <th className="px-3 py-2.5 text-end">{t("cashier.paid_col")}</th>
                        <th className="px-3 py-2.5 text-end">{t("common.balance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.byBranch.map((b, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-semibold">{b.branchName}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-emerald-600" dir="ltr">{fmtN(b.incomingTotal)}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-violet-600" dir="ltr">{fmtN(b.outgoingTotal)}</td>
                          <td className={`px-3 py-2.5 text-end tabular-nums font-black ${b.balance >= 0 ? "text-emerald-600" : "text-violet-600"}`} dir="ltr">{fmtN(b.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">{t("common.no_data")}</div>
        )}
      </div>

      {/* Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border shadow-sm shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-base">{previewModal.label}</span>
            </div>
            <button
              onClick={() => {
                if (!requireReportPrinter()) return;
                printHtmlDirect(previewModal.html);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors shadow"
            >
              <Printer className="w-4 h-4" /> {t("common.print")}
            </button>
            <button
              onClick={() => setPreviewModal(null)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-gray-200 dark:bg-zinc-800 p-6 flex justify-center">
            <iframe
              srcDoc={previewModal.html}
              title={t("cc.preview_title")}
              style={{ width: 1000, minHeight: 1123, border: "none", background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.18)" }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function CashRow({ icon, label, value, color, negative, onPrint, printLoading }: {
  icon: React.ReactNode; label: string; value: number; color: string;
  negative?: boolean; onPrint?: () => void; printLoading?: boolean;
}) {
  const { t } = useLang();
  const { fmtMoney } = useAppSettings();
  const textColor = negative
    ? "text-violet-600"
    : color === "emerald" ? "text-emerald-600"
    : color === "cyan"    ? "text-cyan-600"
    : color === "lime"    ? "text-lime-600"
    : color === "teal"    ? "text-teal-600"
    : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-[15px] text-foreground flex-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-black text-[15px] ${textColor}`} dir="ltr">
          {negative ? "- " : "+ "}{fmtMoney(value)}
        </span>
        {onPrint && (
          <button
            onClick={onPrint}
            disabled={printLoading}
            title={t("cc.print_detail")}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 border border-border text-muted-foreground hover:bg-violet-500/10 hover:border-violet-500/40 hover:text-violet-600 transition-all shadow-sm disabled:opacity-40"
          >
            {printLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Printer className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
