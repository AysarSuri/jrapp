import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { apiRequest } from "@/lib/queryClient";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchSelect } from "@/components/search-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Printer, Eye, Pencil, Trash2, FileText, Package, ShoppingCart, RotateCcw, Receipt, Truck, CreditCard, Wallet, DollarSign } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";
import { useToast } from "@/hooks/use-toast";
import SalesInvoiceReport from "@/components/sales-invoice-report";
import SalesReturnReport from "@/components/sales-return-report";
import AgentPaymentReport from "@/components/agent-payment-report";
import StatementEditDialog from "@/components/statement-edit-dialog";
import { resolveUnitName } from "@/lib/language-utils";
import type { AgentPayment } from "@shared/schema";

interface CompanyProfileData {
  id: number;
  name: string;
  logo?: string;
  primaryColor?: string;
}

interface StatementEntry {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string | null;
  reference: string | null;
  currency: string;
  debit: number;
  credit: number;
}

interface RepData {
  id: number;
  name: string;
  debtUsd: string;
  debtIqd: string;
}

interface StatementResponse {
  agent: RepData;
  entries: StatementEntry[];
  openingBalanceUsd: number;
  openingBalanceIqd: number;
}

type TabKey = "remaining" | "salesByProduct" | "sales" | "returns" | "receipts" | "paymentsStatement" | "loads" | "agentReceipts" | "agentExpenses";

export default function RepStatementPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [currency, setCurrency] = useState<"USD" | "IQD">("USD");
  const [activeTab, setActiveTab] = useState<TabKey>("remaining");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportInvoiceOpen, setReportInvoiceOpen] = useState(false);
  const [reportReturnId, setReportReturnId] = useState<number | null>(null);
  const [reportReturnOpen, setReportReturnOpen] = useState(false);
  const [reportPayment, setReportPayment] = useState<AgentPayment | null>(null);
  const [reportPaymentOpen, setReportPaymentOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<{ id: number; type: string; reference: string | null } | null>(null);
  const [editEntry, setEditEntry] = useState<{ id: number; type: string; currency: string; reference: string | null } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: agentsList } = useQuery<{ id: string; name: string; repId: number | null; debtUsd: string; debtIqd: string }[]>({
    queryKey: ["/api/agents"],
  });

  const reps = (agentsList || []).filter((r: any) => r.repId).map((r: any) => ({ id: r.repId, name: r.name, debtUsd: r.debtUsd, debtIqd: r.debtIqd }));

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: unitsList } = useQuery<any[]>({
    queryKey: ["/api/units"],
  });

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/agent-statement", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/agent-statement/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId,
  });

  const { data: repProducts, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/representative-products", selectedRepId],
    queryFn: async () => {
      const res = await fetch(`/api/representative-products/${selectedRepId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "remaining",
  });

  const { data: repSalesByProduct, isLoading: salesByProductLoading } = useQuery<any[]>({
    queryKey: ["/api/rep-sales-by-product", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/rep-sales-by-product/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "salesByProduct",
  });

  const { data: repSales, isLoading: salesLoading } = useQuery<any[]>({
    queryKey: ["/api/rep-sales", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/rep-sales/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "sales",
  });

  const { data: repReturns, isLoading: returnsLoading } = useQuery<any[]>({
    queryKey: ["/api/rep-returns", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/rep-returns/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "returns",
  });

  const { data: repReceipts, isLoading: receiptsLoading } = useQuery<{ receipts: any[]; payments: any[]; cashFromSales: any[] }>({
    queryKey: ["/api/rep-receipts", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/rep-receipts/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "receipts",
  });

  const { data: repPaymentsStatement, isLoading: paymentsStatementLoading } = useQuery<{ receipts: any[]; returnPayments: any[] }>({
    queryKey: ["/api/rep-payments-statement", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/rep-payments-statement/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "paymentsStatement",
  });

  const { data: repLoads, isLoading: loadsLoading } = useQuery<{ loads: any[]; items: any[] }>({
    queryKey: ["/api/rep-loads", selectedRepId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/rep-loads/${selectedRepId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedRepId && activeTab === "loads",
  });

  const { data: allAgentReceipts, isLoading: agentReceiptsLoading } = useQuery<any[]>({
    queryKey: ["/api/agent-receipts"],
    enabled: !!selectedRepId && activeTab === "agentReceipts",
  });

  const { data: allExpenses, isLoading: agentExpensesLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
    enabled: !!selectedRepId && activeTab === "agentExpenses",
  });

  const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";

  const filteredAgentReceipts = (allAgentReceipts || []).filter((r: any) => {
    if (String(r.agentId) !== String(selectedRepId)) return false;
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;
    return true;
  });

  const filteredAgentExpenses = (allExpenses || []).filter((e: any) => {
    if (!e.agentName || e.agentName !== repName) return false;
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  });

  const hasUsdEntries = (statement?.entries || []).some(e => e.currency === "USD") || (statement?.openingBalanceUsd && statement.openingBalanceUsd !== 0);
  const hasIqdEntries = (statement?.entries || []).some(e => e.currency === "IQD") || (statement?.openingBalanceIqd && statement.openingBalanceIqd !== 0);

  useEffect(() => {
    if (statement) {
      if (currency === "USD" && !hasUsdEntries && hasIqdEntries) {
        setCurrency("IQD");
      } else if (currency === "IQD" && !hasIqdEntries && hasUsdEntries) {
        setCurrency("USD");
      }
    }
  }, [statement, hasUsdEntries, hasIqdEntries]);

  const fmt = currency === "USD" ? usd : fmtIqd;
  const currencyLabel = currency === "USD" ? "$" : "IQD";
  const filteredEntries = statement?.entries?.filter(e => e.currency === currency) || [];
  const openingBalance = currency === "USD" ? (statement?.openingBalanceUsd || 0) : (statement?.openingBalanceIqd || 0);

  const invoiceItemsRef = useRef<Record<number, any[]>>({});
  const invoiceDataRef = useRef<Record<number, any>>({});
  const entryIdsKey = filteredEntries.map(e => `${e.id}-${e.type}`).join(",");

  useEffect(() => {
    if (!filteredEntries.length) return;
    const invoiceEntries = filteredEntries.filter(e => e.type === "sales_invoice" || e.type === "sales_return");
    if (!invoiceEntries.length) return;
    const fetchAll = async () => {
      const newItemsMap: Record<number, any[]> = {};
      const newDataMap: Record<number, any> = {};
      await Promise.all(invoiceEntries.map(async (entry) => {
        try {
          const endpoint = entry.type === "sales_invoice" ? "sales-invoices" : "sales-returns";
          const [invRes, itemsRes] = await Promise.all([
            fetch(`/api/${endpoint}/${entry.id}`, { credentials: "include" }),
            fetch(`/api/${endpoint}/${entry.id}/items`, { credentials: "include" }),
          ]);
          if (invRes.ok && itemsRes.ok) {
            newDataMap[entry.id] = await invRes.json();
            newItemsMap[entry.id] = await itemsRes.json();
          }
        } catch {}
      }));
      invoiceItemsRef.current = newItemsMap;
      invoiceDataRef.current = newDataMap;
    };
    fetchAll();
  }, [entryIdsKey]);

  let runningBalance = openingBalance;
  const entriesWithBalance = filteredEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  const totalDebit = filteredEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filteredEntries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = openingBalance + totalDebit - totalCredit;

  const typeBadge = (type: string) => {
    if (type === "sales_invoice") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Sales Invoice')}</Badge>;
    if (type === "sales_return") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('Sales Return')}</Badge>;
    if (type === "agent_payment") return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('Agent Payment')}</Badge>;
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Payment')}</Badge>;
  };

  const isRtl = i18n.language === "ar" || i18n.language === "ckb";

  const typeLabel = (type: string) => {
    if (type === "sales_invoice") return t('Sales Invoice');
    if (type === "sales_return") return t('Sales Return');
    if (type === "agent_payment") return t('Agent Payment');
    return t('Payment');
  };

  const handleView = async (entry: StatementEntry & { balance: number }) => {
    try {
      if (entry.type === "sales_invoice") {
        setReportInvoiceId(entry.id);
        setReportInvoiceOpen(true);
      } else if (entry.type === "sales_return") {
        setReportReturnId(entry.id);
        setReportReturnOpen(true);
      } else if (entry.type === "agent_payment") {
        const res = await fetch(`/api/agent-payments`, { credentials: "include" });
        if (!res.ok) throw new Error();
        const all = await res.json();
        const pay = all.find((p: any) => p.id === entry.id);
        if (pay) { setReportPayment(pay); setReportPaymentOpen(true); }
      }
    } catch {
      toast({ title: t("Failed to load data"), variant: "destructive" });
    }
  };

  const handleEdit = (entry: StatementEntry & { balance: number }) => {
    if (entry.type === "sales_invoice" || entry.type === "sales_return") {
      let path = "";
      if (entry.type === "sales_invoice") path = `/sales-invoice-${entry.currency.toLowerCase()}?editId=${entry.id}`;
      else if (entry.type === "sales_return") path = `/sales-return-${entry.currency.toLowerCase()}?editId=${entry.id}`;
      if (path) window.open(path, "_blank");
    } else {
      setEditEntry({ id: entry.id, type: entry.type, currency: entry.currency, reference: entry.reference });
      setEditOpen(true);
    }
  };

  const getDeleteApi = (type: string) => {
    if (type === "sales_invoice") return "/api/sales-invoices";
    if (type === "sales_return") return "/api/sales-returns";
    if (type === "agent_payment") return "/api/agent-payments";
    return "";
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      const api = getDeleteApi(deleteEntry.type);
      await apiRequest("DELETE", `${api}/${deleteEntry.id}`);
      toast({ title: t("Deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-statement"] });
    } catch (err: any) {
      toast({ title: t("Failed to delete invoice"), description: err?.message, variant: "destructive" });
    }
    setDeleteEntry(null);
  };

  const fontLink = `<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">`;

  const handlePrint = () => {
    if (!statement || !entriesWithBalance.length) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = statement.agent?.name || "";
    const numAlign = isRtl ? "left" : "right";

    const rows = entriesWithBalance.map((entry, i) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${formatDate(entry.date)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;font-size:9pt;">${entry.reference || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">${entry.time}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:600;">${typeLabel(entry.type)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;">${entry.description || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#dc2626;font-size:9pt;">${entry.debit > 0 ? fmt(entry.debit) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#16a34a;font-size:9pt;">${entry.credit > 0 ? fmt(entry.credit) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:800;color:#1e40af;font-size:9pt;">${fmt(entry.balance)}</td>
      </tr>
    `).join("");

    const openingRow = openingBalance !== 0 ? `
      <tr style="background:#eff6ff;">
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:700;color:#1e40af;">${t('Opening Balance')}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:700;">${t('Opening Balance')}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#dc2626;font-size:9pt;">${openingBalance > 0 ? fmt(openingBalance) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#16a34a;font-size:9pt;">${openingBalance < 0 ? fmt(Math.abs(openingBalance)) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:800;color:#1e40af;font-size:9pt;">${fmt(openingBalance)}</td>
      </tr>
    ` : "";

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Rep Statement")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#000;font-weight:600;flex-wrap:wrap;direction:${dir};">
                <span>${t("Representative Name")}: <strong style="color:#64748b">${repName}</strong></span>
                <span>${t("From Date")}: <strong>${formatDate(fromDate)}</strong></span>
                <span>${t("To Date")}: <strong>${formatDate(toDate)}</strong></span>
              </div>
              <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#000;font-weight:600;flex-wrap:wrap;margin-top:6px;direction:${dir};">
                <span style="color:#1e40af;">${t("Opening Balance")}: <strong>${fmt(openingBalance)}</strong></span>
                <span style="color:#dc2626;">${t("Total Debit")}: <strong>${fmt(totalDebit)}</strong></span>
                <span style="color:#16a34a;">${t("Total Credit")}: <strong>${fmt(totalCredit)}</strong></span>
                <span style="color:${finalBalance > 0 ? '#dc2626' : finalBalance < 0 ? '#16a34a' : '#1e40af'};">${finalBalance > 0 ? `${t("Remaining at")} ${repName}` : finalBalance < 0 ? `${t("Remaining at")} ${companyProfile?.name || t("Company")}` : t("Zero Account")}: <strong>${fmt(Math.abs(finalBalance))}</strong></span>
              </div>
            </div>
            <div style="background:#64748b;color:#fff;padding:10px 14px;border-radius:8px;min-width:130px;text-align:center;">
              <h1 style="font-size:11pt;margin:0;font-weight:800;line-height:1.3;">${t("Rep Statement")}</h1>
              <div style="font-size:10pt;font-weight:700;margin-top:3px;">${currency}</div>
            </div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Invoice Number")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Time")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Type")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Description")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${numAlign};">${t("Debit")} (${currencyLabel})</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${numAlign};">${t("Credit")} (${currencyLabel})</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${numAlign};">${t("Cumulative Balance")} (${currencyLabel})</th>
            </tr>
          </thead>
          <tbody>
            ${openingRow}
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="6" style="padding:8px;font-size:10pt;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#dc2626;text-align:${numAlign};">${fmt(totalDebit)}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#16a34a;text-align:${numAlign};">${fmt(totalCredit)}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#1e40af;text-align:${numAlign};">${fmt(finalBalance)}</td>
            </tr>
          </tbody>
        </table>
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => setTimeout(() => win.print(), 300));
      } else {
        setTimeout(() => win.print(), 1200);
      }
    }
  };

  const handlePrintDetails = () => {
    if (!statement || !entriesWithBalance.length) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = statement.agent?.name || "";
    const numAlign = isRtl ? "left" : "right";

    const invoiceItemsMap = invoiceItemsRef.current;
    const invoiceDataMap = invoiceDataRef.current;

    const allEntries = [...entriesWithBalance].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00:00"}`).getTime();
      const db2 = new Date(`${b.date}T${b.time || "00:00:00"}`).getTime();
      return da - db2;
    });

    let seqNum = 0;
    let cumBalance = openingBalance;
    const allEntriesWithCum = allEntries.map(e => {
      cumBalance += e.debit - e.credit;
      return { ...e, cumBalance };
    });

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Details")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#000;font-weight:600;flex-wrap:wrap;direction:${dir};">
                <span>${t("Representative Name")}: <strong style="color:#64748b">${repName}</strong></span>
                <span>${t("From Date")}: <strong>${formatDate(fromDate)}</strong></span>
                <span>${t("To Date")}: <strong>${formatDate(toDate)}</strong></span>
              </div>
              <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#000;font-weight:600;flex-wrap:wrap;margin-top:6px;direction:${dir};">
                <span style="color:#1e40af;">${t("Opening Balance")}: <strong>${fmt(openingBalance)}</strong></span>
                <span style="color:#dc2626;">${t("Total Debit")}: <strong>${fmt(totalDebit)}</strong></span>
                <span style="color:#16a34a;">${t("Total Credit")}: <strong>${fmt(totalCredit)}</strong></span>
                <span style="color:${finalBalance > 0 ? '#dc2626' : finalBalance < 0 ? '#16a34a' : '#1e40af'};">${finalBalance > 0 ? `${t("Remaining at")} ${repName}` : finalBalance < 0 ? `${t("Remaining at")} ${companyProfile?.name || t("Company")}` : t("Zero Account")}: <strong>${fmt(Math.abs(finalBalance))}</strong></span>
              </div>
            </div>
            <div style="background:#64748b;color:#fff;padding:10px 14px;border-radius:8px;min-width:130px;text-align:center;">
              <h1 style="font-size:11pt;margin:0;font-weight:800;line-height:1.3;">${t("Rep Statement")}</h1>
              <div style="font-size:10pt;font-weight:700;margin-top:3px;">${currency}</div>
            </div>
          </div>
        </div>

        <div style="direction:${dir};">
          <div style="margin-bottom:14px;border:1px solid #93c5fd;border-radius:6px;overflow:hidden;">
            <div style="background:#eff6ff;padding:8px 12px;font-size:9pt;font-weight:700;direction:${dir};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;color:#1e40af;">
              <span>${t("Opening Balance")}</span>
              <span style="display:flex;align-items:center;">
                <span style="font-family:monospace;font-size:10pt;font-weight:900;min-width:100px;text-align:left;">${fmt(openingBalance)}</span>
                <span style="width:40px;"></span>
                <span style="color:#64748b;font-size:9pt;font-weight:700;white-space:nowrap;min-width:140px;text-align:left;">${t("Cumulative Balance")}: ${fmt(openingBalance)}</span>
              </span>
            </div>
          </div>
          ${allEntriesWithCum.map(entry => {
            seqNum++;
            const isInvoice = entry.type === "sales_invoice" || entry.type === "sales_return";
            const isReturn = entry.type === "sales_return";
            const isPayment = entry.type === "agent_payment";

            if (isInvoice) {
              const items = invoiceItemsMap[entry.id] || [];
              const inv = invoiceDataMap[entry.id];
              const hasGift = items.some((item: any) => parseFloat(item.gift || "0") > 0);
              const colCount = hasGift ? 5 : 4;
              const amountPaid = parseFloat(inv?.amountPaid || "0");
              const discount = parseFloat(inv?.discount || "0");
              const remaining = parseFloat(inv?.remaining || "0");
              return `
                <div style="margin-bottom:14px;border:1px solid ${isReturn ? '#fecaca' : '#e2e8f0'};border-radius:6px;overflow:hidden;">
                  <div style="background:${isReturn ? '#fef2f2' : '#f1f5f9'};padding:5px 8px;font-size:9pt;font-weight:700;direction:${dir};text-align:right;color:${isReturn ? '#dc2626' : '#000'};">
                    <span>${seqNum}. ${isReturn ? t("Returns") : t("Sales Invoice")} &nbsp;&nbsp; ${t("Invoice Number")}: ${entry.reference || "-"} &nbsp;&nbsp; ${t("Date")}: ${formatDate(entry.date)}</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:9pt;">
                    <thead>
                      <tr style="background:${isReturn ? '#fecaca' : '#e2e8f0'};color:${isReturn ? '#dc2626' : '#000'};">
                        <th style="padding:3px 6px;font-weight:700;width:45%;">${t("Product Name")}</th>
                        <th style="padding:3px 4px;font-weight:700;text-align:center;width:50px;">${t("Quantity")}</th>
                        ${hasGift ? `<th style="padding:3px 4px;font-weight:700;text-align:center;width:45px;">${t("Gift")}</th>` : ""}
                        <th style="padding:3px 4px;font-weight:700;text-align:${numAlign};width:65px;">${t("Price")}</th>
                        <th style="padding:3px 4px;font-weight:700;text-align:${numAlign};width:70px;">${t("Amount")}</th>
                        <th style="padding:3px 6px;font-weight:700;text-align:${numAlign};min-width:80px;"></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map((item: any) => `
                        <tr style="color:${isReturn ? '#dc2626' : 'inherit'};">
                          <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;width:45%;">${item.productName || "-"}</td>
                          <td style="padding:3px 4px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;width:50px;">${item.quantity || "0"}</td>
                          ${hasGift ? `<td style="padding:3px 4px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;width:45px;">${item.gift || "0"}</td>` : ""}
                          <td style="padding:3px 4px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;width:65px;">${fmt(parseFloat(item.price || "0"))}</td>
                          <td style="padding:3px 4px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;font-weight:700;width:70px;">${fmt(parseFloat(item.amount || "0"))}</td>
                          <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;"></td>
                        </tr>
                      `).join("")}
                      <tr style="background:#f8fafc;font-weight:700;font-size:9pt;">
                        <td colspan="${colCount + 1}" style="padding:4px 6px;">
                          <div style="display:flex;align-items:center;gap:36px;direction:ltr;">
                            <span style="color:#64748b;white-space:nowrap;">${t("Cumulative Balance")}: <span style="font-family:monospace;">${fmt(entry.cumBalance)}</span></span>
                            <span style="color:${isReturn ? '#dc2626' : '#2563eb'};font-family:monospace;">${remaining > 0 ? `${t("Remaining")}: ${fmt(remaining)}` : ""}</span>
                            ${!isReturn && discount > 0 ? `<span style="color:#d97706;">${t("Discount")}: <span style="font-family:monospace;">${fmt(discount)}</span></span>` : ""}
                            ${!isReturn && amountPaid > 0 ? `<span style="color:#16a34a;">${t("Amount Received")}: <span style="font-family:monospace;">${fmt(amountPaid)}</span></span>` : ""}
                            ${isReturn && amountPaid > 0 ? `<span style="color:#dc2626;">${t("Amount Paid")}: <span style="font-family:monospace;">${fmt(amountPaid)}</span></span>` : ""}
                            <span style="color:${isReturn ? '#dc2626' : '#64748b'};">${t("Total")}: <span style="font-family:monospace;">${fmt(entry.debit || entry.credit)}</span></span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `;
            }

            if (isPayment) {
              return `
                <div style="margin-bottom:14px;border:1px solid #bbf7d0;border-radius:6px;overflow:hidden;">
                  <div style="background:#f0fdf4;padding:8px 12px;font-size:9pt;font-weight:700;direction:${dir};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;color:#16a34a;">
                    <span>${seqNum}. ${t("Agent Payment")} &nbsp;&nbsp; ${t("Invoice Number")}: ${entry.reference || "-"} &nbsp;&nbsp; ${t("Date")}: ${formatDate(entry.date)}${entry.description ? ` &nbsp;&nbsp; ${entry.description}` : ""}</span>
                    <span style="display:flex;align-items:center;">
                      <span style="font-family:monospace;font-size:10pt;font-weight:700;min-width:100px;text-align:left;">${fmt(entry.credit)}</span>
                      <span style="width:40px;"></span>
                      <span style="color:#64748b;font-size:10pt;font-weight:700;white-space:nowrap;min-width:140px;text-align:left;">${t("Cumulative Balance")}: ${fmt(entry.cumBalance)}</span>
                    </span>
                  </div>
                </div>
              `;
            }

            return "";
          }).join("")}
          ${allEntriesWithCum.length === 0 ? `<p style="text-align:center;color:#999;font-size:9pt;">${t("No data")}</p>` : ""}
        </div>
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => setTimeout(() => win.print(), 300));
      } else {
        setTimeout(() => win.print(), 1200);
      }
    }
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "remaining", label: t("Remaining Products with Rep"), icon: Package },
    { key: "salesByProduct", label: t("Sales by Product"), icon: FileText },
    { key: "sales", label: t("Sales by Representative"), icon: ShoppingCart },
    { key: "returns", label: t("Returns by Representative"), icon: RotateCcw },
    { key: "receipts", label: t("Receipts by Representative"), icon: Receipt },
    { key: "paymentsStatement", label: t("Payments by Representative"), icon: CreditCard },
    { key: "loads", label: t("Product Loads for Rep"), icon: Truck },
    { key: "agentReceipts", label: t("Agent Receipt Statement"), icon: Wallet },
    { key: "agentExpenses", label: t("Agent Expense Statement"), icon: DollarSign },
  ];

  const handlePrintRemaining = () => {
    if (!repProducts || repProducts.length === 0) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";
    const today = formatDate(new Date().toISOString().slice(0, 10));

    const rows = repProducts.map((p: any, i: number) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:600;">${p.productName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:600;">${p.productCode}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;font-weight:600;">${p.remainingBig} ${resolveUnitName(p.bigUnit, unitsList || [])}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;font-weight:600;">${p.remainingSmall} ${resolveUnitName(p.smallUnit, unitsList || [])}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Remaining Products with Rep")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Remaining Products with Rep")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Rep")}: ${repName}</p>
              <p style="text-align:center;margin:4px 0 0;font-size:9pt;color:#64748b;">${t("From")}: ${formatDate(fromDate)} - ${t("To")}: ${formatDate(toDate)}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Product Name")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Product Code")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Remaining (Big Unit)")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Remaining (Small Unit)")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="3" style="padding:8px;font-size:10pt;text-align:${isRtl ? "right" : "left"};">${t("Total Products")}: ${repProducts.length}</td>
              <td colspan="2" style="padding:8px;"></td>
            </tr>
          </tbody>
        </table>
      </body></html>`;

    const win = window.open("", "_blank", "width=900,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => setTimeout(() => win.print(), 300));
      } else {
        setTimeout(() => win.print(), 1200);
      }
    }
  };

  const renderRemainingTab = () => {
    if (productsLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!repProducts || repProducts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Package className="w-10 h-10 mb-2" />
          <p className="font-semibold">{t('No products found')}</p>
        </div>
      );
    }
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Button onClick={handlePrintRemaining} className="bg-primary text-white gap-2 h-11" data-testid="button-print-remaining-products">
            <Printer className="w-5 h-5" />
            {t('Print Report')}
          </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t('Product Name')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Product Code')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Remaining (Big Unit)')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Remaining (Small Unit)')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repProducts.map((p: any, i: number) => (
                <TableRow key={p.productId} data-testid={`row-rep-product-${p.productId}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="text-sm font-semibold">{p.productName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{p.productCode}</TableCell>
                  <TableCell className="text-sm font-semibold">
                    {p.remainingBig} {resolveUnitName(p.bigUnit, unitsList || [])}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {p.remainingSmall} {resolveUnitName(p.smallUnit, unitsList || [])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const handlePrintSalesByProduct = () => {
    if (!repSalesByProduct || repSalesByProduct.length === 0) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";
    const grandTotalUsd = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalAmountUsd || 0), 0);
    const grandTotalIqd = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalAmountIqd || 0), 0);
    const grandRetUsdPrint = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnAmountUsd || 0), 0);
    const grandRetIqdPrint = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnAmountIqd || 0), 0);
    const grandRetQtyPrint = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnQuantity || 0), 0);
    const grandTotalGiftPrint = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalGift || 0), 0);
    const grandRetGiftPrint = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnGift || 0), 0);
    const hasSalesGiftPrint = grandTotalGiftPrint > 0;
    const hasReturnGiftPrint = grandRetGiftPrint > 0;

    const rows = repSalesByProduct.map((p: any, i: number) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:600;">${p.productName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:600;">${p.productCode}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;font-weight:600;">${p.unit}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:700;">${p.totalQuantity}</td>
        ${hasSalesGiftPrint ? `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${p.totalGift || 0}</td>` : ""}
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:8pt;">${(p.invoiceNumbers || []).join(" , ")}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:700;color:#dc2626;">${p.returnQuantity || 0}</td>
        ${hasReturnGiftPrint ? `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;color:#dc2626;">${p.returnGift || 0}</td>` : ""}
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:8pt;color:#dc2626;">${(p.returnNumbers || []).join(" , ")}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:700;color:#1e40af;">${p.totalAmountUsd ? usd(p.totalAmountUsd) : "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:700;color:#1e40af;">${p.totalAmountIqd ? fmtIqd(p.totalAmountIqd) : "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:700;color:#dc2626;">${p.returnAmountUsd ? usd(p.returnAmountUsd) : "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;font-weight:700;color:#dc2626;">${p.returnAmountIqd ? fmtIqd(p.returnAmountIqd) : "-"}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Sales by Product")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Sales by Product")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Rep")}: ${repName}</p>
              <p style="text-align:center;margin:4px 0 0;font-size:9pt;color:#64748b;">${t("From")}: ${formatDate(fromDate)} - ${t("To")}: ${formatDate(toDate)}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Product Name")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Product Code")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Unit")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Total Quantity")}</th>
              ${hasSalesGiftPrint ? `<th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Gift")}</th>` : ""}
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Invoice Number")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;color:#dc2626;">${t("Returned")}</th>
              ${hasReturnGiftPrint ? `<th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;color:#dc2626;">${t("Returned")} ${t("Gift")}</th>` : ""}
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;color:#dc2626;">${t("Return Number")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Total")} (USD)</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Total")} (IQD)</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;color:#dc2626;">${t("Returned")} (USD)</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;color:#dc2626;">${t("Returned")} (IQD)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:10pt;text-align:${isRtl ? "right" : "left"};">${t("Total Products")}: ${repSalesByProduct.length}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;text-align:center;">${repSalesByProduct.reduce((s: number, p: any) => s + p.totalQuantity, 0)}</td>
              ${hasSalesGiftPrint ? `<td style="padding:8px;font-size:10pt;font-family:monospace;text-align:center;">${grandTotalGiftPrint}</td>` : ""}
              <td style="padding:8px;"></td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#dc2626;text-align:center;">${grandRetQtyPrint}</td>
              ${hasReturnGiftPrint ? `<td style="padding:8px;font-size:10pt;font-family:monospace;color:#dc2626;text-align:center;">${grandRetGiftPrint}</td>` : ""}
              <td style="padding:8px;"></td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#1e40af;text-align:center;">${grandTotalUsd ? usd(grandTotalUsd) : "-"}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#1e40af;text-align:center;">${grandTotalIqd ? fmtIqd(grandTotalIqd) : "-"}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#dc2626;text-align:center;">${grandRetUsdPrint ? usd(grandRetUsdPrint) : "-"}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#dc2626;text-align:center;">${grandRetIqdPrint ? fmtIqd(grandRetIqdPrint) : "-"}</td>
            </tr>
          </tbody>
        </table>
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => setTimeout(() => win.print(), 300));
      } else {
        setTimeout(() => win.print(), 1200);
      }
    }
  };

  const renderSalesByProductTab = () => {
    if (salesByProductLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!repSalesByProduct || repSalesByProduct.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mb-2" />
          <p className="font-semibold">{t('No sales found')}</p>
        </div>
      );
    }
    const grandTotalUsd = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalAmountUsd || 0), 0);
    const grandTotalIqd = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalAmountIqd || 0), 0);
    const grandTotalQty = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalQuantity || 0), 0);
    const grandTotalRetQty = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnQuantity || 0), 0);
    const grandRetUsd = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnAmountUsd || 0), 0);
    const grandRetIqd = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnAmountIqd || 0), 0);
    const grandTotalGift = repSalesByProduct.reduce((s: number, p: any) => s + (p.totalGift || 0), 0);
    const grandRetGift = repSalesByProduct.reduce((s: number, p: any) => s + (p.returnGift || 0), 0);
    const hasSalesGift = grandTotalGift > 0;
    const hasReturnGift = grandRetGift > 0;

    return (
      <div>
        <div className="flex justify-end mb-4">
          <Button onClick={handlePrintSalesByProduct} className="bg-primary text-white gap-2 h-11" data-testid="button-print-sales-by-product">
            <Printer className="w-5 h-5" />
            {t('Print Report')}
          </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t('Product Name')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Product Code')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Unit')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Total Quantity')}</TableHead>
                {hasSalesGift && <TableHead className="text-sm font-bold">{t('Gift')}</TableHead>}
                <TableHead className="text-sm font-bold">{t('Invoice Number')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Returned')}</TableHead>
                {hasReturnGift && <TableHead className="text-sm font-bold">{t('Returned')} {t('Gift')}</TableHead>}
                <TableHead className="text-sm font-bold">{t('Return Number')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Total')} (USD)</TableHead>
                <TableHead className="text-sm font-bold">{t('Total')} (IQD)</TableHead>
                <TableHead className="text-sm font-bold">{t('Returned')} (USD)</TableHead>
                <TableHead className="text-sm font-bold">{t('Returned')} (IQD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repSalesByProduct.map((p: any, i: number) => (
                <TableRow key={`${p.productCode}_${p.unit}`} data-testid={`row-sales-product-${p.productCode}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="text-sm font-semibold">{p.productName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{p.productCode}</TableCell>
                  <TableCell className="text-sm font-semibold">{p.unit}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{p.totalQuantity}</TableCell>
                  {hasSalesGift && <TableCell className="font-mono text-sm font-semibold">{p.totalGift || 0}</TableCell>}
                  <TableCell className="font-mono text-sm font-semibold">{(p.invoiceNumbers || []).join(" , ")}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-red-600">{p.returnQuantity || 0}</TableCell>
                  {hasReturnGift && <TableCell className="font-mono text-sm font-semibold text-red-600">{p.returnGift || 0}</TableCell>}
                  <TableCell className="font-mono text-sm font-semibold text-red-600">{(p.returnNumbers || []).join(" , ")}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-blue-700">{p.totalAmountUsd ? usd(p.totalAmountUsd) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-blue-700">{p.totalAmountIqd ? fmtIqd(p.totalAmountIqd) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-red-600">{p.returnAmountUsd ? usd(p.returnAmountUsd) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-red-600">{p.returnAmountIqd ? fmtIqd(p.returnAmountIqd) : "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell colSpan={4} className="text-sm font-bold">{t('Total Products')}: {repSalesByProduct.length}</TableCell>
                <TableCell className="font-mono text-sm font-bold">{grandTotalQty}</TableCell>
                {hasSalesGift && <TableCell className="font-mono text-sm font-bold">{grandTotalGift}</TableCell>}
                <TableCell></TableCell>
                <TableCell className="font-mono text-sm font-bold text-red-600">{grandTotalRetQty}</TableCell>
                {hasReturnGift && <TableCell className="font-mono text-sm font-bold text-red-600">{grandRetGift}</TableCell>}
                <TableCell></TableCell>
                <TableCell className="font-mono text-sm font-bold text-blue-700">{grandTotalUsd ? usd(grandTotalUsd) : "-"}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-blue-700">{grandTotalIqd ? fmtIqd(grandTotalIqd) : "-"}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-red-600">{grandRetUsd ? usd(grandRetUsd) : "-"}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-red-600">{grandRetIqd ? fmtIqd(grandRetIqd) : "-"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const handlePrintSalesTab = () => {
    if (!repSales || repSales.length === 0) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";
    const salesUsd = repSales.filter((s: any) => s.currency === "USD");
    const salesIqd = repSales.filter((s: any) => s.currency === "IQD");
    const totalUsd = salesUsd.reduce((s: number, inv: any) => s + parseFloat(inv.subtotal || "0"), 0);
    const totalIqd = salesIqd.reduce((s: number, inv: any) => s + parseFloat(inv.subtotal || "0"), 0);
    const totalDiscountUsd = salesUsd.reduce((s: number, inv: any) => s + parseFloat(inv.discount || "0"), 0);
    const totalDiscountIqd = salesIqd.reduce((s: number, inv: any) => s + parseFloat(inv.discount || "0"), 0);
    const totalPaidUsd = salesUsd.reduce((s: number, inv: any) => s + parseFloat(inv.amountPaid || "0"), 0);
    const totalPaidIqd = salesIqd.reduce((s: number, inv: any) => s + parseFloat(inv.amountPaid || "0"), 0);
    const totalRemUsd = salesUsd.reduce((s: number, inv: any) => s + parseFloat(inv.remaining || "0"), 0);
    const totalRemIqd = salesIqd.reduce((s: number, inv: any) => s + parseFloat(inv.remaining || "0"), 0);

    const buildTable = (items: any[], currency: string, total: number, totalDiscount: number, totalPaid: number, totalRem: number) => {
      const fmt = currency === "USD" ? usd : fmtIqd;
      const rows = items.map((inv: any, i: number) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${inv.invoiceNumber}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(inv.date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${inv.customerName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${fmt(parseFloat(inv.subtotal || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#ea580c;">${fmt(parseFloat(inv.discount || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#16a34a;">${fmt(parseFloat(inv.amountPaid || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#dc2626;">${fmt(parseFloat(inv.remaining || "0"))}</td>
        </tr>
      `).join("");
      return `
        <h3 style="font-size:13pt;font-weight:700;margin:12px 0 6px;color:${currency === "USD" ? "#1d4ed8" : "#047857"};">${currency} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Invoice Number")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Total")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Discount")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Cash Received")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Remaining")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:11pt;font-weight:700;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;">${fmt(total)}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#ea580c;">${fmt(totalDiscount)}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#16a34a;">${fmt(totalPaid)}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#dc2626;">${fmt(totalRem)}</td>
            </tr>
          </tbody>
        </table>`;
    };

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Sales")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Sales")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Rep")}: ${repName}</p>
              <p style="text-align:center;margin:4px 0 0;font-size:9pt;color:#64748b;">${t("From")}: ${formatDate(fromDate)} - ${t("To")}: ${formatDate(toDate)}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>
        ${salesUsd.length > 0 ? buildTable(salesUsd, "USD", totalUsd, totalDiscountUsd, totalPaidUsd, totalRemUsd) : ""}
        ${salesIqd.length > 0 ? buildTable(salesIqd, "IQD", totalIqd, totalDiscountIqd, totalPaidIqd, totalRemIqd) : ""}
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => { win.print(); });
      } else {
        setTimeout(() => { win.print(); }, 500);
      }
    }
  };

  const renderSalesTab = () => {
    if (salesLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    const salesUsd = (repSales || []).filter((s: any) => s.currency === "USD");
    const salesIqd = (repSales || []).filter((s: any) => s.currency === "IQD");
    const totalUsd = salesUsd.reduce((s: number, inv: any) => s + parseFloat(inv.subtotal || "0"), 0);
    const totalIqd = salesIqd.reduce((s: number, inv: any) => s + parseFloat(inv.subtotal || "0"), 0);

    if (!repSales || repSales.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><ShoppingCart className="w-10 h-10 mb-2" /><p className="font-semibold">{t('No sales found')}</p></div>;
    }
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={handlePrintSalesTab} className="bg-primary text-white gap-2 h-11" data-testid="button-print-sales-tab">
            <Printer className="w-5 h-5" />
            {t('Print Report')}
          </Button>
        </div>
        {salesUsd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">USD ({salesUsd.length})</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Invoice Number')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Total')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Discount')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Cash Received')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Remaining')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesUsd.map((inv: any, i: number) => (
                    <TableRow key={inv.id} data-testid={`row-rep-sale-usd-${inv.id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{formatDate(inv.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{inv.customerName}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{usd(parseFloat(inv.subtotal || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-orange-600">{usd(parseFloat(inv.discount || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">{usd(parseFloat(inv.amountPaid || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">{usd(parseFloat(inv.remaining || "0"))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{usd(totalUsd)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {salesIqd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">IQD ({salesIqd.length})</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Invoice Number')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Total')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Discount')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Cash Received')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Remaining')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesIqd.map((inv: any, i: number) => (
                    <TableRow key={inv.id} data-testid={`row-rep-sale-iqd-${inv.id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{formatDate(inv.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{inv.customerName}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{fmtIqd(parseFloat(inv.subtotal || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-orange-600">{fmtIqd(parseFloat(inv.discount || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">{fmtIqd(parseFloat(inv.amountPaid || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">{fmtIqd(parseFloat(inv.remaining || "0"))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{fmtIqd(totalIqd)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handlePrintReturnsTab = () => {
    if (!repReturns || repReturns.length === 0) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";
    const returnsUsd = repReturns.filter((r: any) => r.currency === "USD");
    const returnsIqd = repReturns.filter((r: any) => r.currency === "IQD");
    const totalUsd = returnsUsd.reduce((s: number, r: any) => s + parseFloat(r.subtotal || "0"), 0);
    const totalIqd = returnsIqd.reduce((s: number, r: any) => s + parseFloat(r.subtotal || "0"), 0);
    const totalDiscountUsd = returnsUsd.reduce((s: number, r: any) => s + parseFloat(r.discount || "0"), 0);
    const totalDiscountIqd = returnsIqd.reduce((s: number, r: any) => s + parseFloat(r.discount || "0"), 0);
    const totalPaidUsd = returnsUsd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
    const totalPaidIqd = returnsIqd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
    const totalRemUsd = returnsUsd.reduce((s: number, r: any) => s + parseFloat(r.remaining || "0"), 0);
    const totalRemIqd = returnsIqd.reduce((s: number, r: any) => s + parseFloat(r.remaining || "0"), 0);

    const buildTable = (items: any[], currency: string, total: number, totalDiscount: number, totalPaid: number, totalRem: number) => {
      const fmt = currency === "USD" ? usd : fmtIqd;
      const rows = items.map((r: any, i: number) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${r.returnNumber}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(r.date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${r.customerName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${fmt(parseFloat(r.subtotal || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#16a34a;">${fmt(parseFloat(r.amountPaid || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#dc2626;">${fmt(parseFloat(r.remaining || "0"))}</td>
        </tr>
      `).join("");
      return `
        <h3 style="font-size:13pt;font-weight:700;margin:12px 0 6px;color:${currency === "USD" ? "#1d4ed8" : "#047857"};">${currency} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Return Number Short")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Total")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Amount Paid")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Remaining")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:11pt;font-weight:700;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;">${fmt(total)}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#16a34a;">${fmt(totalPaid)}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#dc2626;">${fmt(totalRem)}</td>
            </tr>
          </tbody>
        </table>`;
    };

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Returns")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Returns")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Rep")}: ${repName}</p>
              <p style="text-align:center;margin:4px 0 0;font-size:9pt;color:#64748b;">${t("From")}: ${formatDate(fromDate)} - ${t("To")}: ${formatDate(toDate)}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>
        ${returnsUsd.length > 0 ? buildTable(returnsUsd, "USD", totalUsd, totalDiscountUsd, totalPaidUsd, totalRemUsd) : ""}
        ${returnsIqd.length > 0 ? buildTable(returnsIqd, "IQD", totalIqd, totalDiscountIqd, totalPaidIqd, totalRemIqd) : ""}
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => { win.print(); });
      } else {
        setTimeout(() => { win.print(); }, 500);
      }
    }
  };

  const renderReturnsTab = () => {
    if (returnsLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    const returnsUsd = (repReturns || []).filter((r: any) => r.currency === "USD");
    const returnsIqd = (repReturns || []).filter((r: any) => r.currency === "IQD");
    const totalUsd = returnsUsd.reduce((s: number, r: any) => s + parseFloat(r.subtotal || "0"), 0);
    const totalIqd = returnsIqd.reduce((s: number, r: any) => s + parseFloat(r.subtotal || "0"), 0);

    if (!repReturns || repReturns.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><RotateCcw className="w-10 h-10 mb-2" /><p className="font-semibold">{t('No returns found')}</p></div>;
    }
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={handlePrintReturnsTab} className="bg-primary text-white gap-2 h-11" data-testid="button-print-returns-tab">
            <Printer className="w-5 h-5" />
            {t('Print Report')}
          </Button>
        </div>
        {returnsUsd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">USD ({returnsUsd.length})</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Return Number Short')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Total')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Amount Paid')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Remaining')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsUsd.map((r: any, i: number) => (
                    <TableRow key={r.id} data-testid={`row-rep-return-usd-${r.id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{r.returnNumber}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{r.customerName}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{usd(parseFloat(r.subtotal || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">{usd(parseFloat(r.amountPaid || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">{usd(parseFloat(r.remaining || "0"))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{usd(totalUsd)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {returnsIqd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">IQD ({returnsIqd.length})</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Return Number Short')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Total')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Amount Paid')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Remaining')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsIqd.map((r: any, i: number) => (
                    <TableRow key={r.id} data-testid={`row-rep-return-iqd-${r.id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{r.returnNumber}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{r.customerName}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{fmtIqd(parseFloat(r.subtotal || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">{fmtIqd(parseFloat(r.amountPaid || "0"))}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">{fmtIqd(parseFloat(r.remaining || "0"))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{fmtIqd(totalIqd)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handlePrintReceiptsTab = () => {
    const allReceipts = repReceipts?.receipts || [];
    const allCashFromSales = repReceipts?.cashFromSales || [];
    if (allReceipts.length === 0 && allCashFromSales.length === 0) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";
    const receiptsUsd = allReceipts.filter((r: any) => r.currency === "USD");
    const receiptsIqd = allReceipts.filter((r: any) => r.currency === "IQD");
    const cashSalesUsd = allCashFromSales.filter((s: any) => s.currency === "USD");
    const cashSalesIqd = allCashFromSales.filter((s: any) => s.currency === "IQD");

    const buildReceiptTable = (items: any[], currency: string, label: string) => {
      const fmt = currency === "USD" ? usd : fmtIqd;
      const total = items.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0);
      const totalDiscount = items.reduce((s: number, r: any) => s + parseFloat(r.discount || "0"), 0);
      const rows = items.map((r: any, i: number) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${r.receiptNumber}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(r.date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${r.customerName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#16a34a;">${fmt(parseFloat(r.amount || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#ea580c;">${fmt(parseFloat(r.discount || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${r.note || "-"}</td>
        </tr>
      `).join("");
      return `
        <h3 style="font-size:13pt;font-weight:700;margin:12px 0 6px;color:${currency === "USD" ? "#1d4ed8" : "#047857"};">${label} - ${currency} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Receipt Number Short")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Amount")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Discount")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:11pt;font-weight:700;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#16a34a;">${fmt(total)}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#ea580c;">${fmt(totalDiscount)}</td>
              <td style="padding:8px;"></td>
            </tr>
          </tbody>
        </table>`;
    };

    const buildCashFromSalesTable = (items: any[], currency: string, label: string) => {
      const fmt = currency === "USD" ? usd : fmtIqd;
      const total = items.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
      const rows = items.map((s: any, i: number) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${s.invoiceNumber}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(s.date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${s.customerName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#16a34a;">${fmt(parseFloat(s.amountPaid || "0"))}</td>
        </tr>
      `).join("");
      return `
        <h3 style="font-size:13pt;font-weight:700;margin:12px 0 6px;color:${currency === "USD" ? "#1d4ed8" : "#047857"};">${label} - ${currency} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Invoice Number")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:11pt;font-weight:700;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#16a34a;">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>`;
    };

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Receipts")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Receipts")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Rep")}: ${repName}</p>
              <p style="text-align:center;margin:4px 0 0;font-size:9pt;color:#64748b;">${t("From")}: ${formatDate(fromDate)} - ${t("To")}: ${formatDate(toDate)}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>
        ${receiptsUsd.length > 0 ? buildReceiptTable(receiptsUsd, "USD", t("Customer Receipts")) : ""}
        ${receiptsIqd.length > 0 ? buildReceiptTable(receiptsIqd, "IQD", t("Customer Receipts")) : ""}
        ${cashSalesUsd.length > 0 ? buildCashFromSalesTable(cashSalesUsd, "USD", t("Cash Received")) : ""}
        ${cashSalesIqd.length > 0 ? buildCashFromSalesTable(cashSalesIqd, "IQD", t("Cash Received")) : ""}
        ${(() => {
          const grandTotalUsd = receiptsUsd.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0) + cashSalesUsd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
          const grandTotalIqd = receiptsIqd.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0) + cashSalesIqd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
          if (grandTotalUsd <= 0 && grandTotalIqd <= 0) return '';
          let html = '<div style="margin-top:20px;padding:12px 16px;background:#f1f5f9;border:2px solid #334155;border-radius:8px;">';
          html += '<h3 style="font-size:14pt;font-weight:800;margin:0 0 8px;color:#334155;text-align:center;">' + t("Grand Total") + '</h3>';
          if (grandTotalUsd > 0) html += '<p style="font-size:13pt;font-weight:700;margin:4px 0;text-align:center;color:#1d4ed8;">' + t("Customer Receipts") + ' + ' + t("Cash Received") + ' (USD): <span style="font-family:monospace;">' + usd(grandTotalUsd) + '</span></p>';
          if (grandTotalIqd > 0) html += '<p style="font-size:13pt;font-weight:700;margin:4px 0;text-align:center;color:#047857;">' + t("Customer Receipts") + ' + ' + t("Cash Received") + ' (IQD): <span style="font-family:monospace;">' + fmtIqd(grandTotalIqd) + '</span></p>';
          html += '</div>';
          return html;
        })()}
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => { win.print(); });
      } else {
        setTimeout(() => { win.print(); }, 500);
      }
    }
  };

  const renderReceiptsTab = () => {
    if (receiptsLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    const allReceipts = repReceipts?.receipts || [];
    const allCashFromSales = repReceipts?.cashFromSales || [];
    const receiptsUsd = allReceipts.filter((r: any) => r.currency === "USD");
    const receiptsIqd = allReceipts.filter((r: any) => r.currency === "IQD");
    const cashSalesUsd = allCashFromSales.filter((s: any) => s.currency === "USD");
    const cashSalesIqd = allCashFromSales.filter((s: any) => s.currency === "IQD");

    if (allReceipts.length === 0 && allCashFromSales.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><Receipt className="w-10 h-10 mb-2" /><p className="font-semibold">{t('No receipts found')}</p></div>;
    }

    const renderPrintButton = () => (
      <div className="flex justify-end mb-4">
        <Button onClick={handlePrintReceiptsTab} className="bg-primary text-white gap-2 h-11" data-testid="button-print-receipts-tab">
          <Printer className="w-5 h-5" />
          {t('Print Report')}
        </Button>
      </div>
    );

    const renderReceiptTable = (data: any[], curr: string) => {
      const fmtC = curr === "USD" ? usd : fmtIqd;
      const total = data.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0);
      return (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t('Receipt Number Short')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Amount')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Discount')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Note')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r: any, i: number) => (
                <TableRow key={r.id} data-testid={`row-rep-receipt-${curr.toLowerCase()}-${r.id}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{r.receiptNumber}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-sm font-semibold">{r.customerName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-green-600">{fmtC(parseFloat(r.amount || "0"))}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-orange-600">{fmtC(parseFloat(r.discount || "0"))}</TableCell>
                  <TableCell className="text-sm font-semibold max-w-[150px] truncate">{r.note || "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-green-700">{fmtC(total)}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );
    };

    const renderCashFromSalesTable = (data: any[], curr: string) => {
      const fmtC = curr === "USD" ? usd : fmtIqd;
      const total = data.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
      return (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t('Invoice Number')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s: any, i: number) => (
                <TableRow key={s.id} data-testid={`row-rep-cash-sale-${curr.toLowerCase()}-${s.id}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{s.invoiceNumber}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{formatDate(s.date)}</TableCell>
                  <TableCell className="text-sm font-semibold">{s.customerName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-green-600">{fmtC(parseFloat(s.amountPaid || "0"))}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-green-700">{fmtC(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {renderPrintButton()}
        {receiptsUsd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">{t('Customer Receipts')} - USD ({receiptsUsd.length})</h3>
            {renderReceiptTable(receiptsUsd, "USD")}
          </div>
        )}
        {receiptsIqd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">{t('Customer Receipts')} - IQD ({receiptsIqd.length})</h3>
            {renderReceiptTable(receiptsIqd, "IQD")}
          </div>
        )}
        {cashSalesUsd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">{t('Cash Received')} - USD ({cashSalesUsd.length})</h3>
            {renderCashFromSalesTable(cashSalesUsd, "USD")}
          </div>
        )}
        {cashSalesIqd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">{t('Cash Received')} - IQD ({cashSalesIqd.length})</h3>
            {renderCashFromSalesTable(cashSalesIqd, "IQD")}
          </div>
        )}
        {(() => {
          const grandTotalUsd = receiptsUsd.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0) + cashSalesUsd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
          const grandTotalIqd = receiptsIqd.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0) + cashSalesIqd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
          if (grandTotalUsd <= 0 && grandTotalIqd <= 0) return null;
          return (
            <div className="mt-4 p-4 bg-muted/50 border-2 border-slate-700 dark:border-slate-400 rounded-lg text-center">
              <h3 className="text-lg font-extrabold mb-2 text-slate-800 dark:text-slate-200">{t('Grand Total')}</h3>
              {grandTotalUsd > 0 && (
                <p className="text-base font-bold text-blue-700 dark:text-blue-400">
                  {t('Customer Receipts')} + {t('Cash Received')} (USD): <span className="font-mono">{usd(grandTotalUsd)}</span>
                </p>
              )}
              {grandTotalIqd > 0 && (
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {t('Customer Receipts')} + {t('Cash Received')} (IQD): <span className="font-mono">{fmtIqd(grandTotalIqd)}</span>
                </p>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const handlePrintPaymentsStatement = () => {
    const allReturnPayments = repPaymentsStatement?.returnPayments || [];
    const allPayments = repPaymentsStatement?.payments || [];
    if (allReturnPayments.length === 0 && allPayments.length === 0) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const repName = reps.find((r: any) => String(r.id) === String(selectedRepId))?.name || "";
    const returnPaymentsUsd = allReturnPayments.filter((r: any) => r.currency === "USD");
    const returnPaymentsIqd = allReturnPayments.filter((r: any) => r.currency === "IQD");
    const paymentsUsd = allPayments.filter((p: any) => p.currency === "USD");
    const paymentsIqd = allPayments.filter((p: any) => p.currency === "IQD");

    const buildReturnPaymentTable = (items: any[], currency: string, label: string) => {
      const fmt = currency === "USD" ? usd : fmtIqd;
      const total = items.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
      const rows = items.map((r: any, i: number) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${r.returnNumber}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(r.date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${r.customerName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#ea580c;">${fmt(parseFloat(r.amountPaid || "0"))}</td>
        </tr>
      `).join("");
      return `
        <h3 style="font-size:13pt;font-weight:700;margin:12px 0 6px;color:${currency === "USD" ? "#1d4ed8" : "#047857"};">${label} - ${currency} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Return Number Short")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Amount Paid")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:11pt;font-weight:700;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#ea580c;">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>`;
    };

    const buildPaymentTable = (items: any[], currency: string, label: string) => {
      const fmt = currency === "USD" ? usd : fmtIqd;
      const total = items.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
      const rows = items.map((p: any, i: number) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${i + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${p.paymentNumber}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(p.date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${p.agentName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;color:#1d4ed8;">${fmt(parseFloat(p.amount || "0"))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${p.note || "-"}</td>
        </tr>
      `).join("");
      return `
        <h3 style="font-size:13pt;font-weight:700;margin:12px 0 6px;color:${currency === "USD" ? "#1d4ed8" : "#047857"};">${label} - ${currency} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Payment Number Short")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Amount")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="4" style="padding:8px;font-size:11pt;font-weight:700;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:11pt;font-weight:700;font-family:monospace;text-align:center;color:#1d4ed8;">${fmt(total)}</td>
              <td style="padding:8px;"></td>
            </tr>
          </tbody>
        </table>`;
    };

    const grandTotalUsd = returnPaymentsUsd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0) + paymentsUsd.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
    const grandTotalIqd = returnPaymentsIqd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0) + paymentsIqd.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);

    const fontLink = i18n.language === "ku" ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">' : '<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">';

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Payments by Representative")} - ${repName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:10px;">
            <div style="width:70px;">
              ${companyProfile?.logo ? '<img src="' + companyProfile.logo + '" style="width:60px;height:60px;object-fit:contain;" />' : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Payments by Representative")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Rep")}: ${repName}</p>
              <p style="text-align:center;margin:4px 0 0;font-size:9pt;color:#64748b;">${t("From")}: ${formatDate(fromDate)} - ${t("To")}: ${formatDate(toDate)}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>
        ${returnPaymentsUsd.length > 0 ? buildReturnPaymentTable(returnPaymentsUsd, "USD", t("Return Payments")) : ""}
        ${returnPaymentsIqd.length > 0 ? buildReturnPaymentTable(returnPaymentsIqd, "IQD", t("Return Payments")) : ""}
        ${paymentsUsd.length > 0 ? buildPaymentTable(paymentsUsd, "USD", t("Customer Payments")) : ""}
        ${paymentsIqd.length > 0 ? buildPaymentTable(paymentsIqd, "IQD", t("Customer Payments")) : ""}
        ${(grandTotalUsd > 0 || grandTotalIqd > 0) ? (() => {
          let html = '<div style="margin-top:20px;padding:12px 16px;background:#f1f5f9;border:2px solid #334155;border-radius:8px;">';
          html += '<h3 style="font-size:14pt;font-weight:800;margin:0 0 8px;color:#334155;text-align:center;">' + t("Grand Total") + '</h3>';
          if (grandTotalUsd > 0) html += '<p style="font-size:13pt;font-weight:700;margin:4px 0;text-align:center;color:#1d4ed8;">' + t("Return Payments") + ' + ' + t("Customer Payments") + ' (USD): <span style="font-family:monospace;">' + usd(grandTotalUsd) + '</span></p>';
          if (grandTotalIqd > 0) html += '<p style="font-size:13pt;font-weight:700;margin:4px 0;text-align:center;color:#047857;">' + t("Return Payments") + ' + ' + t("Customer Payments") + ' (IQD): <span style="font-family:monospace;">' + fmtIqd(grandTotalIqd) + '</span></p>';
          html += '</div>';
          return html;
        })() : ''}
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => { win.print(); });
      } else {
        setTimeout(() => { win.print(); }, 500);
      }
    }
  };

  const renderPaymentsStatementTab = () => {
    if (paymentsStatementLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    const allReturnPayments = repPaymentsStatement?.returnPayments || [];
    const allPayments = repPaymentsStatement?.payments || [];
    const returnPaymentsUsd = allReturnPayments.filter((r: any) => r.currency === "USD");
    const returnPaymentsIqd = allReturnPayments.filter((r: any) => r.currency === "IQD");
    const paymentsUsd = allPayments.filter((p: any) => p.currency === "USD");
    const paymentsIqd = allPayments.filter((p: any) => p.currency === "IQD");

    if (allReturnPayments.length === 0 && allPayments.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><CreditCard className="w-10 h-10 mb-2" /><p className="font-semibold">{t('No data found')}</p></div>;
    }

    const renderReturnPaymentTable = (items: any[], currency: string) => {
      const fmtC = currency === "USD" ? usd : fmtIqd;
      const total = items.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0);
      return (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold w-12 text-center">#</TableHead>
                <TableHead className="text-sm font-bold text-center">{t('Return Number Short')}</TableHead>
                <TableHead className="text-sm font-bold text-center">{t('Date')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                <TableHead className="text-sm font-bold text-center">{t('Amount Paid')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r: any, i: number) => (
                <TableRow key={r.id} data-testid={`row-return-pmt-${r.id}`}>
                  <TableCell className="text-sm font-semibold text-center">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-center">{r.returnNumber}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-center">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-sm font-semibold">{r.customerName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-center text-orange-600">{fmtC(parseFloat(r.amountPaid || "0"))}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-center text-orange-700">{fmtC(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );
    };

    const renderPaymentTable = (items: any[], currency: string) => {
      const fmtC = currency === "USD" ? usd : fmtIqd;
      const total = items.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
      return (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold w-12 text-center">#</TableHead>
                <TableHead className="text-sm font-bold text-center">{t('Payment Number Short')}</TableHead>
                <TableHead className="text-sm font-bold text-center">{t('Date')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Customer Name')}</TableHead>
                <TableHead className="text-sm font-bold text-center">{t('Amount')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Note')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p: any, i: number) => (
                <TableRow key={p.id} data-testid={`row-pmt-payment-${p.id}`}>
                  <TableCell className="text-sm font-semibold text-center">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-center">{p.paymentNumber}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-center">{formatDate(p.date)}</TableCell>
                  <TableCell className="text-sm font-semibold">{p.agentName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-center text-blue-600">{fmtC(parseFloat(p.amount || "0"))}</TableCell>
                  <TableCell className="text-sm font-semibold max-w-[150px] truncate">{p.note || "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-center text-blue-700">{fmtC(total)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );
    };

    const renderPrintButton = () => (
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handlePrintPaymentsStatement} className="gap-2 font-bold" data-testid="btn-print-payments-statement">
          <Printer className="w-4 h-4" /> {t('Print')}
        </Button>
      </div>
    );

    return (
      <div className="space-y-3">
        {renderPrintButton()}
        {returnPaymentsUsd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">{t('Return Payments')} - USD ({returnPaymentsUsd.length})</h3>
            {renderReturnPaymentTable(returnPaymentsUsd, "USD")}
          </div>
        )}
        {returnPaymentsIqd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">{t('Return Payments')} - IQD ({returnPaymentsIqd.length})</h3>
            {renderReturnPaymentTable(returnPaymentsIqd, "IQD")}
          </div>
        )}
        {paymentsUsd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">{t('Customer Payments')} - USD ({paymentsUsd.length})</h3>
            {renderPaymentTable(paymentsUsd, "USD")}
          </div>
        )}
        {paymentsIqd.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 text-emerald-700 dark:text-emerald-400">{t('Customer Payments')} - IQD ({paymentsIqd.length})</h3>
            {renderPaymentTable(paymentsIqd, "IQD")}
          </div>
        )}
        {(() => {
          const grandTotalUsd = returnPaymentsUsd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0) + paymentsUsd.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
          const grandTotalIqd = returnPaymentsIqd.reduce((s: number, r: any) => s + parseFloat(r.amountPaid || "0"), 0) + paymentsIqd.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
          if (grandTotalUsd <= 0 && grandTotalIqd <= 0) return null;
          return (
            <div className="mt-4 p-4 bg-muted/50 border-2 border-slate-700 dark:border-slate-400 rounded-lg text-center">
              <h3 className="text-lg font-extrabold mb-2 text-slate-800 dark:text-slate-200">{t('Grand Total')}</h3>
              {grandTotalUsd > 0 && (
                <p className="text-base font-bold text-blue-700 dark:text-blue-400">
                  {t('Return Payments')} + {t('Customer Payments')} (USD): <span className="font-mono">{usd(grandTotalUsd)}</span>
                </p>
              )}
              {grandTotalIqd > 0 && (
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {t('Return Payments')} + {t('Customer Payments')} (IQD): <span className="font-mono">{fmtIqd(grandTotalIqd)}</span>
                </p>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const renderLoadsTab = () => {
    if (loadsLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    const loads = repLoads?.loads || [];
    const items = repLoads?.items || [];

    if (loads.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><Truck className="w-10 h-10 mb-2" /><p className="font-semibold">{t('No loads found')}</p></div>;
    }

    return (
      <div className="space-y-4">
        {loads.map((load: any, loadIdx: number) => {
          const loadItems = items.filter((item: any) => item.loadId === load.id);
          return (
            <Card key={load.id} className="border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-bold">
                    {loadIdx + 1}. {t('Load Number')}: <span className="font-mono">{load.loadNumber}</span>
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm font-semibold text-muted-foreground">
                    <span>{formatDate(load.date)}</span>
                    <span>{load.time}</span>
                  </div>
                </div>
                {load.note && <p className="text-sm text-muted-foreground text-sm">{load.note}</p>}
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-sm font-bold">#</TableHead>
                        <TableHead className="text-sm font-bold">{t('Product Name')}</TableHead>
                        <TableHead className="text-sm font-bold">{t('Product Code')}</TableHead>
                        <TableHead className="text-sm font-bold">{t('Unit')}</TableHead>
                        <TableHead className="text-sm font-bold">{t('Loaded Quantity')}</TableHead>
                        <TableHead className="text-sm font-bold">{t('Returned Quantity')}</TableHead>
                        <TableHead className="text-sm font-bold">{t('Net Remaining')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadItems.map((item: any, i: number) => (
                        <TableRow key={item.id} data-testid={`row-rep-load-item-${item.id}`}>
                          <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                          <TableCell className="text-sm font-semibold">{item.productName}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold">{item.productCode}</TableCell>
                          <TableCell className="text-sm font-semibold">{resolveUnitName(item.unit, unitsList || [])}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-blue-600">{item.quantity}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-orange-600">{item.returned}</TableCell>
                          <TableCell className="font-mono text-sm font-bold text-green-600">{(item.quantity || 0) - (item.returned || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {loadItems.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                          <TableCell className="font-mono text-sm font-bold text-blue-700">{loadItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</TableCell>
                          <TableCell className="font-mono text-sm font-bold text-orange-700">{loadItems.reduce((s: number, i: any) => s + (i.returned || 0), 0)}</TableCell>
                          <TableCell className="font-mono text-sm font-bold text-green-700">{loadItems.reduce((s: number, i: any) => s + ((i.quantity || 0) - (i.returned || 0)), 0)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderAgentReceiptsTab = () => {
    if (agentReceiptsLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    if (filteredAgentReceipts.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><Wallet className="w-10 h-10 mb-2" /><p className="font-semibold">{t("No receipts found")}</p></div>;
    }

    const totalUsd = filteredAgentReceipts.reduce((s: number, r: any) => r.currency === "USD" ? s + parseFloat(r.amount || "0") : s, 0);
    const totalIqd = filteredAgentReceipts.reduce((s: number, r: any) => r.currency === "IQD" ? s + parseFloat(r.amount || "0") : s, 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-blue-200 dark:border-blue-900"><CardContent className="pt-3 pb-3 text-center"><p className="text-xs text-muted-foreground mb-1">{t("Total USD")}</p><p className="text-lg font-bold text-blue-600 font-mono">{usd(totalUsd)}</p></CardContent></Card>
          <Card className="border-orange-200 dark:border-orange-900"><CardContent className="pt-3 pb-3 text-center"><p className="text-xs text-muted-foreground mb-1">{t("Total IQD")}</p><p className="text-lg font-bold text-orange-600 font-mono">{fmtIqd(totalIqd)}</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center"><p className="text-xs text-muted-foreground mb-1">{t("Total Records")}</p><p className="text-lg font-bold font-mono">{filteredAgentReceipts.length}</p></CardContent></Card>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t("Receipt #")}</TableHead>
                <TableHead className="text-sm font-bold">{t("Received To")}</TableHead>
                <TableHead className="text-sm font-bold">{t("USD Amount")}</TableHead>
                <TableHead className="text-sm font-bold">{t("IQD Amount")}</TableHead>
                <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                <TableHead className="text-sm font-bold">{t("Note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgentReceipts.map((r: any, i: number) => (
                <TableRow key={r.id} data-testid={`row-agent-receipt-${r.id}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{r.receiptNumber}</TableCell>
                  <TableCell className="text-sm font-semibold">{r.receivedToName}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-blue-600">{r.currency === "USD" ? usd(parseFloat(r.amount || "0")) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-orange-600">{r.currency === "IQD" ? fmtIqd(parseFloat(r.amount || "0")) : "-"}</TableCell>
                  <TableCell className="text-sm font-semibold">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-sm font-semibold max-w-[200px] truncate">{r.note || "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/60 font-bold border-t-2">
                <TableCell colSpan={3} className="text-sm font-bold">{t("Total")}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-blue-600">{totalUsd > 0 ? usd(totalUsd) : "-"}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-orange-600">{totalIqd > 0 ? fmtIqd(totalIqd) : "-"}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderAgentExpensesTab = () => {
    if (agentExpensesLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    if (filteredAgentExpenses.length === 0) {
      return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><DollarSign className="w-10 h-10 mb-2" /><p className="font-semibold">{t("No expenses found")}</p></div>;
    }

    const totalUsd = filteredAgentExpenses.reduce((s: number, e: any) => s + parseFloat(e.amountUsd || "0"), 0);
    const totalIqd = filteredAgentExpenses.reduce((s: number, e: any) => s + parseFloat(e.amountIqd || "0"), 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-blue-200 dark:border-blue-900"><CardContent className="pt-3 pb-3 text-center"><p className="text-xs text-muted-foreground mb-1">{t("Total USD")}</p><p className="text-lg font-bold text-blue-600 font-mono">{usd(totalUsd)}</p></CardContent></Card>
          <Card className="border-orange-200 dark:border-orange-900"><CardContent className="pt-3 pb-3 text-center"><p className="text-xs text-muted-foreground mb-1">{t("Total IQD")}</p><p className="text-lg font-bold text-orange-600 font-mono">{fmtIqd(totalIqd)}</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center"><p className="text-xs text-muted-foreground mb-1">{t("Total Records")}</p><p className="text-lg font-bold font-mono">{filteredAgentExpenses.length}</p></CardContent></Card>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t("Invoice #")}</TableHead>
                <TableHead className="text-sm font-bold">{t("Expense Type")}</TableHead>
                <TableHead className="text-sm font-bold">{t("USD Amount")}</TableHead>
                <TableHead className="text-sm font-bold">{t("IQD Amount")}</TableHead>
                <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                <TableHead className="text-sm font-bold">{t("Note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgentExpenses.map((e: any, i: number) => (
                <TableRow key={e.id} data-testid={`row-agent-expense-${e.id}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{e.invoiceNumber || "-"}</TableCell>
                  <TableCell className="text-sm font-semibold">{e.expenseTypeName || "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-blue-600">{parseFloat(e.amountUsd || "0") > 0 ? usd(parseFloat(e.amountUsd)) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-orange-600">{parseFloat(e.amountIqd || "0") > 0 ? fmtIqd(parseFloat(e.amountIqd)) : "-"}</TableCell>
                  <TableCell className="text-sm font-semibold">{formatDate(e.date)}</TableCell>
                  <TableCell className="text-sm font-semibold max-w-[200px] truncate">{e.description || "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/60 font-bold border-t-2">
                <TableCell colSpan={3} className="text-sm font-bold">{t("Total")}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-blue-600">{totalUsd > 0 ? usd(totalUsd) : "-"}</TableCell>
                <TableCell className="font-mono text-sm font-bold text-orange-600">{totalIqd > 0 ? fmtIqd(totalIqd) : "-"}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderStatementTab = () => {
    if (statementLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!statement) return null;

    return (
      <>
        <div className="flex items-center gap-4 mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-5 py-3">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-1">{t('Opening Balance')}</p>
              <p className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="text-rep-opening-balance">{fmt(openingBalance)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-5 py-3">
              <p className="text-sm text-red-600 dark:text-red-400 font-bold mb-1">{t('Total Debit')}</p>
              <p className="font-mono text-lg font-bold text-red-700 dark:text-red-300" data-testid="text-rep-total-debit">{fmt(totalDebit)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-5 py-3">
              <p className="text-sm text-green-600 dark:text-green-400 font-bold mb-1">{t('Total Credit')}</p>
              <p className="font-mono text-lg font-bold text-green-700 dark:text-green-300" data-testid="text-rep-total-credit">{fmt(totalCredit)}</p>
            </div>
            <div className={`rounded-lg px-5 py-3 border ${finalBalance > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : finalBalance < 0 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`}>
              <p className={`text-sm font-bold mb-1 ${finalBalance > 0 ? 'text-red-600 dark:text-red-400' : finalBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {finalBalance > 0 ? `${t('Remaining at')} ${statement?.agent?.name || ''}` : finalBalance < 0 ? `${t('Remaining at')} ${companyProfile?.name || t('Company')}` : t('Zero Account')}
              </p>
              <p className={`font-mono text-lg font-bold ${finalBalance > 0 ? 'text-red-700 dark:text-red-300' : finalBalance < 0 ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`} data-testid="text-rep-final-balance">{fmt(Math.abs(finalBalance))}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} disabled={entriesWithBalance.length === 0} className="bg-primary text-white gap-2 h-11" data-testid="button-print-rep-statement">
              <Printer className="w-5 h-5" />
              {t('Print')}
            </Button>
            <Button onClick={handlePrintDetails} disabled={entriesWithBalance.length === 0} className="bg-orange-600 text-white gap-2 h-11" data-testid="button-print-rep-details">
              <FileText className="w-5 h-5" />
              {t('Print Details')}
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm font-bold">#</TableHead>
                <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Invoice Number')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Time')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Type')}</TableHead>
                <TableHead className="text-sm font-bold">{t('Description')}</TableHead>
                <TableHead className="text-sm font-bold text-red-700 dark:text-red-400">{t('Debit')} ({currencyLabel})</TableHead>
                <TableHead className="text-sm font-bold text-green-700 dark:text-green-400">{t('Credit')} ({currencyLabel})</TableHead>
                <TableHead className="text-sm font-bold text-blue-700 dark:text-blue-400">{t('Cumulative Balance')} ({currencyLabel})</TableHead>
                <TableHead className="text-sm font-bold">{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openingBalance !== 0 && (
                <TableRow className="bg-blue-50 dark:bg-blue-950/20" data-testid="row-rep-opening-balance">
                  <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                  <TableCell><Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('Opening Balance')}</Badge></TableCell>
                  <TableCell className="text-sm font-bold">{t('Opening Balance')}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-red-600">
                    {openingBalance > 0 ? fmt(openingBalance) : ""}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-green-600">
                    {openingBalance < 0 ? fmt(Math.abs(openingBalance)) : ""}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-bold text-blue-600">
                    {fmt(openingBalance)}
                  </TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              )}
              {entriesWithBalance.map((entry, i) => (
                <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-rep-statement-${entry.id}`}>
                  <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{entry.reference || "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{entry.time}</TableCell>
                  <TableCell>{typeBadge(entry.type)}</TableCell>
                  <TableCell className="text-sm font-semibold max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-red-600">
                    {entry.debit > 0 ? fmt(entry.debit) : ""}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-green-600">
                    {entry.credit > 0 ? fmt(entry.credit) : ""}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-bold text-blue-600">
                    {fmt(entry.balance)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800" onClick={() => handleView(entry)} data-testid={`button-view-${entry.type}-${entry.id}`}>
                        <Eye className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-800" onClick={() => handleEdit(entry)} data-testid={`button-edit-${entry.type}-${entry.id}`}>
                        <Pencil className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800" onClick={() => setDeleteEntry({ id: entry.id, type: entry.type, reference: entry.reference })} data-testid={`button-delete-${entry.type}-${entry.id}`}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    {t('No transactions found')}
                  </TableCell>
                </TableRow>
              )}
              {filteredEntries.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                  <TableCell className="font-mono text-sm font-bold text-red-700">{fmt(totalDebit)}</TableCell>
                  <TableCell className="font-mono text-sm font-bold text-green-700">{fmt(totalCredit)}</TableCell>
                  <TableCell className="font-mono text-sm font-bold text-blue-700">{fmt(finalBalance)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          {t('Rep Statement')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('Representative account ledger')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Representative')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Label className="text-base font-bold mb-1 block">{t('Representative Name')}</Label>
              <SearchSelect
                items={reps.map((r: any) => ({ id: r.id, name: r.name }))}
                value={selectedRepId}
                onValueChange={setSelectedRepId}
                placeholder={t('Select representative...')}
                data-testid="select-rep-statement"
                className="h-11 text-base font-semibold"
              />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t('From Date')}</Label>
              <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 text-base font-semibold w-40" data-testid="input-rep-statement-from-date" />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t('To Date')}</Label>
              <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 text-base font-semibold w-40" data-testid="input-rep-statement-to-date" />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedRepId && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setActiveTab(tab.key)}
                  className={`h-10 px-4 text-sm font-bold whitespace-nowrap gap-2 ${isActive ? "bg-primary text-white" : ""}`}
                  data-testid={`tab-${tab.key}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6">
              {activeTab === "remaining" && renderRemainingTab()}
              {activeTab === "salesByProduct" && renderSalesByProductTab()}
              {activeTab === "sales" && renderSalesTab()}
              {activeTab === "returns" && renderReturnsTab()}
              {activeTab === "receipts" && renderReceiptsTab()}
              {activeTab === "paymentsStatement" && renderPaymentsStatementTab()}
              {activeTab === "loads" && renderLoadsTab()}
              {activeTab === "agentReceipts" && renderAgentReceiptsTab()}
              {activeTab === "agentExpenses" && renderAgentExpensesTab()}
            </CardContent>
          </Card>
        </>
      )}

      <SalesInvoiceReport invoiceId={reportInvoiceId} open={reportInvoiceOpen} onOpenChange={setReportInvoiceOpen} currency={currency} />
      <SalesReturnReport returnId={reportReturnId} open={reportReturnOpen} onOpenChange={setReportReturnOpen} currency={currency} />
      <AgentPaymentReport payment={reportPayment} open={reportPaymentOpen} onOpenChange={setReportPaymentOpen} />
      <StatementEditDialog entry={editEntry} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete invoice")} {deleteEntry?.reference ? `#${deleteEntry.reference}` : `#${deleteEntry?.id}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">{t("Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
