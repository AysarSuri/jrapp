import { useState, useRef, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileSearch, Loader2, ArrowDownToLine, Tag, Printer, MessageCircle, ArrowLeft, RotateCcw, Eye, Pencil, Trash2 } from "lucide-react";
import { IconExpenseEntry, IconDinar } from "@/components/erp-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { captureElementAsPdf } from "@/lib/pdf-utils";
import { formatDate } from "@/lib/format-utils";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { onDataUpdate } from "@/lib/broadcast";
import { useToast } from "@/hooks/use-toast";
import { SupplierSearchSelect } from "@/components/supplier-search-select";
import { SearchSelect } from "@/components/search-select";
import { playSuccessSound, playDeleteSound } from "@/lib/sounds";
import PurchaseInvoiceReport from "@/components/purchase-invoice-report";
import { logExport } from "@/lib/export-log";
import PurchaseReturnReport from "@/components/purchase-return-report";
import SupplierPaymentReport from "@/components/supplier-payment-report";
import SupplierAdjustmentReport from "@/components/supplier-adjustment-report";

type Client = {
  id: number;
  name: string;
  type: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
};

type StatementEntry = {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string;
  debitUsd: number;
  debitIqd: number;
  creditUsd: number;
  creditIqd: number;
  note: string | null;
  agentName?: string | null;
};

type StatementResponse = {
  supplier: Client;
  entries: StatementEntry[];
  openingBalanceIqd?: number;
  totalPurchaseGifts?: number;
  totalReturnGifts?: number;
};

type CompanyProfileData = {
  id: number;
  name: string;
  logo: string | null;
  cliche: string | null;
  primaryColor: string;
  secondaryColor: string;
};

type ProductReportRow = {
  invoiceId: number;
  invoiceNumber: string;
  type: "purchase" | "return";
  date: string;
  productName: string;
  quantity: number;
  unit: string;
  returnQuantity: number;
  price: number;
  gift: number;
};

type ProductReportResponse = {
  supplier: Client;
  rows: ProductReportRow[];
  totalQuantity: number;
  totalReturns: number;
  totalAmount: number;
  totalGifts: number;
  currency: string;
};

type ActiveTab = "general" | "invoices" | "returns" | "payments" | "adjustments" | "products_report" | "vehicle_expenses";

type VehicleExpenseRow = {
  invoiceId: number;
  invoiceNumber: string;
  date: string;
  carNumber: string;
  manifest: string;
  driverName: string;
  driverMobile: string;
  customsExpense: number;
  carExpense: number;
  invoiceAmount: number;
  amountPaid: number;
  remaining: number;
};

type VehicleExpenseResponse = {
  supplier: Client;
  rows: VehicleExpenseRow[];
  totalCustoms: number;
  totalCarExpense: number;
  totalInvoiceAmount: number;
  totalPaid: number;
  totalRemaining: number;
  currency: string;
};

export default function SupplierStatementIqdPage() {
  const { t, i18n } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const urlParams = new URLSearchParams(window.location.search);
  const [selectedSupplierId, setSelectedSupplierIdRaw] = useState<string>(urlParams.get("supplier") || "");
  const [startDate, setStartDateRaw] = useState<string>(urlParams.get("from") || firstOfMonth);
  const [endDate, setEndDateRaw] = useState<string>(urlParams.get("to") || today);
  const [activeTab, setActiveTab] = useState<ActiveTab>((urlParams.get("tab") as ActiveTab) || "general");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    return onDataUpdate((type) => {
      if (type === "supplier-statement" && selectedSupplierId) {
        queryClient.invalidateQueries({ queryKey: [`/api/supplier-statement/${selectedSupplierId}`] });
      }
    });
  }, [selectedSupplierId]);

  const updateUrl = (supplierId: string, from: string, to: string, tab: string) => {
    const params = new URLSearchParams();
    if (supplierId) params.set("supplier", supplierId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (tab && tab !== "general") params.set("tab", tab);
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };

  const setSelectedSupplierId = (val: string) => {
    setSelectedSupplierIdRaw(val);
    updateUrl(val, startDate, endDate, activeTab);
  };
  const setStartDate = (val: string) => {
    setStartDateRaw(val);
    updateUrl(selectedSupplierId, val, endDate, activeTab);
  };
  const setEndDate = (val: string) => {
    setEndDateRaw(val);
    updateUrl(selectedSupplierId, startDate, val, activeTab);
  };
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [viewEntry, setViewEntry] = useState<(StatementEntry & { balanceIqd?: number }) | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<StatementEntry | null>(null);
  const [viewDetails, setViewDetails] = useState<any>(null);
  const [viewDetailsLoading, setViewDetailsLoading] = useState(false);
  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [returnReportId, setReturnReportId] = useState<number | null>(null);
  const [returnReportOpen, setReturnReportOpen] = useState(false);
  const [paymentReportId, setPaymentReportId] = useState<number | null>(null);
  const [paymentReportOpen, setPaymentReportOpen] = useState(false);
  const [adjustmentReportId, setAdjustmentReportId] = useState<number | null>(null);
  const [adjustmentReportOpen, setAdjustmentReportOpen] = useState(false);
  const [deleteReportEntry, setDeleteReportEntry] = useState<{ id: number; type: "purchase" | "return"; description: string } | null>(null);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const suppliers = clients?.filter((c) => c.type === "supplier") || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: [`/api/supplier-statement/${selectedSupplierId}${startDate || endDate ? `?startDate=${startDate}&endDate=${endDate}` : ""}`],
    enabled: !!selectedSupplierId,
  });

  const { data: productsReport, isLoading: productsReportLoading } = useQuery<ProductReportResponse>({
    queryKey: [`/api/supplier-products-report/${selectedSupplierId}?currency=IQD${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`],
    enabled: !!selectedSupplierId && activeTab === "products_report",
  });

  const { data: vehicleExpenses, isLoading: vehicleExpensesLoading } = useQuery<VehicleExpenseResponse>({
    queryKey: [`/api/supplier-vehicle-expenses/${selectedSupplierId}?currency=IQD${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`],
    enabled: !!selectedSupplierId && activeTab === "vehicle_expenses",
  });

  const getDeleteUrl = (entry: StatementEntry) => {
    switch (entry.type) {
      case "purchase_invoice": return `/api/purchase-invoices/${entry.id}`;
      case "return_invoice": return `/api/purchase-returns/${entry.id}`;
      case "payment": return `/api/supplier-payments/${entry.id}`;
      case "adjustment_received":
      case "adjustment_discount": return `/api/supplier-adjustments/${entry.id}`;
      default: return null;
    }
  };

  const getViewUrl = (entry: StatementEntry) => {
    switch (entry.type) {
      case "purchase_invoice": return `/api/purchase-invoices/${entry.id}`;
      case "return_invoice": return `/api/purchase-returns/${entry.id}`;
      case "payment": return `/api/supplier-payments/${entry.id}`;
      case "adjustment_received":
      case "adjustment_discount": return `/api/supplier-adjustments/${entry.id}`;
      default: return null;
    }
  };

  const getEditRoute = (entry: StatementEntry) => {
    switch (entry.type) {
      case "purchase_invoice": return `/purchase-invoice-iqd?edit=${entry.id}`;
      case "return_invoice": return `/purchase-return-iqd?edit=${entry.id}`;
      case "payment": return `/supplier-payments?edit=${entry.id}`;
      case "adjustment_received":
      case "adjustment_discount": return `/supplier-adjustments?edit=${entry.id}`;
      default: return null;
    }
  };

  const handleView = async (entry: StatementEntry & { balanceIqd?: number }) => {
    setViewEntry(entry);
    setViewDetailsLoading(true);
    const url = getViewUrl(entry);
    if (url) {
      try {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        if (entry.type === "purchase_invoice") {
          const itemsRes = await fetch(`/api/purchase-invoices/${entry.id}/items`, { credentials: "include" });
          data.items = await itemsRes.json();
        } else if (entry.type === "return_invoice") {
          const itemsRes = await fetch(`/api/purchase-returns/${entry.id}/items`, { credentials: "include" });
          data.items = await itemsRes.json();
        }
        setViewDetails(data);
      } catch { setViewDetails(null); }
    }
    setViewDetailsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    const url = getDeleteUrl(deleteEntry);
    if (!url) return;
    try {
      await apiRequest("DELETE", url);
      queryClient.invalidateQueries({ queryKey: [`/api/supplier-statement/${selectedSupplierId}`] });
      toast({ title: t("Deleted successfully") });
      playDeleteSound();
    } catch {
      toast({ title: t("Error"), variant: "destructive" });
    }
    setDeleteEntry(null);
  };

  const handleDeleteReportEntry = async () => {
    if (!deleteReportEntry) return;
    const url = deleteReportEntry.type === "purchase"
      ? `/api/purchase-invoices/${deleteReportEntry.id}`
      : `/api/purchase-returns/${deleteReportEntry.id}`;
    try {
      await apiRequest("DELETE", url);
      queryClient.invalidateQueries({ queryKey: [`/api/supplier-products-report/${selectedSupplierId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/supplier-vehicle-expenses/${selectedSupplierId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/supplier-statement/${selectedSupplierId}`] });
      toast({ title: t("Deleted successfully") });
      playDeleteSound();
    } catch {
      toast({ title: t("Error"), variant: "destructive" });
    }
    setDeleteReportEntry(null);
  };

  const entries = statement?.entries || [];
  const oldDebt = parseFloat(statement?.supplier?.oldDebtIqd || "0");
  const openingBalance = statement?.openingBalanceIqd ?? oldDebt;

  const agentNames = useMemo(() => {
    const names = new Set<string>();
    entries.forEach((e) => {
      if ((e.type === "adjustment_received" || e.type === "adjustment_discount") && e.agentName) {
        names.add(e.agentName);
      }
    });
    return Array.from(names).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let filtered = entries.filter(e => e.debitIqd > 0 || e.creditIqd > 0);
    switch (activeTab) {
      case "invoices":
        filtered = filtered.filter(e => e.type === "purchase_invoice");
        break;
      case "returns":
        filtered = filtered.filter(e => e.type === "return_invoice");
        break;
      case "payments":
        filtered = filtered.filter(e => e.type === "payment");
        break;
      case "adjustments":
        filtered = filtered.filter(e => e.type === "adjustment_received" || e.type === "adjustment_discount");
        if (selectedAgent !== "all") {
          filtered = filtered.filter(e => e.agentName === selectedAgent);
        }
        break;
    }
    return filtered;
  }, [entries, activeTab, selectedAgent]);

  let runningIqd = openingBalance;
  const entriesWithBalance = filteredEntries.map((entry) => {
    runningIqd += entry.debitIqd - entry.creditIqd;
    return { ...entry, balanceIqd: runningIqd };
  });

  const totalDebitIqd = filteredEntries.reduce((s, e) => s + e.debitIqd, 0);
  const totalCreditIqd = filteredEntries.reduce((s, e) => s + e.creditIqd, 0);
  const finalBalance = entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balanceIqd : openingBalance;

  const finalBalanceLabel = finalBalance >= 0
    ? `${t('Remaining at')} ${companyProfile?.name || t('Company')}`
    : `${t('Remaining at')} ${statement?.supplier?.name || ""}`;

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const fieldColor = companyProfile?.primaryColor || "#333";
  const textColor = companyProfile?.secondaryColor || "white";

  const companyHeaderHtml = (companyProfile?.logo || companyProfile?.name)
    ? `<div class="company-header">${companyProfile?.logo ? `<img src="${companyProfile.logo}" />` : ""}<span class="company-name">${companyProfile?.name || ""}</span></div>`
    : "";
  const companyHeaderInlineHtml = (companyProfile?.logo || companyProfile?.name)
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:12px;padding:12px 16px;background:linear-gradient(135deg,${fieldColor}08,${fieldColor}15);border:1px solid ${fieldColor}20;border-radius:10px">${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:60px;height:60px;object-fit:contain;border-radius:8px" />` : ""}<span style="font-size:18pt;font-weight:800;color:${fieldColor}">${companyProfile?.name || ""}</span></div>`
    : "";

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "purchase_invoice":
        return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800 gap-1"><IconExpenseEntry className="w-3 h-3" />{t("Purchase Invoice")}</Badge>;
      case "return_invoice":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800 gap-1"><RotateCcw className="w-3 h-3" />{t("Return Invoice")}</Badge>;
      case "payment":
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800 gap-1"><IconDinar className="w-3 h-3" />{t("Payment")}</Badge>;
      case "adjustment_received":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1"><ArrowDownToLine className="w-3 h-3" />{t("Received")}</Badge>;
      case "adjustment_discount":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 gap-1"><Tag className="w-3 h-3" />{t("Discount")}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "purchase_invoice": return t("Purchase Invoice");
      case "return_invoice": return t("Return Invoice");
      case "payment": return t("Payment");
      case "adjustment_received": return t("Received");
      case "adjustment_discount": return t("Discount");
      default: return type;
    }
  };

  const getActiveTabLabel = () => {
    switch (activeTab) {
      case "general": return t("General Statement");
      case "invoices": return t("Purchase Invoices");
      case "returns": return t("Return Invoices");
      case "payments": return t("Payments & Transfers");
      case "adjustments": return t("Agent Adjustments");
      case "products_report": return t("Incoming Report");
    }
  };

  const handlePrint = () => {
    if (!statement) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const oldDebtVal = parseFloat(statement.supplier.oldDebtIqd || "0");
    const openingBalanceVal = statement.openingBalanceIqd ?? oldDebtVal;
    const rows = entriesWithBalance.map((e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${e.description}</td>
        <td>${formatDate(e.date)}<br/><small>${e.time}</small></td>
        <td>${getTypeText(e.type)}</td>
        <td class="debit">${e.debitIqd > 0 ? fmt(e.debitIqd) + " IQD" : "-"}</td>
        <td class="credit">${e.creditIqd > 0 ? fmt(e.creditIqd) + " IQD" : "-"}</td>
        <td class="balance">${fmt(e.balanceIqd)} IQD</td>
        <td>${e.note || "-"}</td>
      </tr>
    `).join("");

    const dateRangeHtml = startDate || endDate ? `<p style="font-size: 10pt; color: #444;">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : "";
    const tabLabel = getActiveTabLabel();

    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor });
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Supplier Statement - IQD")} - ${statement.supplier.name} - ${tabLabel}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid ${fieldColor}">
          <div style="text-align:${isRtl ? 'right' : 'left'}">
            <h1 style="font-size:18pt;font-weight:800;color:${fieldColor};margin:0">${t("Supplier Statement - IQD")}</h1>
            <p style="font-size:11pt;color:#666;margin:4px 0 0 0">${formatDate(new Date())}</p>
            ${dateRangeHtml ? `<p style="font-size:10pt;color:#444;margin:2px 0 0 0">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : ""}
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:55px;height:55px;object-fit:contain;border-radius:6px" />` : ""}
            <span style="font-size:16pt;font-weight:800;color:${fieldColor}">${companyProfile?.name || ""}</span>
          </div>
        </div>
        <div class="entity-bar">${statement.supplier.name}</div>
        <div class="summary-cards">
          <div class="summary-card accent-red"><div class="label">${t("Opening Balance")}</div><div class="value red">${fmt(openingBalanceVal)} IQD</div></div>
          <div class="summary-card accent-green"><div class="label">${t("Total Payments IQD")}</div><div class="value green">${fmt(totalCreditIqd)} IQD</div></div>
          <div class="summary-card ${finalBalance >= 0 ? 'accent-green' : 'accent-red'}"><div class="label">${finalBalanceLabel}</div><div class="value ${finalBalance >= 0 ? 'green' : 'red'}">${fmt(Math.abs(finalBalance))} IQD</div></div>
        </div>
        ${((statement.totalPurchaseGifts || 0) > 0 || (statement.totalReturnGifts || 0) > 0) ? `
        <div class="summary-cards">
          ${(statement.totalPurchaseGifts || 0) > 0 ? `<div class="summary-card" style="border-top:3px solid #9333ea"><div class="label">${t("Purchase Gifts")}</div><div class="value" style="color:#9333ea">${statement.totalPurchaseGifts}</div></div>` : ''}
          ${(statement.totalReturnGifts || 0) > 0 ? `<div class="summary-card" style="border-top:3px solid #ea580c"><div class="label">${t("Return Gifts")}</div><div class="value" style="color:#ea580c">${statement.totalReturnGifts}</div></div>` : ''}
        </div>` : ''}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Invoice Number")}</th>
              <th>${t("Date")}</th>
              <th>${t("Type")}</th>
              <th>${t("Debit IQD")}</th>
              <th>${t("Credit IQD")}</th>
              <th>${t("Balance IQD")}</th>
              <th>${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-row">
              <td>-</td><td>-</td><td>-</td><td>${t("Opening Balance")}</td>
              <td>-</td><td>-</td><td class="balance red">${fmt(openingBalanceVal)} IQD</td><td></td>
            </tr>
            ${rows}
            <tr class="total-row">
              <td>-</td><td>-</td><td>-</td><td>${t("Total")}</td>
              <td class="debit">${fmt(totalDebitIqd)} IQD</td>
              <td class="credit">${fmt(totalCreditIqd)} IQD</td>
              <td class="balance blue">${fmt(finalBalance)} IQD</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
    logExport({ reportName: t("Supplier Statement"), supplierName: statement.supplier.name, invoiceNumber: "", exportType: "print", currency: "IQD" });
  };

  const generatePdf = async (): Promise<Blob | null> => {
    if (!statement || !printRef.current) return null;

    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;background:white;padding:15px;font-size:10pt;font-family:'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Segoe UI',sans-serif;direction:" + (isRtl ? "rtl" : "ltr");
    document.body.appendChild(tempDiv);

    const oldDebtVal = parseFloat(statement.supplier.oldDebtIqd || "0");
    const openingBalanceVal = statement.openingBalanceIqd ?? oldDebtVal;
    const rows = entriesWithBalance.map((e, idx) => `
      <tr style="background:${idx % 2 === 0 ? "white" : "#f9f9f9"}">
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.description}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${formatDate(e.date)}<br/><small style="color:#999;font-size:7pt">${e.time}</small></td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${getTypeText(e.type)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;color:#dc2626">${e.debitIqd > 0 ? fmt(e.debitIqd) + " IQD" : "-"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;color:#16a34a">${e.creditIqd > 0 ? fmt(e.creditIqd) + " IQD" : "-"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;font-weight:600">${fmt(e.balanceIqd)} IQD</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.note || "-"}</td>
      </tr>
    `).join("");

    const dateRangeHtml = startDate || endDate ? `<p style="font-size: 10pt; color: #666;">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : "";
    const tabLabel = getActiveTabLabel();

    tempDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid ${fieldColor}">
        <div style="text-align:${isRtl ? 'right' : 'left'}">
          <h1 style="font-size:14pt;font-weight:800;color:${fieldColor};margin:0">${t("Supplier Statement - IQD")}</h1>
          <p style="font-size:10pt;color:#666;margin:4px 0 0 0">${formatDate(new Date())}</p>
          ${dateRangeHtml}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:55px;height:55px;object-fit:contain;border-radius:6px" />` : ""}
          <span style="font-size:14pt;font-weight:800;color:${fieldColor}">${companyProfile?.name || ""}</span>
        </div>
      </div>
      <div style="background:${fieldColor};color:${textColor};text-align:center;padding:5px;border-radius:3px;margin-bottom:8px;font-weight:600;font-size:11pt">${statement.supplier.name}</div>
      <div style="display:flex;gap:10px;margin-bottom:10px">
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Opening Balance")}</div><div style="font-size:12pt;font-weight:700;color:#dc2626">${fmt(openingBalanceVal)} IQD</div></div>
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Total Payments IQD")}</div><div style="font-size:12pt;font-weight:700;color:#16a34a">${fmt(totalCreditIqd)} IQD</div></div>
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${finalBalanceLabel}</div><div style="font-size:12pt;font-weight:700;color:${finalBalance >= 0 ? '#16a34a' : '#dc2626'}">${fmt(Math.abs(finalBalance))} IQD</div></div>
      </div>
      ${((statement.totalPurchaseGifts || 0) > 0 || (statement.totalReturnGifts || 0) > 0) ? `
      <div style="display:flex;gap:10px;margin-bottom:10px">
        ${(statement.totalPurchaseGifts || 0) > 0 ? `<div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center;border-top:3px solid #9333ea"><div style="font-size:8pt;color:#666">${t("Purchase Gifts")}</div><div style="font-size:12pt;font-weight:700;color:#9333ea">${statement.totalPurchaseGifts}</div></div>` : ''}
        ${(statement.totalReturnGifts || 0) > 0 ? `<div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center;border-top:3px solid #ea580c"><div style="font-size:8pt;color:#666">${t("Return Gifts")}</div><div style="font-size:12pt;font-weight:700;color:#ea580c">${statement.totalReturnGifts}</div></div>` : ''}
      </div>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:9pt">
        <thead><tr>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">#</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Invoice Number")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Date")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Type")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Debit IQD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Credit IQD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Balance IQD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Note")}</th>
        </tr></thead>
        <tbody>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:500">${t("Opening Balance")}</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:700;color:#dc2626">${fmt(openingBalanceVal)} IQD</td><td style="border:1px solid #ddd;padding:3px"></td></tr>
          ${rows}
          <tr style="background:#f0f0f0;font-weight:700;border-top:2px solid #333"><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">${t("Total")}</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#dc2626">${fmt(totalDebitIqd)} IQD</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#16a34a">${fmt(totalCreditIqd)} IQD</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#2563eb">${fmt(finalBalance)} IQD</td><td style="border:1px solid #ddd;padding:3px"></td></tr>
        </tbody>
      </table>
    `;

    try {
      return await captureElementAsPdf(tempDiv);
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleWhatsApp = async () => {
    if (!statement) return;
    setSendingWhatsApp(true);
    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;
      const fileName = `${t("Supplier Statement - IQD")}_${statement.supplier.name}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: fileName, files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        const text = encodeURIComponent(`${t("Supplier Statement - IQD")}\n${statement.supplier.name}\n${finalBalanceLabel}: ${fmt(Math.abs(finalBalance))} IQD`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
      logExport({ reportName: t("Supplier Statement"), supplierName: statement.supplier.name, invoiceNumber: "", exportType: "whatsapp", currency: "IQD" });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "general", label: t("General Statement") },
    { key: "invoices", label: t("Purchase Invoices") },
    { key: "returns", label: t("Return Invoices") },
    { key: "payments", label: t("Payments & Transfers") },
    { key: "adjustments", label: t("Agent Adjustments") },
    { key: "products_report", label: t("Incoming Report") },
    { key: "vehicle_expenses", label: t("Incoming Vehicle Expenses") },
  ];

  return (
    <div className="space-y-3">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-5 w-5" />
          {t("Supplier Management")}
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-supplier-statement-iqd-title">
          <IconDinar className="h-8 w-8 text-orange-600" />
          {t("Supplier Statement - IQD")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("View supplier account statement in Iraqi Dinar")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5" />
            {t("Select Supplier")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="mb-2 block">{t("Select Supplier")}</Label>
              <SupplierSearchSelect
                suppliers={suppliers}
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
                placeholder={t("Select supplier...")}
                data-testid="select-supplier-statement-iqd"
              />
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">{t("From Date")}</Label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">{t("To Date")}</Label>
              <DateInput
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
                data-testid="input-end-date"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              data-testid="button-clear-filters"
            >
              {t("Clear Filters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSupplierId && (
        <div className="flex flex-wrap gap-2 items-center" data-testid="tab-buttons-container">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== "adjustments") {
                  setSelectedAgent("all");
                }
              }}
              data-testid={`tab-${tab.key}`}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {activeTab === "adjustments" && agentNames.length > 0 && (
            <SearchSelect
              items={agentNames.map(name => ({ id: name, name }))}
              value={selectedAgent}
              onValueChange={(v) => setSelectedAgent(v || "all")}
              placeholder={t("Select Agent")}
              data-testid="select-agent-filter"
              showAllOption
              allOptionLabel={t("All Agents")}
              className="w-[200px]"
            />
          )}
        </div>
      )}

      {selectedSupplierId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSupplierId && statement && !statementLoading && activeTab !== "products_report" && activeTab !== "vehicle_expenses" && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={sendingWhatsApp} className="bg-green-600 hover:bg-green-700 text-white border-green-600" data-testid="button-whatsapp-statement-iqd">
              {sendingWhatsApp ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : <MessageCircle className="w-5 h-5 mr-1" />}
              {t("WhatsApp")}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-statement-iqd">
              <Printer className="w-5 h-5 mr-1" />
              {t("Print")}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm font-semibold text-muted-foreground mb-1">{t("Opening Balance")}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-opening-balance-iqd">{fmt(openingBalance)} IQD</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm font-semibold text-muted-foreground mb-1">{t("Total Payments IQD")}</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(totalCreditIqd)} IQD</p>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${finalBalance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardContent className="pt-4 pb-3">
                <p className="text-sm font-semibold text-muted-foreground mb-1">{finalBalanceLabel}</p>
                <p className={`text-xl font-bold ${finalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(Math.abs(finalBalance))} IQD</p>
              </CardContent>
            </Card>
          </div>
          {((statement?.totalPurchaseGifts || 0) > 0 || (statement?.totalReturnGifts || 0) > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(statement?.totalPurchaseGifts || 0) > 0 && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{t("Purchase Gifts")}</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-purchase-gifts-iqd">{statement?.totalPurchaseGifts || 0}</p>
                  </CardContent>
                </Card>
              )}
              {(statement?.totalReturnGifts || 0) > 0 && (
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">{t("Return Gifts")}</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-return-gifts-iqd">{statement?.totalReturnGifts || 0}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("Account Statement")} - {statement.supplier.name} (IQD) - {getActiveTabLabel()}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t("No transactions found")}
                </div>
              ) : (
                <div className="overflow-x-auto" ref={printRef}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-center text-sm font-bold">#</TableHead>
                        <TableHead className="text-sm font-bold">{t("Invoice Number")}</TableHead>
                        <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                        <TableHead className="text-sm font-bold">{t("Type")}</TableHead>
                        <TableHead className="text-center text-sm font-bold bg-red-50 dark:bg-red-950/20">{t("Debit IQD")}</TableHead>
                        <TableHead className="text-center text-sm font-bold bg-green-50 dark:bg-green-950/20">{t("Credit IQD")}</TableHead>
                        <TableHead className="text-center text-sm font-bold bg-blue-50 dark:bg-blue-950/20">{t("Balance IQD")}</TableHead>
                        <TableHead className="text-sm font-bold">{t("Note")}</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/30 font-medium italic">
                        <TableCell className="text-center text-sm font-semibold">-</TableCell>
                        <TableCell className="text-sm font-semibold">-</TableCell>
                        <TableCell className="text-sm font-semibold">-</TableCell>
                        <TableCell className="text-sm font-semibold">{t("Opening Balance")}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">-</TableCell>
                        <TableCell className="text-center text-sm font-semibold">-</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400 text-sm font-bold">{fmt(openingBalance)} IQD</TableCell>
                        <TableCell className="text-sm font-semibold">-</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {entriesWithBalance.map((entry, idx) => (
                        <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-statement-iqd-${idx}`}>
                          <TableCell className="text-center text-muted-foreground font-mono text-sm">{idx + 1}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm font-semibold">{entry.description}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{formatDate(entry.date)}</span>
                              <span className="text-xs text-muted-foreground">{entry.time}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(entry.type)}</TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {entry.debitIqd > 0 ? <span className="text-red-600 dark:text-red-400 font-semibold">{fmt(entry.debitIqd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {entry.creditIqd > 0 ? <span className="text-green-600 dark:text-green-400 font-semibold">{fmt(entry.creditIqd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm font-bold">
                            <span className={entry.balanceIqd >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                              {fmt(entry.balanceIqd)} IQD
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-semibold max-w-[150px] truncate">{entry.note || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                    if (entry.type === "purchase_invoice") {
                                      setReportInvoiceId(entry.id);
                                      setReportOpen(true);
                                    } else if (entry.type === "return_invoice") {
                                      setReturnReportId(entry.id);
                                      setReturnReportOpen(true);
                                    } else if (entry.type === "payment") {
                                      setPaymentReportId(entry.id);
                                      setPaymentReportOpen(true);
                                    } else if (entry.type === "adjustment_received" || entry.type === "adjustment_discount") {
                                      setAdjustmentReportId(entry.id);
                                      setAdjustmentReportOpen(true);
                                    } else {
                                      handleView(entry);
                                    }
                                  }} data-testid={`btn-view-iqd-${entry.type}-${entry.id}`}>
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                              {getEditRoute(entry) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(getEditRoute(entry)!, "_blank")} data-testid={`btn-edit-iqd-${entry.type}-${entry.id}`}>
                                  <Pencil className="h-3.5 w-3.5 text-orange-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteEntry(entry)} data-testid={`btn-delete-iqd-${entry.type}-${entry.id}`}>
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-center text-sm font-bold">-</TableCell>
                        <TableCell className="text-sm font-bold">-</TableCell>
                        <TableCell className="text-sm font-bold">-</TableCell>
                        <TableCell className="text-sm font-bold">{t("Total")}</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400 font-mono text-sm font-bold">{fmt(totalDebitIqd)}</TableCell>
                        <TableCell className="text-center text-green-600 dark:text-green-400 font-mono text-sm font-bold">{fmt(totalCreditIqd)}</TableCell>
                        <TableCell className="text-center text-blue-600 dark:text-blue-400 font-mono text-sm font-bold">
                          {fmt(finalBalance)} IQD
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {selectedSupplierId && activeTab === "products_report" && (
        <>
          {productsReportLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : productsReport ? (
            <>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => {
                  if (!productsReport) return;
                  const printWindow = window.open("", "_blank", "width=794,height=1123");
                  if (!printWindow) return;
                  const dateRangeHtml = startDate || endDate ? `<p style="font-size: 10pt; color: #444;">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : "";
                  const totalPurchaseGifts = productsReport.rows.reduce((s, r) => s + (r.type === "purchase" ? r.gift : 0), 0);
                  const totalReturnGifts = productsReport.rows.reduce((s, r) => s + (r.type === "return" ? r.gift : 0), 0);
                  const showPG = totalPurchaseGifts > 0;
                  const showRG = totalReturnGifts > 0;
                  const rows = productsReport.rows.map((row, idx) => {
                    const purchaseAmount = (row.quantity - row.returnQuantity) * row.price;
                    const purchaseGift = row.type === "purchase" ? row.gift : 0;
                    const returnGift = row.type === "return" ? row.gift : 0;
                    return `<tr>
                      <td>${idx + 1}</td>
                      <td>${row.invoiceNumber}</td>
                      <td>${row.type === "purchase" ? t("Purchase") : t("Return")}</td>
                      <td>${formatDate(row.date)}</td>
                      <td>${row.productName}</td>
                      <td>${row.quantity > 0 ? row.quantity : "-"}</td>
                      ${showPG ? `<td style="color:#9333ea;font-weight:700">${purchaseGift > 0 ? purchaseGift : "-"}</td>` : ''}
                      <td>${row.unit}</td>
                      <td class="return-col">${row.returnQuantity > 0 ? row.returnQuantity : "-"}</td>
                      ${showRG ? `<td style="color:#ea580c;font-weight:700">${returnGift > 0 ? returnGift : "-"}</td>` : ''}
                      <td>${fmt(row.price)} IQD</td>
                      <td class="amount">${fmt(purchaseAmount)} IQD</td>
                    </tr>`;
                  }).join("");
                  const grandTotalAmount = productsReport.rows.reduce((sum, row) => sum + (row.quantity - row.returnQuantity) * row.price, 0);
                  const incomingPrintStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor, pageSize: "A4 landscape" });
                  printWindow.document.write(`<!DOCTYPE html>
                    <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
                    <head>
        ${PRINT_FONT_LINKS}<meta charset="UTF-8" />
                      <title>${t("Incoming Report")} - ${productsReport.supplier?.name || ""} (IQD)</title>
                      <style>${incomingPrintStyles}</style>
                    </head>
                    <body>
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid ${fieldColor}">
                        <div style="text-align:${isRtl ? 'right' : 'left'}">
                          <h1 style="font-size:16pt;font-weight:800;color:${fieldColor};margin:0">${t("Incoming Report")} (IQD)</h1>
                          <p style="font-size:10pt;color:#666;margin:4px 0 0 0">${formatDate(new Date())}</p>
                          ${dateRangeHtml ? `<p style="font-size:9pt;color:#444;margin:2px 0 0 0">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : ""}
                        </div>
                        <div style="display:flex;align-items:center;gap:10px">
                          ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:55px;height:55px;object-fit:contain;border-radius:6px" />` : ""}
                          <span style="font-size:14pt;font-weight:800;color:${fieldColor}">${companyProfile?.name || ""}</span>
                        </div>
                      </div>
                      <div class="entity-bar">${productsReport.supplier?.name || ""}</div>
                      <table>
                        <thead><tr>
                          <th>#</th><th>${t("Invoice Number")}</th><th>${t("Type")}</th><th>${t("Date")}</th><th>${t("Product Name")}</th>
                          <th>${t("Quantity")}</th>${showPG ? `<th style="color:#9333ea">${t("Gift")}</th>` : ''}<th>${t("Unit")}</th><th>${t("Return")}</th>${showRG ? `<th style="color:#ea580c">${t("Return Gifts")}</th>` : ''}<th>${t("Purchase Price")}</th><th>${t("Purchase Amount")}</th>
                        </tr></thead>
                        <tbody>
                          ${rows}
                          <tr class="total-row">
                            <td colspan="5">${t("Total")}</td>
                            <td>${productsReport.totalQuantity}</td>
                            ${showPG ? `<td style="color:#9333ea;font-weight:700">${totalPurchaseGifts}</td>` : ''}
                            <td></td>
                            <td class="return-col">${productsReport.totalReturns}</td>
                            ${showRG ? `<td style="color:#ea580c;font-weight:700">${totalReturnGifts}</td>` : ''}
                            <td>${fmt(productsReport.totalAmount)} IQD</td>
                            <td class="amount">${fmt(grandTotalAmount)} IQD</td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="summary-footer">
                        <div>${t("Total Quantity")} - ${t("Returns")}: <span>${(productsReport.totalQuantity || 0) - (productsReport.totalReturns || 0)}</span></div>
                        <div>${t("Total Amount")}: <span>${fmt(grandTotalAmount)} IQD</span></div>
                        ${totalPurchaseGifts > 0 ? `<div>${t("Purchase Gifts")}: <span style="color:#9333ea">${totalPurchaseGifts}</span></div>` : ''}
                        ${totalReturnGifts > 0 ? `<div>${t("Return Gifts")}: <span style="color:#ea580c">${totalReturnGifts}</span></div>` : ''}
                      </div>
                    </body></html>`);
                  printWindow.document.close();
                  const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
                  logExport({ reportName: t("Incoming Report"), supplierName: productsReport?.supplier?.name || "", invoiceNumber: "", exportType: "print", currency: "IQD" });
                }} data-testid="button-print-products-report-iqd">
                  <Printer className="w-5 h-5 mr-1" />
                  {t("Print")}
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("Incoming Report")} - {productsReport.supplier?.name || ""} (IQD)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {productsReport.rows.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {t("No transactions found")}
                    </div>
                  ) : (() => {
                    const hasPG = productsReport.rows.some(r => r.type === "purchase" && r.gift > 0);
                    const hasRG = productsReport.rows.some(r => r.type === "return" && r.gift > 0);
                    return (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-center">#</TableHead>
                            <TableHead>{t("Invoice Number")}</TableHead>
                            <TableHead>{t("Type")}</TableHead>
                            <TableHead>{t("Date")}</TableHead>
                            <TableHead>{t("Product Name")}</TableHead>
                            <TableHead className="text-center">{t("Quantity")}</TableHead>
                            {hasPG && <TableHead className="text-center text-purple-600">{t("Gift")}</TableHead>}
                            <TableHead>{t("Unit")}</TableHead>
                            <TableHead className="text-center text-red-600">{t("Return")}</TableHead>
                            {hasRG && <TableHead className="text-center text-orange-600">{t("Return Gifts")}</TableHead>}
                            <TableHead className="text-center">{t("Purchase Price")}</TableHead>
                            <TableHead className="text-center text-blue-600">{t("Purchase Amount")}</TableHead>
                            <TableHead className="text-center">{t("Actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productsReport.rows.map((row, idx) => {
                            const purchaseAmount = (row.quantity - row.returnQuantity) * row.price;
                            return (
                              <TableRow key={idx} data-testid={`row-products-report-iqd-${idx}`}>
                                <TableCell className="text-center text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                                <TableCell>
                                  {row.type === "purchase" ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800">{t("Purchase")}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800">{t("Return")}</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.productName}</TableCell>
                                <TableCell className="text-center font-mono">{row.quantity > 0 ? row.quantity : "-"}</TableCell>
                                {hasPG && <TableCell className="text-center font-mono text-purple-600 font-bold">{row.type === "purchase" && row.gift > 0 ? row.gift : "-"}</TableCell>}
                                <TableCell>{row.unit}</TableCell>
                                <TableCell className="text-center font-mono text-red-600">{row.returnQuantity > 0 ? row.returnQuantity : "-"}</TableCell>
                                {hasRG && <TableCell className="text-center font-mono text-orange-600 font-bold">{row.type === "return" && row.gift > 0 ? row.gift : "-"}</TableCell>}
                                <TableCell className="text-center font-mono">{fmt(row.price)} IQD</TableCell>
                                <TableCell className="text-center font-mono font-bold text-blue-600 dark:text-blue-400">{fmt(purchaseAmount)} IQD</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                      if (row.type === "purchase") { setReportInvoiceId(row.invoiceId); setReportOpen(true); }
                                      else { setReturnReportId(row.invoiceId); setReturnReportOpen(true); }
                                    }} data-testid={`btn-view-product-iqd-${idx}`}>
                                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(row.type === "purchase" ? `/purchase-invoice-iqd?edit=${row.invoiceId}` : `/purchase-return-iqd?edit=${row.invoiceId}`, "_blank")} data-testid={`btn-edit-product-iqd-${idx}`}>
                                      <Pencil className="h-3.5 w-3.5 text-orange-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteReportEntry({ id: row.invoiceId, type: row.type, description: `${row.invoiceNumber} - ${row.productName}` })} data-testid={`btn-delete-product-iqd-${idx}`}>
                                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {(() => {
                            const grandTotal = productsReport.rows.reduce((sum, row) => sum + (row.quantity - row.returnQuantity) * row.price, 0);
                            return (
                              <TableRow className="bg-muted/50 font-bold border-t-2">
                                <TableCell colSpan={5} className="text-center">{t("Total")}</TableCell>
                                <TableCell className="text-center font-mono">{productsReport.totalQuantity}</TableCell>
                                {hasPG && <TableCell className="text-center font-mono text-purple-600">{productsReport.rows.reduce((s, r) => s + (r.type === "purchase" ? r.gift : 0), 0)}</TableCell>}
                                <TableCell></TableCell>
                                <TableCell className="text-center font-mono text-red-600">{productsReport.totalReturns}</TableCell>
                                {hasRG && <TableCell className="text-center font-mono text-orange-600">{productsReport.rows.reduce((s, r) => s + (r.type === "return" ? r.gift : 0), 0)}</TableCell>}
                                <TableCell className="text-center font-mono">{fmt(productsReport.totalAmount)} IQD</TableCell>
                                <TableCell className="text-center font-mono font-bold text-blue-600 dark:text-blue-400">{fmt(grandTotal)} IQD</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                    );
                  })()}
                  <div className="p-4 border-t flex flex-col sm:flex-row gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t("Total Quantity")} - {t("Returns")}:</span> <span className="font-bold">{(productsReport?.totalQuantity || 0) - (productsReport?.totalReturns || 0)}</span></div>
                    <div><span className="text-muted-foreground">{t("Total Amount")}:</span> <span className="font-bold">{fmt(productsReport.rows.reduce((sum, row) => sum + (row.quantity - row.returnQuantity) * row.price, 0))} IQD</span></div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
      {selectedSupplierId && activeTab === "vehicle_expenses" && (
        <>
          {vehicleExpensesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : vehicleExpenses ? (
            <>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => {
                  if (!vehicleExpenses) return;
                  const printWindow = window.open("", "_blank", "width=794,height=1123");
                  if (!printWindow) return;
                  const dateRangeHtml = startDate || endDate ? `${startDate || t("Beginning")} - ${endDate || t("Now")}` : "";
                  const rows = vehicleExpenses.rows.map((row, idx) => `<tr>
                    <td>${idx + 1}</td>
                    <td>${row.invoiceNumber}</td>
                    <td>${formatDate(row.date)}</td>
                    <td>${row.carNumber || "-"}</td>
                    <td>${row.manifest || "-"}</td>
                    <td>${row.driverName || "-"}</td>
                    <td>${row.driverMobile || "-"}</td>
                    <td>${row.customsExpense > 0 ? fmt(row.customsExpense) : "-"}</td>
                    <td>${row.carExpense > 0 ? fmt(row.carExpense) : "-"}</td>
                    <td>${fmt(row.invoiceAmount)}</td>
                    <td class="credit">${fmt(row.amountPaid)}</td>
                    <td class="debit">${fmt(row.remaining)}</td>
                  </tr>`).join("");
                  const vPrintStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor, pageSize: "A4 landscape" });
                  printWindow.document.write(`<!DOCTYPE html>
                    <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
                    <head>
        ${PRINT_FONT_LINKS}<meta charset="UTF-8" />
                      <title>${t("Incoming Vehicle Expenses")} - ${vehicleExpenses.supplier?.name || ""} (IQD)</title>
                      <style>${vPrintStyles}</style>
                    </head>
                    <body>
                      <div class="report-banner">
                        <div class="banner-right">
                          <h1>${t("Incoming Vehicle Expenses")} (IQD)</h1>
                          <div class="supplier-name">${vehicleExpenses.supplier?.name || ""}</div>
                          <div class="date-range">${formatDate(new Date())}${dateRangeHtml ? ` | ${dateRangeHtml}` : ""}</div>
                        </div>
                        <div class="banner-left">
                          ${companyProfile?.logo ? `<img src="${companyProfile.logo}" />` : ""}
                          <span class="company-name">${companyProfile?.name || ""}</span>
                        </div>
                      </div>
                      <table>
                        <thead><tr>
                          <th>#</th><th>${t("Invoice Number")}</th><th>${t("Date")}</th><th>${t("Vehicle Number")}</th><th>${t("Manifest")}</th>
                          <th>${t("Driver Name")}</th><th>${t("Driver Mobile")}</th><th>${t("Customs")}</th><th>${t("Transport Fee")}</th>
                          <th>${t("Invoice Amount")}</th><th>${t("Amount Paid")}</th><th>${t("Remaining")}</th>
                        </tr></thead>
                        <tbody>
                          ${rows}
                          <tr class="total-row">
                            <td colspan="7">${t("Total")}</td>
                            <td>${fmt(vehicleExpenses.totalCustoms)}</td>
                            <td>${fmt(vehicleExpenses.totalCarExpense)}</td>
                            <td>${fmt(vehicleExpenses.totalInvoiceAmount)}</td>
                            <td class="credit">${fmt(vehicleExpenses.totalPaid)}</td>
                            <td class="debit">${fmt(vehicleExpenses.totalRemaining)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </body></html>`);
                  printWindow.document.close();
                  const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
                  logExport({ reportName: t("Incoming Vehicle Expenses"), supplierName: vehicleExpenses?.supplier?.name || "", invoiceNumber: "", exportType: "print", currency: "IQD" });
                }} data-testid="button-print-vehicle-expenses-iqd">
                  <Printer className="w-5 h-5 mr-1" />
                  {t("Print")}
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("Incoming Vehicle Expenses")} - {vehicleExpenses?.supplier?.name || ""} (IQD)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {vehicleExpenses.rows.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {t("No transactions found")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-center">#</TableHead>
                            <TableHead>{t("Invoice Number")}</TableHead>
                            <TableHead>{t("Date")}</TableHead>
                            <TableHead>{t("Vehicle Number")}</TableHead>
                            <TableHead>{t("Manifest")}</TableHead>
                            <TableHead>{t("Driver Name")}</TableHead>
                            <TableHead>{t("Driver Mobile")}</TableHead>
                            <TableHead className="text-center">{t("Customs")}</TableHead>
                            <TableHead className="text-center">{t("Transport Fee")}</TableHead>
                            <TableHead className="text-center">{t("Invoice Amount")}</TableHead>
                            <TableHead className="text-center text-green-600">{t("Amount Paid")}</TableHead>
                            <TableHead className="text-center text-red-600">{t("Remaining")}</TableHead>
                            <TableHead className="text-center">{t("Actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicleExpenses.rows.map((row, idx) => (
                            <TableRow key={idx} data-testid={`row-vehicle-expense-iqd-${idx}`}>
                              <TableCell className="text-center text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                              <TableCell>{formatDate(row.date)}</TableCell>
                              <TableCell>{row.carNumber || "-"}</TableCell>
                              <TableCell>{row.manifest || "-"}</TableCell>
                              <TableCell>{row.driverName || "-"}</TableCell>
                              <TableCell>{row.driverMobile || "-"}</TableCell>
                              <TableCell className="text-center font-mono">{row.customsExpense > 0 ? fmt(row.customsExpense) : "-"}</TableCell>
                              <TableCell className="text-center font-mono">{row.carExpense > 0 ? fmt(row.carExpense) : "-"}</TableCell>
                              <TableCell className="text-center font-mono font-bold">{fmt(row.invoiceAmount)}</TableCell>
                              <TableCell className="text-center font-mono text-green-600">{fmt(row.amountPaid)}</TableCell>
                              <TableCell className="text-center font-mono text-red-600 font-bold">{fmt(row.remaining)}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReportInvoiceId(row.invoiceId); setReportOpen(true); }} data-testid={`btn-view-vehicle-iqd-${idx}`}>
                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`/purchase-invoice-iqd?edit=${row.invoiceId}`, "_blank")} data-testid={`btn-edit-vehicle-iqd-${idx}`}>
                                    <Pencil className="h-3.5 w-3.5 text-orange-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteReportEntry({ id: row.invoiceId, type: "purchase", description: row.invoiceNumber })} data-testid={`btn-delete-vehicle-iqd-${idx}`}>
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold border-t-2">
                            <TableCell colSpan={7} className="text-center">{t("Total")}</TableCell>
                            <TableCell className="text-center font-mono">{fmt(vehicleExpenses.totalCustoms)}</TableCell>
                            <TableCell className="text-center font-mono">{fmt(vehicleExpenses.totalCarExpense)}</TableCell>
                            <TableCell className="text-center font-mono font-bold">{fmt(vehicleExpenses.totalInvoiceAmount)}</TableCell>
                            <TableCell className="text-center font-mono text-green-600">{fmt(vehicleExpenses.totalPaid)}</TableCell>
                            <TableCell className="text-center font-mono text-red-600 font-bold">{fmt(vehicleExpenses.totalRemaining)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
      <Dialog open={!!viewEntry} onOpenChange={(open) => { if (!open) { setViewEntry(null); setViewDetails(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("View Details")}</DialogTitle>
            <DialogDescription>{viewEntry?.description}</DialogDescription>
          </DialogHeader>
          {viewDetailsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{t("Date")}:</span> <span className="font-medium">{formatDate(viewEntry.date)}</span></div>
                <div><span className="text-muted-foreground">{t("Time")}:</span> <span className="font-medium">{viewEntry.time}</span></div>
                <div><span className="text-muted-foreground">{t("Type")}:</span> <span className="font-medium">{viewEntry.type === "purchase_invoice" ? t("Purchase Invoice") : viewEntry.type === "return_invoice" ? t("Return Invoice") : viewEntry.type === "payment" ? t("Payment") : t("Adjustment")}</span></div>
                <div><span className="text-muted-foreground">{t("Note")}:</span> <span className="font-medium">{viewEntry.description}</span></div>
                {viewEntry.debitIqd > 0 && <div><span className="text-muted-foreground">{t("Debit IQD")}:</span> <span className="font-medium text-red-600">{fmt(viewEntry.debitIqd)} IQD</span></div>}
                {viewEntry.creditIqd > 0 && <div><span className="text-muted-foreground">{t("Credit IQD")}:</span> <span className="font-medium text-green-600">{fmt(viewEntry.creditIqd)} IQD</span></div>}
                {viewEntry.note && <div className="col-span-2"><span className="text-muted-foreground">{t("Note")}:</span> <span className="font-medium">{viewEntry.note}</span></div>}
              </div>
              {viewDetails && (viewEntry.type === "purchase_invoice" || viewEntry.type === "return_invoice") && (
                <div className="space-y-2">
                  {viewDetails.carNumber && <div className="text-sm"><span className="text-muted-foreground">{t("Vehicle Number")}:</span> <span className="font-medium">{viewDetails.carNumber}</span></div>}
                  {viewDetails.manifest && <div className="text-sm"><span className="text-muted-foreground">{t("Manifest")}:</span> <span className="font-medium">{viewDetails.manifest}</span></div>}
                  {viewDetails.driverName && <div className="text-sm"><span className="text-muted-foreground">{t("Driver Name")}:</span> <span className="font-medium">{viewDetails.driverName}</span></div>}
                  {viewDetails.driverMobile && <div className="text-sm"><span className="text-muted-foreground">{t("Driver Mobile")}:</span> <span className="font-medium">{viewDetails.driverMobile}</span></div>}
                  {viewDetails.items && viewDetails.items.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-center">#</TableHead>
                            <TableHead>{t("Product Name")}</TableHead>
                            <TableHead className="text-center">{t("Quantity")}</TableHead>
                            <TableHead>{t("Unit")}</TableHead>
                            <TableHead className="text-center">{t("Price")}</TableHead>
                            <TableHead className="text-center">{t("Total")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewDetails.items.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-center text-xs">{i + 1}</TableCell>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell className="text-center">{fmt(parseFloat(item.price || "0"))} IQD</TableCell>
                              <TableCell className="text-center font-medium">{fmt(parseFloat(item.quantity || "0") * parseFloat(item.price || "0"))} IQD</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              {viewDetails && viewEntry.type === "payment" && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {viewDetails.paymentSourceName && <div><span className="text-muted-foreground">{t("Payment Source")}:</span> <span className="font-medium">{viewDetails.paymentSourceName}</span></div>}
                  {viewDetails.amountUsd && parseFloat(viewDetails.amountUsd) > 0 && <div><span className="text-muted-foreground">{t("Amount USD")}:</span> <span className="font-medium">${parseFloat(viewDetails.amountUsd).toLocaleString()}</span></div>}
                  {viewDetails.amountIqd && parseFloat(viewDetails.amountIqd) > 0 && <div><span className="text-muted-foreground">{t("Amount IQD")}:</span> <span className="font-medium">{parseFloat(viewDetails.amountIqd).toLocaleString()} IQD</span></div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Confirmation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete this record?")} ({deleteEntry?.description})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" data-testid="btn-confirm-delete-iqd">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteReportEntry} onOpenChange={(open) => { if (!open) setDeleteReportEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Confirmation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete this record?")} ({deleteReportEntry?.description})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReportEntry} className="bg-red-600 hover:bg-red-700 text-white" data-testid="btn-confirm-delete-report-iqd">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PurchaseInvoiceReport
        invoiceId={reportInvoiceId}
        open={reportOpen}
        onOpenChange={(open) => { setReportOpen(open); if (!open) setReportInvoiceId(null); }}
        currency="IQD"
      />

      <PurchaseReturnReport
        returnId={returnReportId}
        open={returnReportOpen}
        onOpenChange={(open) => { setReturnReportOpen(open); if (!open) setReturnReportId(null); }}
        currency="IQD"
      />

      <SupplierPaymentReport
        paymentId={paymentReportId}
        open={paymentReportOpen}
        onOpenChange={(open) => { setPaymentReportOpen(open); if (!open) setPaymentReportId(null); }}
        currency="IQD"
      />

      <SupplierAdjustmentReport
        adjustmentId={adjustmentReportId}
        open={adjustmentReportOpen}
        onOpenChange={(open) => { setAdjustmentReportOpen(open); if (!open) setAdjustmentReportId(null); }}
        currency="IQD"
      />
    </div>
  );
}
