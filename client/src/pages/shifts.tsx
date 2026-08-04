import React, { useState, useEffect } from "react";
import { useLang } from '@/sm/contexts/LanguageContext';
import { useBranch } from '@/sm/contexts/BranchContext';
import { resolveStoreIdentity } from "@/sm/lib/print-store";
import { DateInput } from "@/sm/components/DateInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/sm/contexts/AuthContext";
import { usePermissions } from "@/sm/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { requireInvoicePrinter, requireReportPrinter } from "@/sm/lib/printers";
import { printHtmlDirect } from "@/sm/lib/print-html-direct";
import {
  Clock, Play, Lock, Trash2, ChevronDown, ChevronUp, X, Loader2,
  User, Calendar, Banknote, CreditCard, Receipt, TrendingUp, Tag, Wallet, Users,
  Printer, FileText, AlertTriangle, RotateCcw
} from "lucide-react";

import { fmtN as _fmtBase, fetchJson, fetchOk } from "@/sm/lib/utils";
import { useAppSettings } from "@/sm/contexts/AppSettingsContext";
function fmtN(n: number) { return _fmtBase(Math.abs(n)); }

function fmtDT(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Shift = {
  id: number;
  userId: number | null;
  userName: string | null;
  branchId: number | null;
  status: string;
  openingAmount: number;
  startTime: string;
  endTime: string | null;
  totalSales: number;
  totalDiscounts: number;
  totalCash: number;
  totalCard: number;
  totalCredit: number;
  totalNet: number;
  notes: string | null;
};

type AppUser = { id: number; username: string; fullName: string | null; role: string; isActive?: boolean; branchId?: number | null };

const ROLE_LABELS_AR: Record<string, string> = { admin: "مدير النظام", manager: "مدير", supervisor: "مشرف", cashier: "كاشير", warehouse: "أمين المستودع" };
const roleLabelAr = (role?: string | null) => (role && ROLE_LABELS_AR[role]) || "مستخدم";

/* الصافي = (مبلغ قبل الوردية + مجموع المبيعات) − (الخصومات + نقد + كارت + آجل). */
function shiftNet(s: Shift): number {
  return (s.openingAmount + s.totalSales) - (s.totalDiscounts + s.totalCash + s.totalCard + s.totalCredit);
}

/* HTML escape for print-window injection. */
function escHtml(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));
}

/* Branch-first store identity: overlay the selected branch's name/logo/phone/address
   onto the settings map used by the shift report builders. */
function brandedSettings(
  settings: Record<string, string>,
  branch: Parameters<typeof resolveStoreIdentity>[0],
): Record<string, string> {
  const id = resolveStoreIdentity(branch, {
    name: settings["store_name"],
    logo: settings["store_logo"],
    phone: settings["store_phone"],
    address: settings["store_address"],
  });
  return {
    ...settings,
    store_name: id.name,
    store_logo: id.logo,
    store_phone: id.phone,
    store_address: id.address,
  };
}

/* Build the 80mm thermal HTML for a shift summary report (totals only). */
function buildShiftReportHtml(
  shift: Shift, settings: Record<string, string>, currency: string,
): string {
  const storeName   = escHtml(settings["store_name"]    || "المتجر");
  const storePhone  = escHtml(settings["store_phone"]   || "");
  const storeAddr   = escHtml(settings["store_address"] || "");
  const storeFooter = escHtml(settings["invoice_footer"]|| "");
  const rawLogo     = settings["store_logo"] || "";
  const logoOk      = /^(https?:|data:image\/)/i.test(rawLogo);
  const cur = escHtml(currency);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n));

  const row = (label: string, value: number) =>
    `<div class="row"><span class="lbl">${escHtml(label)}</span><span class="val">${fmt(value)} ${cur}</span></div>`;

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>تقرير الوردية</title>
<style>
@page{size:80mm auto;margin:3mm 2mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#000;background:#fff;width:76mm;direction:rtl}
.header{text-align:center;padding:4px 0 2px}
.logo{max-width:50mm;max-height:26mm;object-fit:contain;display:block;margin:0 auto 4px}
.store-name{font-size:18px;font-weight:900;letter-spacing:.5px;margin-bottom:2px}
.store-phone{font-size:12px;direction:ltr;color:#333}
.sep-double{border-top:3px double #000;margin:5px 0}
.sep-single{border-top:1px solid #000;margin:4px 0}
.sep-dash{border-top:1px dashed #555;margin:3px 0}
.inv-badge{text-align:center;font-size:15px;font-weight:900;padding:3px 0}
.cashier-row{text-align:center;font-size:12px;color:#444;padding:1px 0}
.meta-grid{display:flex;justify-content:space-between;font-size:12px;padding:1px 0}
.scope{text-align:center;font-size:11px;color:#a15c00;padding:1px 0}
.section-title{font-size:13px;font-weight:900;margin:4px 0 2px;padding:2px 4px;background:#eee;border-radius:2px}
.row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:13px}
.row.strong{font-weight:900;border-top:1px solid #000;margin-top:2px;padding-top:4px}
.row .lbl{color:#222}
.row .val{direction:ltr;font-weight:700}
.sub{display:flex;justify-content:space-between;font-size:12px;color:#555;padding:0 0 1px 8px}
.sub .val{direction:ltr}
.total-net{display:flex;justify-content:space-between;align-items:center;background:#000;color:#fff;padding:5px 6px;margin:4px -2px;border-radius:2px}
.total-net .lbl{color:#fff;font-size:14px;font-weight:900}
.total-net .val{color:#fff;font-size:15px;font-weight:900;direction:ltr}
.footer{text-align:center;margin-top:4px}
.footer-address{font-size:12px;font-weight:700;margin-bottom:2px}
.footer-msg{font-size:12px;color:#444;font-style:italic}
@media print{body{width:76mm}@page{size:80mm auto;margin:3mm 2mm}}
</style></head><body>

<div class="header">
  ${logoOk ? `<img src="${escHtml(rawLogo)}" class="logo" alt="">` : ""}
  <div class="store-name">${storeName}</div>
  ${storePhone ? `<div class="store-phone">&#x1F4DE; <b>${storePhone}</b></div>` : ""}
</div>

<div class="sep-double"></div>

<div class="inv-badge">&#x1F4CB; تقرير الوردية</div>
<div class="cashier-row">&#x1F464; <b>${escHtml(shift.userName || "—")}</b></div>
<div class="meta-grid">
  <span>${escHtml(fmtDT(shift.startTime))}</span>
  <span>${shift.status === "closed" ? "مقفولة" : "مفتوحة"}</span>
</div>
${shift.endTime ? `<div class="meta-grid"><span>النهاية:</span><span>${escHtml(fmtDT(shift.endTime))}</span></div>` : ""}

<div class="sep-single"></div>

${row("مبلغ قبل الوردية", shift.openingAmount)}
${row("مجموع المبيعات", shift.totalSales)}
${row("مجموع الخصومات", shift.totalDiscounts)}
${row("مبالغ واصلة (نقد)", shift.totalCash)}
${row("مبالغ واصلة (كارت)", shift.totalCard)}
${row("مبيعات آجل", shift.totalCredit)}

<div class="total-net">
  <span class="lbl">&#x2714; المجموع الكلي الصافي</span>
  <span class="val">${shiftNet(shift) < 0 ? "- " : ""}${fmt(shiftNet(shift))} ${cur}</span>
</div>

<div class="sep-double"></div>

<div class="footer">
  ${storeAddr ? `<div class="footer-address">&#x1F4CD; ${storeAddr}</div>` : ""}
  ${storeFooter ? `<div class="footer-msg">${storeFooter}</div>` : ""}
</div>
<br>
<script>window.onload=function(){document.fonts.ready.then(function(){window.print();window.onafterprint=function(){window.close()}})}</script>
</body></html>`;
}

/* Build a professional A4 HTML shift summary report (totals only). */
function buildShiftReportA4Html(
  shift: Shift, settings: Record<string, string>, currency: string,
): string {
  const storeName   = escHtml(settings["store_name"]    || "المتجر");
  const storePhone  = escHtml(settings["store_phone"]   || "");
  const storeAddr   = escHtml(settings["store_address"] || "");
  const storeFooter = escHtml(settings["invoice_footer"]|| "");
  const rawLogo     = settings["store_logo"] || "";
  const logoOk      = /^(https?:|data:image\/)/i.test(rawLogo);
  const cur = escHtml(currency);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n));
  const now = new Date();
  const genStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const statusAr = shift.status === "closed" ? "مقفولة" : "مفتوحة";

  const stat = (label: string, value: number, accent: string, bg: string, icon: string, wide = false) =>
    `<div class="stat${wide ? " wide" : ""}" style="--accent:${accent};--bg:${bg}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-body">
        <div class="stat-label">${escHtml(label)}</div>
        <div class="stat-value">${fmt(value)} <span class="cur">${cur}</span></div>
      </div>
    </div>`;

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>تقرير الوردية - A4</title>
<style>
@page{size:A4;margin:0.2cm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#0f172a;background:#fff;direction:rtl}
.page{width:210mm;min-height:297mm;padding:18mm 16mm;margin:0 auto;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid #0f766e;padding-bottom:16px}
.brand{display:flex;align-items:center;gap:14px}
.brand img{max-width:88px;max-height:88px;object-fit:contain}
.brand .name{font-size:26px;font-weight:900;letter-spacing:.3px}
.brand .contact{font-size:12px;color:#475569;margin-top:4px;line-height:1.7}
.brand .contact span{direction:ltr;display:inline-block}
.doc-title{text-align:left}
.doc-title .h{font-size:22px;font-weight:900;color:#0f766e}
.doc-title .s{font-size:12px;color:#64748b;margin-top:4px}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}
.meta .m{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}
.meta .m .k{font-size:11px;color:#64748b;font-weight:700;margin-bottom:5px}
.meta .m .v{font-size:14px;font-weight:800}
.badge{display:inline-block;font-size:12px;font-weight:800;padding:3px 12px;border-radius:999px}
.badge.open{background:#dcfce7;color:#15803d}
.badge.closed{background:#fee2e2;color:#b91c1c}
.section-h{font-size:15px;font-weight:900;margin:8px 0 14px;display:flex;align-items:center;gap:8px}
.section-h::before{content:"";width:5px;height:18px;background:#0f766e;border-radius:3px}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.stat{display:flex;align-items:center;gap:14px;border:1px solid #e2e8f0;border-right:5px solid var(--accent);border-radius:14px;padding:16px 18px}
.stat.wide{grid-column:1 / -1}
.stat-icon{font-size:24px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--bg);border-radius:12px;flex-shrink:0}
.stat-body{flex:1}
.stat-label{font-size:13px;color:#64748b;font-weight:700;margin-bottom:6px}
.stat-value{font-size:20px;font-weight:900;direction:ltr;text-align:right}
.stat-value .cur{font-size:12px;color:#94a3b8;font-weight:700}
.net{margin-top:20px;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;border-radius:16px;padding:22px 26px}
.net .lbl{font-size:18px;font-weight:900}
.net .val{font-size:30px;font-weight:900;direction:ltr}
.foot{margin-top:auto;padding-top:18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
.foot .left{font-size:12px;color:#475569;line-height:1.8}
.foot .msg{font-size:12px;color:#0f766e;font-style:italic;font-weight:700;margin-bottom:4px}
.foot .gen{font-size:11px;color:#94a3b8;white-space:nowrap}
@media print{.page{margin:0;padding:16mm 14mm}}
</style></head><body>
<div class="page">
  <div class="top">
    <div class="brand">
      ${logoOk ? `<img src="${escHtml(rawLogo)}" alt="">` : ""}
      <div>
        <div class="name">${storeName}</div>
        <div class="contact">
          ${storePhone ? `📞 <span>${storePhone}</span><br>` : ""}
          ${storeAddr ? `📍 ${storeAddr}` : ""}
        </div>
      </div>
    </div>
    <div class="doc-title">
      <div class="h">تقرير الوردية</div>
      <div class="s">رقم الوردية: #${shift.id}</div>
    </div>
  </div>

  <div class="meta">
    <div class="m"><div class="k">الموظف / الكاشير</div><div class="v">${escHtml(shift.userName || "—")}</div></div>
    <div class="m"><div class="k">الحالة</div><div class="v"><span class="badge ${shift.status === "closed" ? "closed" : "open"}">${statusAr}</span></div></div>
    <div class="m"><div class="k">بداية الوردية</div><div class="v">${escHtml(fmtDT(shift.startTime))}</div></div>
    <div class="m"><div class="k">نهاية الوردية</div><div class="v">${shift.endTime ? escHtml(fmtDT(shift.endTime)) : "—"}</div></div>
  </div>

  <div class="section-h">ملخص حركة الوردية</div>
  <div class="stats">
    ${stat("مبلغ قبل الوردية", shift.openingAmount, "#0ea5e9", "#f0f9ff", "🏦")}
    ${stat("مجموع المبيعات", shift.totalSales, "#3b82f6", "#eff6ff", "📈")}
    ${stat("مجموع الخصومات", shift.totalDiscounts, "#f59e0b", "#fffbeb", "🏷️")}
    ${stat("مبالغ واصلة (نقد)", shift.totalCash, "#10b981", "#ecfdf5", "💵")}
    ${stat("مبالغ واصلة (كارت)", shift.totalCard, "#8b5cf6", "#f5f3ff", "💳")}
    ${stat("مبيعات آجل", shift.totalCredit, "#f43f5e", "#fff1f2", "🧾")}
  </div>

  <div class="net">
    <span class="lbl">المجموع الكلي الصافي</span>
    <span class="val">${shiftNet(shift) < 0 ? "- " : ""}${fmt(shiftNet(shift))} ${cur}</span>
  </div>

  <div class="foot">
    <div class="left">
      ${storeFooter ? `<div class="msg">${storeFooter}</div>` : ""}
      ${storeAddr ? `📍 ${storeAddr}` : ""}
    </div>
    <div class="gen">صدر بتاريخ: ${escHtml(genStr)}</div>
  </div>
</div>
<script>window.onload=function(){document.fonts.ready.then(function(){window.print();window.onafterprint=function(){window.close()}})}</script>
</body></html>`;
}

export default function ShiftsPage() {
  const { t } = useLang();
  const { currency, fmtMoney } = useAppSettings();
  const { user, refreshUser } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();

  /* ── تحديث صلاحيات المستخدم عند فتح الصفحة ── */
  useEffect(() => { refreshUser(); }, []);
  const qc = useQueryClient();
  const { selectedBranchId, selectedBranch } = useBranch();

  /* ── Shift permission helpers ──
     admin / supervisor  → sees & manages ALL shifts (all branches)
     manager (branch)    → sees & manages shifts of THEIR branch only
     cashier / employee  → sees & manages ONLY their own shift */
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const isManagerRole  = user?.role === 'manager';

  /* Full access = admin/supervisor or explicitly granted 'all' shift permission */
  const isFullShiftAccess = isGlobalAdmin || user?.shiftPermission === 'all';

  /* Own-only = not full access, not branch manager, has shift permission or create perm */
  const isOwnShiftOnly = !isFullShiftAccess && !isManagerRole && (
    user?.shiftPermission === 'own' || can('shifts', 'create')
  );

  const canOpenShifts = isFullShiftAccess || isManagerRole || isOwnShiftOnly;

  function canManageShift(shift: { userId: number | null; branchId?: number | null }) {
    if (isFullShiftAccess) return true;
    if (isManagerRole) return shift.branchId === user?.branchId;
    if (isOwnShiftOnly) return shift.userId === user?.id;
    return false;
  }

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [filterUserId, setFilterUserId] = useState<number | "">("");
  const [showStart, setShowStart] = useState(false);
  const [closeTargetId, setCloseTargetId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [startNote, setStartNote] = useState("");
  const [startDateInput, setStartDateInput] = useState(todayStr());
  const [startTimeInput, setStartTimeInput] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  });

  /* Auto-tick shift-start time while form is open */
  useEffect(() => {
    if (!showStart) return;
    const id = setInterval(() => {
      const d = new Date();
      setStartTimeInput(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(id);
  }, [showStart]);

  /* ── Store settings ── */
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const arr = await fetchJson<{ key: string; value: string }[]>("/api/settings");
      return Object.fromEntries(arr.map(s => [s.key, s.value]));
    },
    staleTime: 60_000,
  });

  /* ── Users list ── */
  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      return fetchJson("/api/users");
    },
  });

  /* ── Role aliases for applyRoleFilter ── */
  const isGlobalRole = isGlobalAdmin;
  const isCashierRole = !isGlobalAdmin && !isManagerRole;

  /* ── All open shifts ── */
  const { data: rawOpenShifts = [] } = useQuery<Shift[]>({
    queryKey: ["shifts-open-all", selectedBranchId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedBranchId !== null) p.set("branchId", String(selectedBranchId));
      const url = p.toString() ? `/api/shifts/open?${p.toString()}` : "/api/shifts/open";
      const data = await fetchJson(url);
      return Array.isArray(data) ? data : (data ? [data] : []);
    },
    refetchInterval: 8000,
  });

  /* ── All shifts by date ── */
  const { data: rawShifts = [] } = useQuery<Shift[]>({
    queryKey: ["shifts", dateFrom, dateTo, selectedBranchId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (dateFrom) p.set("from", dateFrom);
      if (dateTo) p.set("to", dateTo);
      if (selectedBranchId !== null) p.set("branchId", String(selectedBranchId));
      return fetchJson(`/api/shifts?${p.toString()}`);
    },
  });

  /* ── Apply role-based visibility filter ──
     - admin/supervisor : see ALL shifts from ALL branches
     - manager          : see shifts from their branch only
     - cashier/others   : see their own shifts only */
  function applyRoleFilter(list: Shift[]): Shift[] {
    if (isGlobalRole) return list;
    if (isManagerRole) {
      if (!user?.branchId) return list;
      return list.filter(s => s.branchId === user.branchId);
    }
    // cashier / warehouse — own shifts only
    return list.filter(s => s.userId === user?.id);
  }
  const openShifts = applyRoleFilter(rawOpenShifts);
  const shifts     = applyRoleFilter(rawShifts)
    .filter(s => filterUserId === "" || s.userId === filterUserId);

  /* Cashier picker options — only meaningful for roles that see multiple users */
  const showCashierFilter = isGlobalRole || isManagerRole;
  const cashierOptions = (isManagerRole
    ? users.filter(u => u.branchId === user?.branchId && u.isActive !== false)
    : users.filter(u => u.isActive !== false));

  /* ── Invalidate all shift queries ── */
  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["shifts-open-all"] });
    qc.invalidateQueries({ queryKey: ["shifts-open"] });
    qc.invalidateQueries({ queryKey: ["shifts"] });
    qc.invalidateQueries({ queryKey: ["shifts-open-pos"] });
  }

  /* ── Start shift ── */
  const startShift = useMutation({
    mutationFn: async () => {
      let targetUserId: number;
      let targetUserName: string;

      if (isOwnShiftOnly) {
        if (!user?.id) throw new Error("بيانات المستخدم غير متوفرة");
        targetUserId = user.id;
        targetUserName = user.fullName || user.username;
      } else {
        if (!selectedUserId) throw new Error("يرجى اختيار اسم المستخدم");
        const selUser = users.find(u => u.id === selectedUserId);
        if (!selUser) throw new Error("المستخدم غير موجود");
        targetUserId = selUser.id;
        targetUserName = selUser.fullName || selUser.username;
      }

      const startTime = new Date(`${startDateInput}T${startTimeInput}`).toISOString();
      return fetchJson("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          userName: targetUserName,
          openingAmount: parseFloat(openingAmount) || 0,
          notes: startNote,
          startTime,
        }),
      });
    },
    onSuccess: () => {
      invalidateAll();
      setShowStart(false);
      setSelectedUserId("");
      setOpeningAmount("");
      setStartNote("");
      toast({ title: "تم بدء الوردية", description: "الوردية مفتوحة الآن" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  /* ── Close shift ── */
  const closeShift = useMutation({
    mutationFn: async (id: number) => {
      return fetchJson(`/api/shifts/${id}/close`, { method: "PUT" });
    },
    onSuccess: () => {
      invalidateAll();
      setCloseTargetId(null);
      toast({ title: "تم قفل الوردية", description: "تم إغلاق الوردية وحساب المجاميع" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  /* ── Delete shift ── */
  const deleteShift = useMutation({
    mutationFn: async (id: number) => {
      await fetchOk(`/api/shifts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteTargetId(null);
      toast({ title: "تم الحذف" });
    },
  });

  /* ── Print a shift summary report (totals only) ──
     Popup-safe: window is opened and filled synchronously. Two layouts:
     80mm thermal and a professional A4 page. ── */
  const openPrintWindow = (html: string, width: number) => {
    const win = window.open("", "_blank", `width=${width},height=720,scrollbars=yes`);
    if (!win) {
      toast({ title: "خطأ", description: "السماح بالنوافذ المنبثقة مطلوب للطباعة", variant: "destructive" });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };
  const printShiftThermal = (shift: Shift) => {
    if (!requireInvoicePrinter()) return;
    /* طباعة حرارية مباشرة إلى طابعة الفواتير عبر QZ Tray (إن هُيّئت)، وإلا إطار مخفٍّ. */
    printHtmlDirect(buildShiftReportHtml(shift, brandedSettings(settings, selectedBranch), currency), { printerKey: "invoice" });
  };
  const printShiftA4 = (shift: Shift) => {
    if (!requireReportPrinter()) return;
    printHtmlDirect(buildShiftReportA4Html(shift, brandedSettings(settings, selectedBranch), currency));
  };

  const shiftToClose = closeTargetId !== null ? (
    shifts.find(s => s.id === closeTargetId) || openShifts.find(s => s.id === closeTargetId)
  ) : null;

  const inputCls = "w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  return (
    <div className="p-4 md:p-8 space-y-6 w-full" dir="rtl">

      {/* ══ HEADER ══ */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{t("shift.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("shift.subtitle")}</p>
          </div>
        </div>

        {canOpenShifts && (
          <button
            onClick={() => setShowStart(true)}
            className="flex items-center gap-3 px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xl shadow-lg transition-all active:scale-95"
          >
            <Play className="w-7 h-7" /> {t("shift.start_new")}
          </button>
        )}
      </div>

      {/* ══ OPEN SHIFTS BANNERS ══ */}
      {openShifts.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-bold text-muted-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("shift.open_now")} ({openShifts.length})
          </p>
          {openShifts.map(os => (
            <div key={os.id} className="flex flex-wrap items-center gap-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl px-6 py-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-base">{t("shift.open_status")}</span>
              </div>
              <div className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="font-bold text-foreground">{os.userName}</span>
              </div>
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>{fmtDT(os.startTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <Wallet className="w-5 h-5" />
                <span>{t("shift.start_from")} <b dir="ltr">{fmtN(os.openingAmount)}</b> {currency}</span>
              </div>
              <div className="flex-1" />
              {canManageShift(os) && (
                <button
                  onClick={() => setCloseTargetId(os.id)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-base font-bold bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 transition-colors"
                >
                  <Lock className="w-5 h-5" /> {t("shift.lock_shift")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ FILTERS: date range + cashier ══ */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-card border-2 border-border rounded-2xl px-6 py-4">
        <Calendar className="w-6 h-6 text-muted-foreground shrink-0" />
        <label className="text-base font-semibold text-muted-foreground">{t("shift.from_date")}</label>
        <DateInput
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          sizeClassName="border-2 border-border rounded-xl px-4 py-2.5 text-base bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <label className="text-base font-semibold text-muted-foreground">{t("shift.to_date")}</label>
        <DateInput
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          sizeClassName="border-2 border-border rounded-xl px-4 py-2.5 text-base bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />

        {showCashierFilter && (
          <>
            <label className="text-base font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="w-5 h-5" /> {t("shift.cashier_filter")}
            </label>
            <select
              value={filterUserId === "" ? "" : String(filterUserId)}
              onChange={e => setFilterUserId(e.target.value === "" ? "" : Number(e.target.value))}
              className="border-2 border-border rounded-xl px-4 py-2.5 text-base bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">{t("shift.all_cashiers")}</option>
              {cashierOptions.map(u => (
                <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
              ))}
            </select>
          </>
        )}

        {(dateFrom !== todayStr() || dateTo !== todayStr() || filterUserId !== "") && (
          <button
            onClick={() => { setDateFrom(todayStr()); setDateTo(todayStr()); setFilterUserId(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-border bg-background text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> {t("shift.reset")}
          </button>
        )}

        <span className="text-base font-semibold text-muted-foreground ms-auto">{shifts.length} {t("shift.shift_unit")}</span>
      </div>

      {/* ══ SHIFTS LIST ══ */}
      <div className="space-y-4">
        {shifts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
            <Clock className="w-16 h-16 mb-4" />
            <p className="text-xl font-semibold">{t("shift.no_shifts")}</p>
          </div>
        )}

        {shifts.map(shift => {
          const isExpanded = expandedId === shift.id;
          const isClosed = shift.status === "closed";

          return (
            <div key={shift.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${isClosed ? "border-border bg-card" : "border-emerald-500/40 bg-emerald-500/5"}`}>

              {/* Row header */}
              <div className="flex flex-wrap items-center gap-4 px-6 py-5">

                {/* Status badge */}
                <span className={`px-4 py-1.5 rounded-full text-base font-bold ${isClosed ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-700"}`}>
                  {isClosed ? t("shift.closed") : t("shift.open")}
                </span>

                {/* User */}
                <div className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="font-bold">{shift.userName || "—"}</span>
                </div>

                {/* Start */}
                <div className="flex items-center gap-2 text-base text-muted-foreground">
                  <Play className="w-5 h-5 text-emerald-600" />
                  <span>{fmtDT(shift.startTime)}</span>
                </div>

                {/* End */}
                {isClosed && (
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Lock className="w-5 h-5 text-amber-500" />
                    <span>{fmtDT(shift.endTime)}</span>
                  </div>
                )}

                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle summary */}
                  <button
                    title={isExpanded ? t("shift.hide_summary") : t("shift.show_summary")}
                    onClick={() => setExpandedId(isExpanded ? null : shift.id)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isExpanded ? "bg-blue-500/20 text-blue-600" : "text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
                    }`}
                  >
                    {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </button>

                  {/* Print — 58mm thermal */}
                  <button
                    title={t("shift.print_thermal")}
                    onClick={() => printShiftThermal(shift)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
                  >
                    <Printer className="w-6 h-6" />
                  </button>

                  {/* Print — A4 */}
                  <button
                    title={t("shift.print_a4")}
                    onClick={() => printShiftA4(shift)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-teal-500/10 hover:text-teal-600 transition-colors"
                  >
                    <FileText className="w-6 h-6" />
                  </button>

                  {/* Close shift */}
                  {!isClosed && canManageShift(shift) && (
                    <button
                      onClick={() => setCloseTargetId(shift.id)}
                      disabled={closeShift.isPending}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-base font-bold bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 transition-colors"
                    >
                      <Lock className="w-5 h-5" /> {t("shift.lock")}
                    </button>
                  )}

                  {/* Delete — full access only */}
                  {isFullShiftAccess && (
                    <button
                      onClick={() => setDeleteTargetId(shift.id)}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title={t("shift.delete_title")}
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>

              {/* Summary — when expanded */}
              {isExpanded && (
                <div className="border-t-2 border-border bg-muted/30 px-6 py-5">
                  <p className="text-base font-bold text-muted-foreground mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" /> {t("shift.summary_of")} {shift.userName}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <SummaryCard icon={<Wallet className="w-5 h-5 text-cyan-500" />} label={t("shift.opening_amount")} value={shift.openingAmount} color="text-cyan-700" bg="bg-cyan-50 border-cyan-200" />
                    <SummaryCard icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label={t("shift.total_sales")} value={shift.totalSales} color="text-blue-700" bg="bg-blue-50 border-blue-200" />
                    <SummaryCard icon={<Tag className="w-5 h-5 text-amber-500" />} label={t("shift.total_discounts")} value={shift.totalDiscounts} color="text-amber-700" bg="bg-amber-50 border-amber-200" />
                    <SummaryCard icon={<Banknote className="w-5 h-5 text-emerald-500" />} label={t("shift.cash_received")} value={shift.totalCash} color="text-emerald-700" bg="bg-emerald-50 border-emerald-200" />
                    <SummaryCard icon={<CreditCard className="w-5 h-5 text-violet-500" />} label={t("shift.card_received")} value={shift.totalCard} color="text-violet-700" bg="bg-violet-50 border-violet-200" />
                    <SummaryCard icon={<Receipt className="w-5 h-5 text-rose-500" />} label={t("shift.credit_sales")} value={shift.totalCredit} color="text-rose-700" bg="bg-rose-50 border-rose-200" />
                    <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                      <SummaryCard icon={<TrendingUp className="w-6 h-6 text-primary" />} label={t("shift.total_net")} value={shiftNet(shift)} color="text-primary" bg="bg-primary/10 border-primary/30" large />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══ START SHIFT DIALOG — touch-friendly ══ */}
      {showStart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => setShowStart(false)}>
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[98vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <Play className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="font-black text-2xl">{t("shift.start_new")}</h2>
              <div className="flex-1" />
              <button onClick={() => setShowStart(false)} className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* User select */}
              {isOwnShiftOnly ? (
                /* Cashier with "own" permission — auto-select themselves, read-only */
                <div>
                  <label className="text-lg font-bold text-muted-foreground mb-2 block flex items-center gap-2">
                    <User className="w-5 h-5" /> {t("shift.user_label")}
                  </label>
                  <div className="w-full border-2 border-emerald-400 rounded-2xl px-5 py-4 text-xl bg-emerald-50 font-bold text-emerald-800 flex items-center gap-3">
                    <User className="w-6 h-6" />
                    {user?.fullName || user?.username}
                    <span className="text-base font-normal text-emerald-600">{t("shift.own_shift")}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-lg font-bold text-muted-foreground mb-2 block flex items-center gap-2">
                    <User className="w-5 h-5" /> {t("shift.choose_user")}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full border-2 border-border rounded-2xl px-5 py-4 text-xl bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="">{t("shift.choose_user_opt")}</option>
                    {(isManagerRole
                      ? users.filter(u => (u.branchId === user?.branchId || u.id === user?.id) && u.isActive !== false)
                      : users.filter(u => u.isActive !== false)
                    ).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.username} — {roleLabelAr(u.role)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* تحذير وردية مفتوحة */}
              {(() => {
                const checkId = isOwnShiftOnly ? user?.id : (selectedUserId || undefined);
                return checkId && openShifts.some(s => s.userId === checkId) ? (
                  <div className="flex items-center gap-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl px-5 py-4 text-amber-700 text-lg font-semibold">
                    ⚠️ {t("shift.open_warn")}
                  </div>
                ) : null;
              })()}

              {/* التاريخ + الوقت */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-lg font-bold text-muted-foreground mb-2 block">{t("shift.start_date")}</label>
                  <DateInput
                    value={startDateInput}
                    onChange={e => setStartDateInput(e.target.value)}
                    sizeClassName="w-full border-2 border-border rounded-2xl px-5 py-4 text-xl bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-lg font-bold text-muted-foreground mb-2 block">{t("shift.start_time_lbl")}</label>
                  <input
                    type="time"
                    step="1"
                    value={startTimeInput}
                    onChange={e => setStartTimeInput(e.target.value)}
                    className="w-full border-2 border-border rounded-2xl px-5 py-4 text-xl bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* مبلغ البداية */}
              <div>
                <label className="text-lg font-bold text-muted-foreground mb-2 block">{t("shift.opening_lbl")} ({currency})</label>
                <input
                  type="number"
                  min="0"
                  value={openingAmount}
                  onChange={e => setOpeningAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border-2 border-emerald-300 rounded-2xl px-5 py-5 text-center font-black text-4xl bg-background outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  dir="ltr"
                  autoFocus
                />
              </div>

              {/* ملاحظات */}
              <div>
                <label className="text-lg font-bold text-muted-foreground mb-2 block">{t("shift.notes")}</label>
                <input
                  type="text"
                  value={startNote}
                  onChange={e => setStartNote(e.target.value)}
                  placeholder={t("shift.optional_ph")}
                  className="w-full border-2 border-border rounded-2xl px-5 py-4 text-xl bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 px-6 pb-6">
              <button onClick={() => setShowStart(false)} className="flex-1 h-16 rounded-2xl border-2 border-border font-bold text-xl text-muted-foreground hover:bg-muted transition-colors">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => startShift.mutate()}
                disabled={startShift.isPending || (!isOwnShiftOnly && !selectedUserId)}
                className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl shadow transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {startShift.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                {startShift.isPending ? t("shift.starting") : t("shift.start_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM DIALOG ══ */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTargetId(null)}>
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-10 pb-8 space-y-6">
              <div className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive/25 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-2xl">{t("shift.delete_title")}</h3>
                <p className="text-base text-muted-foreground mt-2">{t("shift.delete_msg")}</p>
                <p className="text-sm text-destructive/80 mt-1 font-semibold">{t("shift.irreversible")}</p>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 h-16 rounded-2xl border-2 border-border font-bold text-lg hover:bg-muted transition-colors"
                >
                  {t("shift.no_cancel")}
                </button>
                <button
                  onClick={() => deleteShift.mutate(deleteTargetId)}
                  disabled={deleteShift.isPending}
                  className="flex-1 h-16 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold text-lg shadow transition-all active:scale-95 disabled:opacity-60"
                >
                  {deleteShift.isPending ? t("shift.deleting") : t("shift.yes_delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CLOSE CONFIRM DIALOG ══ */}
      {closeTargetId !== null && shiftToClose && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCloseTargetId(null)}>
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-10 pb-8 space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-2xl">{t("shift.lock_dialog_title")}</h3>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="font-bold text-xl text-foreground">{shiftToClose.userName}</span>
                </div>
                <p className="text-base text-muted-foreground mt-2">{t("shift.lock_msg")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("shift.started_at")} {fmtDT(shiftToClose.startTime)}</p>
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => setCloseTargetId(null)} className="flex-1 h-16 rounded-2xl border-2 border-border font-bold text-lg hover:bg-muted transition-colors">
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => closeShift.mutate(shiftToClose.id)}
                  disabled={closeShift.isPending}
                  className="flex-1 h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow transition-all active:scale-95 disabled:opacity-60"
                >
                  {closeShift.isPending ? t("shift.locking") : t("shift.lock_btn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, value, color, bg, large = false
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  large?: boolean;
}) {
  const { fmtMoney } = useAppSettings();
  return (
    <>
    <div className={`rounded-2xl border-2 px-5 py-4 flex flex-col gap-2 ${bg}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      </div>
      <span className={`font-black tabular-nums ${large ? "text-3xl" : "text-xl"} ${color}`} dir="ltr">
        {fmtMoney(value)}
      </span>
    </div>
    </>
  );
}
