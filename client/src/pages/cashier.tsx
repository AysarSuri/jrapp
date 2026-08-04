import React, { useState } from "react";
import { useLang } from '@/contexts/LanguageContext';
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth, canSeeAllBranches } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { DateInput } from "@/components/DateInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/utils";
import { printHtmlDirect } from "@/lib/print-html-direct";
import { requireReportPrinter } from "@/lib/printers";
import { REPORT_FONT_FACE_CSS } from "@/lib/report-font";
import {
  Landmark, ArrowDownCircle, ArrowUpCircle, Wallet,
  ShoppingCart, TrendingDown, TrendingUp,
  Truck, SlidersHorizontal, Calendar, Check, X, Pencil, Loader2,
  RefreshCw, Users, Undo2, Building2, History, Printer, FileText,
} from "lucide-react";

type BranchReport = {
  branchId: number | null;
  branchName: string;
  carryForward: number;
  incomingTotal: number;
  outgoingTotal: number;
  balance: number;
};

type CashierData = {
  scope: "single" | "all";
  openingBalance: number;
  carryForward: number;
  incoming: {
    salesCash: number;
    customerReceipts: number;
    supplierReturns: number;
    supplierReceived: number;
    ownerReturns: number;
    total: number;
  };
  outgoing: {
    customerPaid: number;
    purchasesCash: number;
    supplierPaid: number;
    expenses: number;
    ownerWithdrawals: number;
    total: number;
  };
  balance: number;
  byBranch: BranchReport[];
};

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

type DetailRow = { date: string; ref: string; name: string; notes: string; amount: number; branchName: string };

function buildCashierDetailHtml(opts: {
  labelAr: string; rows: DetailRow[]; total: number;
  fromDate: string; toDate: string; storeName: string;
  branchLabel: string; currency: string; isOutgoing: boolean;
}): string {
  const { labelAr, rows, total, fromDate, toDate, storeName, branchLabel, currency, isOutgoing } = opts;
  const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const accent = isOutgoing ? "#dc2626" : "#059669";
  const accentLight = isOutgoing ? "#fef2f2" : "#f0fdf4";

  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td class="cnum">${i + 1}</td>
      <td class="cdate">${esc(fmtDate(r.date))}</td>
      <td class="cref">${esc(r.ref || "—")}</td>
      <td class="cname">${esc(r.name || "—")}</td>
      <td class="cnotes">${esc(r.notes || "")}</td>
      <td class="camount" dir="ltr">${fmtN(r.amount)}</td>
      <td class="cbranch">${esc(r.branchName || "")}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
${REPORT_FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0.2cm}
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
tbody tr:nth-child(odd){background:#fff}
tbody td{padding:4.5px 5px;border-bottom:1px solid #e2e8f0}
tfoot tr{background:#1e293b;color:#fff}
tfoot td{padding:7px 5px;font-weight:900}
.cnum{width:28px;text-align:center;color:#94a3b8;font-size:10px}
.cdate{width:68px;white-space:nowrap}
.cref{width:52px;text-align:center}
.cname{max-width:130px}
.cnotes{color:#64748b;font-size:10px}
.camount{text-align:left;font-weight:900;color:${accent};width:85px;white-space:nowrap}
.cbranch{width:75px;color:#64748b;font-size:10px}
.foot-lbl{font-size:12px}
.foot-total{text-align:left;direction:ltr;font-size:14px;color:${accent === "#059669" ? "#86efac" : "#fca5a5"}}
.empty{text-align:center;padding:28px;color:#94a3b8;font-size:12px}
.meta{text-align:center;padding-top:5px;color:#94a3b8;font-size:10px}
</style></head><body>
<div class="hdr">
  <div>
    <div class="hdr-title">${esc(labelAr)}</div>
    <div class="hdr-sub">كشف تفصيلي — نقد فقط (بدون بطاقات)</div>
    <div class="hdr-sub">${branchLabel ? "الفرع: " + esc(branchLabel) : "كل الفروع"}</div>
  </div>
  <div class="hdr-right">
    <div class="hdr-store">${esc(storeName)}</div>
    <div class="hdr-period">من: ${esc(fmtDate(fromDate))} — إلى: ${esc(fmtDate(toDate))}</div>
  </div>
</div>
<table>
  <thead><tr>
    <th class="cnum">#</th>
    <th class="cdate">التاريخ</th>
    <th class="cref">رقم</th>
    <th class="cname">الاسم / التفصيل</th>
    <th class="cnotes">الملاحظات</th>
    <th class="camount">المبلغ (${esc(currency)})</th>
    <th class="cbranch">الفرع</th>
  </tr></thead>
  <tbody>${rows.length ? rowsHtml : `<tr><td colspan="7" class="empty">لا توجد سجلات في هذه الفترة</td></tr>`}</tbody>
  <tfoot><tr>
    <td colspan="5" class="foot-lbl">الإجمالي</td>
    <td class="foot-total" dir="ltr">${fmtN(total)} ${esc(currency)}</td>
    <td></td>
  </tr></tfoot>
</table>
${rows.length ? `<div class="meta">إجمالي السجلات: ${rows.length}</div>` : ""}
</body></html>`;
}

function buildCashierSummaryHtml(opts: {
  data: CashierData; fromDate: string; toDate: string;
  storeName: string; branchLabel: string; currency: string;
  showOpening: boolean;
}): string {
  const { data, fromDate, toDate, storeName, branchLabel, currency, showOpening } = opts;
  const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
  const fd = (s: string) => s ? s.split("-").reverse().join("/") : "—";
  const isPos = data.balance >= 0;

  const inRows = [
    ["مبيعات نقدي",           data.incoming.salesCash,        "#059669"],
    ["واصل من حركة الزبائن", data.incoming.customerReceipts, "#0891b2"],
    ["مرجوعات الموردين",      data.incoming.supplierReturns,  "#65a30d"],
    ["واصل من دفع الموردين", data.incoming.supplierReceived, "#059669"],
    ["مرجوعات صاحب المحل",   data.incoming.ownerReturns,     "#0d9488"],
  ] as [string, number, string][];

  const outRows = [
    ["مدفوع من حركة الزبائن", data.outgoing.customerPaid,      "#e11d48"],
    ["المشتريات (نقداً)",     data.outgoing.purchasesCash,     "#ea580c"],
    ["مدفوعات الموردين",      data.outgoing.supplierPaid,      "#64748b"],
    ["المصاريف",              data.outgoing.expenses,          "#dc2626"],
    ["سحوبات صاحب المحل",    data.outgoing.ownerWithdrawals,  "#7c3aed"],
  ] as [string, number, string][];

  const makeRows = (rows: [string, number, string][], isOut: boolean) =>
    rows.map(([lbl, val, clr], i) => `
      <tr>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${clr};margin-left:6px;vertical-align:middle"></span>
          ${esc(lbl)}
        </td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700;color:${isOut ? "#dc2626" : "#059669"}" dir="ltr">
          ${isOut ? "- " : "+ "}${fmt(val)}
        </td>
      </tr>`).join("");

  const byBranchRows = data.byBranch.length > 1 ? data.byBranch.map(b => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${esc(b.branchName || "—")}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;color:#059669" dir="ltr">+ ${fmt(b.incomingTotal)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;color:#dc2626" dir="ltr">- ${fmt(b.outgoingTotal)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700;color:${b.balance >= 0 ? "#059669" : "#dc2626"}" dir="ltr">${fmt(b.balance)}</td>
    </tr>`).join("") : "";

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
${REPORT_FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0.2cm}
body{font-family:'ReportFont',Vazirmatn,Tahoma,sans-serif;font-size:12px;direction:rtl;background:#fff;color:#1e293b}
</style></head><body>

<!-- Header -->
<div style="background:linear-gradient(135deg,#d97706 0%,#b45309 100%);color:#fff;border-radius:10px;padding:14px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="font-size:20px;font-weight:900">تقرير القاصة</div>
    <div style="font-size:11px;opacity:.85;margin-top:3px">كشف حساب الصندوق — نقد فقط</div>
  </div>
  <div style="text-align:left">
    <div style="font-size:14px;font-weight:900">${esc(storeName)}</div>
    ${branchLabel ? `<div style="font-size:11px;opacity:.85;margin-top:2px">${esc(branchLabel)}</div>` : ""}
    <div style="font-size:11px;opacity:.85;margin-top:2px">الفترة: ${fd(fromDate)} — ${fd(toDate)}</div>
  </div>
</div>

<!-- Two columns: incoming + outgoing -->
<div style="display:flex;gap:12px;margin-bottom:12px">

  <!-- Incoming -->
  <div style="flex:1;border:2px solid #059669;border-radius:8px;overflow:hidden">
    <div style="background:#059669;color:#fff;padding:8px 10px;font-weight:900;font-size:13px;display:flex;justify-content:space-between">
      <span>المبالغ الواصلة</span>
      <span dir="ltr">+ ${fmt(data.incoming.total)} ${esc(currency)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      ${makeRows(inRows, false)}
    </table>
  </div>

  <!-- Outgoing -->
  <div style="flex:1;border:2px solid #dc2626;border-radius:8px;overflow:hidden">
    <div style="background:#dc2626;color:#fff;padding:8px 10px;font-weight:900;font-size:13px;display:flex;justify-content:space-between">
      <span>المدفوعات</span>
      <span dir="ltr">- ${fmt(data.outgoing.total)} ${esc(currency)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      ${makeRows(outRows, true)}
    </table>
  </div>
</div>

<!-- Summary strip -->
<div style="display:flex;gap:10px;margin-bottom:${data.byBranch.length > 1 ? "12" : "0"}px">
  ${showOpening ? `
  <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:11px;color:#1e293b;font-weight:700;margin-bottom:4px">رصيد قبل البرنامج</div>
    <div style="font-size:18px;font-weight:900;color:#1e293b" dir="ltr">${fmt(data.openingBalance)} <span style="font-size:11px;font-weight:700;color:#1e293b">${esc(currency)}</span></div>
  </div>` : ""}
  <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:11px;color:#064e3b;margin-bottom:4px">الباقي من قبل الفترة</div>
    <div style="font-size:18px;font-weight:900;color:#059669" dir="ltr">${fmt(data.carryForward)} <span style="font-size:11px;font-weight:700;color:#1e293b">${esc(currency)}</span></div>
  </div>
  <div style="flex:1;background:${isPos ? "#f0fdf4" : "#fef2f2"};border:2px solid ${isPos ? "#059669" : "#dc2626"};border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:11px;color:${isPos ? "#064e3b" : "#7f1d1d"};margin-bottom:4px">الرصيد الصافي</div>
    <div style="font-size:22px;font-weight:900;color:${isPos ? "#059669" : "#dc2626"}" dir="ltr">${fmt(data.balance)} <span style="font-size:11px;font-weight:700;color:#1e293b">${esc(currency)}</span></div>
  </div>
</div>

<!-- By-branch table (only when all-branches) -->
${data.byBranch.length > 1 ? `
<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#1e293b;color:#fff;padding:8px 10px;font-weight:900;font-size:12px">توزيع الفروع</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr style="background:#f8fafc">
      <th style="padding:7px 8px;text-align:right;font-weight:700">الفرع</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700;color:#059669">واصل</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700;color:#dc2626">مدفوع</th>
      <th style="padding:7px 8px;text-align:left;font-weight:700">الرصيد</th>
    </tr></thead>
    <tbody>${byBranchRows}</tbody>
  </table>
</div>` : ""}

</body></html>`;
}

const inputCls = "w-full border border-border rounded-xl px-3 py-2.5 text-[15px] bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

export default function CashierPage() {
  const { t } = useLang();
  const { currency, storeName } = useAppSettings();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { selectedBranchId, activeBranches } = useBranch();

  const canAll = !!user && canSeeAllBranches(user.role);
  /* admin/supervisor pick branch here (null = all); others are pinned to theirs */
  const [filterBranchId, setFilterBranchId] = useState<number | null>(null);
  const effBranchId = canAll ? filterBranchId : selectedBranchId;

  const [filterFrom, setFilterFrom] = useState(todayStr());
  const [filterTo, setFilterTo] = useState(todayStr());
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [printing, setPrinting] = useState<Set<string>>(new Set());
  const [previewModal, setPreviewModal] = useState<{ html: string; label: string } | null>(null);

  const showSummary = () => {
    if (!data) return;
    const branchLabel = effBranchId != null
      ? (activeBranches.find(b => b.id === effBranchId)?.name || "")
      : "";
    const html = buildCashierSummaryHtml({
      data, fromDate: filterFrom, toDate: filterTo,
      storeName, branchLabel, currency,
      showOpening: user?.role === "admin",
    });
    setPreviewModal({ html, label: "تقرير القاصة" });
  };

  const showDetail = async (category: string, isOutgoing: boolean) => {
    setPrinting(prev => new Set(prev).add(category));
    try {
      const params = new URLSearchParams({ category });
      if (filterFrom) params.set("fromDate", filterFrom);
      if (filterTo)   params.set("toDate",   filterTo);
      if (effBranchId != null) params.set("branchId", String(effBranchId));
      const detail = await fetchJson<{ labelAr: string; rows: DetailRow[]; total: number }>(`/api/cashier/detail?${params}`);
      const branchLabel = effBranchId != null ? (activeBranches.find(b => b.id === effBranchId)?.name || "") : "";
      const html = buildCashierDetailHtml({
        labelAr: detail.labelAr, rows: detail.rows, total: detail.total,
        fromDate: filterFrom, toDate: filterTo, storeName, branchLabel, currency, isOutgoing,
      });
      setPreviewModal({ html, label: detail.labelAr });
    } catch {
      toast({ title: "خطأ", description: "فشل جلب تفاصيل التقرير", variant: "destructive" });
    } finally {
      setPrinting(prev => { const s = new Set(prev); s.delete(category); return s; });
    }
  };

  const buildQ = () => {
    const params = new URLSearchParams();
    if (filterFrom) params.set("fromDate", filterFrom);
    if (filterTo) params.set("toDate", filterTo);
    if (effBranchId != null) params.set("branchId", String(effBranchId));
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<CashierData>({
    queryKey: ["cashier", filterFrom, filterTo, effBranchId],
    queryFn: () => fetchJson<CashierData>(`/api/cashier?${buildQ()}`),
  });

  const saveBalance = useMutation({
    mutationFn: async (val: string) => {
      return fetchJson("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opening_balance: val }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashier"] });
      setEditingBalance(false);
      toast({ title: "تم حفظ الرصيد الافتتاحي" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل حفظ الرصيد", variant: "destructive" }),
  });

  function startEdit() {
    setBalanceInput(String(data?.openingBalance ?? 0));
    setEditingBalance(true);
  }

  const isPositive = (data?.balance ?? 0) >= 0;
  const isAllView = data?.scope === "all";

  return (
    <>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Landmark className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">{t("cashier.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("cashier.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={showSummary}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> {t("cashier.print")}
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {t("common.refresh")}
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
                <Calendar className="w-3 h-3" /> {t("cashier.from_date")}
              </label>
              <DateInput className={inputCls} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {t("cashier.to_date")}
              </label>
              <DateInput className={inputCls} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
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
            <span>{t("cashier.loading")}</span>
          </div>
        ) : data && data.incoming && data.outgoing ? (
          <>
            {/* Opening Balance — admin only */}
            {user?.role === 'admin' && <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-slate-500" />
                  <span className="font-bold text-[15px]">{t("cashier.opening_balance")}</span>
                </div>
                {!editingBalance ? (
                  <button onClick={startEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-500/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => saveBalance.mutate(balanceInput)}
                      disabled={saveBalance.isPending}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      {saveBalance.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingBalance(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {editingBalance ? (
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className={inputCls + " text-center font-black text-xl"}
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value)}
                  autoFocus
                  dir="ltr"
                  placeholder="0"
                />
              ) : (
                <div className="text-center py-1">
                  <span className="text-3xl font-black text-foreground" dir="ltr">{fmtN(data.openingBalance)}</span>
                  <span className="text-base text-muted-foreground mr-2">{currency}</span>
                </div>
              )}
            </div>}

            {/* Carry-forward (remaining before fromDate) */}
            <div className="bg-card border border-sky-500/20 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                <History className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[15px] text-foreground">{t("cashier.carry_forward")}</div>
                <div className="text-xs text-muted-foreground">{t("cashier.opening_balance")} + {fmtDate(filterFrom)}</div>
              </div>
              <span className="text-xl font-black text-sky-600" dir="ltr">{fmtN(data.carryForward)}</span>
            </div>

            {/* Incoming */}
            <div className="bg-card border border-emerald-500/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-emerald-500/8 px-5 py-3 flex items-center gap-2 border-b border-emerald-500/20">
                <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-black text-[15px] text-emerald-700 dark:text-emerald-400">{t("cashier.incoming")}</span>
                <span className="mr-auto text-[15px] font-black text-emerald-600" dir="ltr">+ {fmtN(data.incoming.total)} <span className="text-xs font-normal text-muted-foreground">{currency}</span></span>
              </div>
              <div className="divide-y divide-border/50">
                <CashRow icon={<ShoppingCart className="w-4 h-4 text-emerald-600" />} label={t("cashier.sales_cash")} value={data.incoming.salesCash} color="emerald" onPrint={() => showDetail("salesCash", false)} printLoading={printing.has("salesCash")} />
                <CashRow icon={<Users className="w-4 h-4 text-cyan-600" />} label={t("cashier.customer_receipts")} value={data.incoming.customerReceipts} color="cyan" onPrint={() => showDetail("customerReceipts", false)} printLoading={printing.has("customerReceipts")} />
                <CashRow icon={<Undo2 className="w-4 h-4 text-lime-600" />} label={t("cashier.supplier_returns")} value={data.incoming.supplierReturns} color="lime" onPrint={() => showDetail("supplierReturns", false)} printLoading={printing.has("supplierReturns")} />
                <CashRow icon={<Truck className="w-4 h-4 text-emerald-600" />} label={t("cashier.supplier_received")} value={data.incoming.supplierReceived} color="emerald" onPrint={() => showDetail("supplierReceived", false)} printLoading={printing.has("supplierReceived")} />
                <CashRow icon={<TrendingUp className="w-4 h-4 text-teal-500" />} label={t("cashier.owner_returns")} value={data.incoming.ownerReturns} color="teal" onPrint={() => showDetail("ownerReturns", false)} printLoading={printing.has("ownerReturns")} />
              </div>
            </div>

            {/* Outgoing */}
            <div className="bg-card border border-red-500/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-red-500/8 px-5 py-3 flex items-center gap-2 border-b border-red-500/20">
                <ArrowUpCircle className="w-5 h-5 text-red-500" />
                <span className="font-black text-[15px] text-red-600 dark:text-red-400">{t("cashier.outgoing")}</span>
                <span className="mr-auto text-[15px] font-black text-red-500" dir="ltr">- {fmtN(data.outgoing.total)} <span className="text-xs font-normal text-muted-foreground">{currency}</span></span>
              </div>
              <div className="divide-y divide-border/50">
                <CashRow icon={<Users className="w-4 h-4 text-rose-500" />} label={t("cashier.customer_paid")} value={data.outgoing.customerPaid} color="rose" negative onPrint={() => showDetail("customerPaid", true)} printLoading={printing.has("customerPaid")} />
                <CashRow icon={<ShoppingCart className="w-4 h-4 text-orange-500" />} label={t("cashier.purchases_cash")} value={data.outgoing.purchasesCash} color="orange" negative onPrint={() => showDetail("purchasesCash", true)} printLoading={printing.has("purchasesCash")} />
                <CashRow icon={<Truck className="w-4 h-4 text-slate-500" />} label={t("cashier.supplier_paid")} value={data.outgoing.supplierPaid} color="slate" negative onPrint={() => showDetail("supplierPaid", true)} printLoading={printing.has("supplierPaid")} />
                <CashRow icon={<Wallet className="w-4 h-4 text-red-500" />} label={t("cashier.expenses")} value={data.outgoing.expenses} color="red" negative onPrint={() => showDetail("expenses", true)} printLoading={printing.has("expenses")} />
                <CashRow icon={<TrendingDown className="w-4 h-4 text-violet-600" />} label={t("cashier.owner_withdrawals")} value={data.outgoing.ownerWithdrawals} color="violet" negative onPrint={() => showDetail("ownerWithdrawals", true)} printLoading={printing.has("ownerWithdrawals")} />
              </div>
            </div>

            {/* Net Balance — big card */}
            <div className={`rounded-2xl overflow-hidden shadow-lg border-2 ${isPositive ? "border-emerald-500/40 bg-gradient-to-br from-emerald-600 to-emerald-700" : "border-red-500/40 bg-gradient-to-br from-red-600 to-red-700"}`}>
              <div className="px-6 py-6 text-white text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Landmark className="w-5 h-5 opacity-80" />
                  <span className="text-sm font-bold opacity-80">{t("cashier.remaining")}</span>
                </div>
                <div className="text-5xl font-black mt-2" dir="ltr">{fmtN(data.balance)}</div>
                <div className="text-sm opacity-75 mt-1">{t("cashier.iqd")}</div>

                {/* formula */}
                <div className="mt-5 bg-white/10 rounded-xl px-4 py-3 text-xs text-white/80 space-y-1 text-start" dir="rtl">
                  <div className="flex justify-between">
                    <span>{t("cashier.remaining_before")}</span>
                    <span dir="ltr" className="font-bold text-white">{fmtN(data.carryForward)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-200">
                    <span>{t("cashier.plus_incoming")}</span>
                    <span dir="ltr" className="font-bold">{fmtN(data.incoming.total)}</span>
                  </div>
                  <div className="flex justify-between text-red-200">
                    <span>{t("cashier.minus_outgoing")}</span>
                    <span dir="ltr" className="font-bold">{fmtN(data.outgoing.total)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-1 flex justify-between font-black text-white">
                    <span>{t("cashier.equals")}</span>
                    <span dir="ltr">{fmtN(data.balance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-branch report (all-branches view only) */}
            {isAllView && data.byBranch && data.byBranch.length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 flex items-center gap-2 border-b border-border bg-muted/30">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <span className="font-black text-[15px] text-foreground">{t("cashier.by_branch")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="bg-muted/20 text-muted-foreground">
                        <th className="px-3 py-2.5 font-semibold text-start">{t("cashier.branch_col")}</th>
                        <th className="px-3 py-2.5 font-semibold text-end">{t("cashier.before_first")}</th>
                        <th className="px-3 py-2.5 font-semibold text-end">{t("cashier.received_col")}</th>
                        <th className="px-3 py-2.5 font-semibold text-end">{t("cashier.paid_col")}</th>
                        <th className="px-3 py-2.5 font-semibold text-end">{t("cashier.remaining_col")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.byBranch.map((b) => (
                        <tr key={b.branchId ?? "none"} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5 font-bold text-foreground">{b.branchName}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr">{fmtN(b.carryForward)}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-emerald-600" dir="ltr">{fmtN(b.incomingTotal)}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-red-500" dir="ltr">{fmtN(b.outgoingTotal)}</td>
                          <td className={`px-3 py-2.5 text-end tabular-nums font-black ${b.balance >= 0 ? "text-emerald-600" : "text-red-500"}`} dir="ltr">{fmtN(b.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {user?.role === 'admin' && (
                      <tr className="bg-muted/40 font-black border-t-2 border-border">
                        <td className="px-3 py-2.5 text-foreground">{t("cashier.general_opening")}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr" colSpan={3}>{fmtN(data.openingBalance)}</td>
                        <td className="px-3 py-2.5"></td>
                      </tr>
                      )}
                      <tr className="bg-amber-500/10 font-black">
                        <td className="px-3 py-2.5 text-foreground">{t("cashier.grand_total")}</td>
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5 text-end tabular-nums text-emerald-600" dir="ltr">{fmtN(data.incoming.total)}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums text-red-500" dir="ltr">{fmtN(data.outgoing.total)}</td>
                        <td className={`px-3 py-2.5 text-end tabular-nums ${data.balance >= 0 ? "text-emerald-600" : "text-red-500"}`} dir="ltr">{fmtN(data.balance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">{t("common.no_data")}</div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" dir="rtl">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border shadow-sm shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-bold text-base">{previewModal.label}</span>
            </div>
            <button
              onClick={() => {
                if (!requireReportPrinter()) return;
                printHtmlDirect(previewModal.html);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              {t("common.print")}
            </button>
            <button
              onClick={() => setPreviewModal(null)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* A4 Preview area */}
          <div className="flex-1 overflow-auto bg-gray-200 dark:bg-zinc-800 p-6 flex justify-center">
            <iframe
              srcDoc={previewModal.html}
              title="معاينة التقرير"
              style={{ width: 794, minHeight: 1123, border: "none", background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.18)" }}
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
  const { fmtMoney } = useAppSettings();
  const textColor = negative
    ? "text-red-500"
    : color === "emerald" ? "text-emerald-600"
    : color === "cyan" ? "text-cyan-600"
    : color === "lime" ? "text-lime-600"
    : color === "teal" ? "text-teal-600"
    : "text-muted-foreground";

  return (
    <>
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
            title="طباعة تفصيلي A4"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 border border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all shadow-sm disabled:opacity-40"
          >
            {printLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Printer className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
    </>
  );
}
