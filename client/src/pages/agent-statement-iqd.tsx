import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, Printer, Eye, Pencil, Trash2, FileText } from "lucide-react";
import { IconDinar } from "@/components/erp-icons";
import { formatDate } from "@/lib/format-utils";
import { DateInput } from "@/components/ui/date-input";
import { getModernPrintStyles } from "@/lib/print-styles";
import { useToast } from "@/hooks/use-toast";
import SalesInvoiceReport from "@/components/sales-invoice-report";
import SalesReturnReport from "@/components/sales-return-report";
import CustomerReceiptReport from "@/components/customer-receipt-report";
import AgentPaymentReport from "@/components/agent-payment-report";
import StatementEditDialog from "@/components/statement-edit-dialog";
import type { CustomerReceipt, AgentPayment } from "@shared/schema";

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

interface CustomerData {
  id: number;
  name: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
}

interface StatementResponse {
  customer: CustomerData;
  entries: StatementEntry[];
  openingBalanceUsd: number;
  openingBalanceIqd: number;
}

export default function AgentStatementIqdPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportInvoiceOpen, setReportInvoiceOpen] = useState(false);
  const [reportReturnId, setReportReturnId] = useState<number | null>(null);
  const [reportReturnOpen, setReportReturnOpen] = useState(false);
  const [reportReceipt, setReportReceipt] = useState<CustomerReceipt | null>(null);
  const [reportReceiptOpen, setReportReceiptOpen] = useState(false);
  const [reportPayment, setReportPayment] = useState<AgentPayment | null>(null);
  const [reportPaymentOpen, setReportPaymentOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<{ id: number; type: string; reference: string | null } | null>(null);
  const [editEntry, setEditEntry] = useState<{ id: number; type: string; currency: string; reference: string | null } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: clientsList } = useQuery<CustomerData[]>({
    queryKey: ["/api/clients"],
  });

  const customers = (clientsList || []).filter((c: any) => c.type === "customer");

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/customer-statement", selectedCustomerId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/customer-statement/${selectedCustomerId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedCustomerId,
  });

  const iqdEntries = statement?.entries?.filter(e => e.currency === "IQD") || [];
  const openingBalanceIqd = statement?.openingBalanceIqd || 0;

  const invoiceItemsRef = useRef<Record<number, any[]>>({});
  const invoiceDataRef = useRef<Record<number, any>>({});
  const entryIdsKey = iqdEntries.map(e => `${e.id}-${e.type}`).join(",");

  useEffect(() => {
    if (!iqdEntries.length) return;
    const invoiceEntries = iqdEntries.filter(e => e.type === "sales_invoice" || e.type === "sales_return");
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

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  let runningBalance = openingBalanceIqd;
  const entriesWithBalance = iqdEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  const totalDebit = iqdEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = iqdEntries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = openingBalanceIqd + totalDebit - totalCredit;

  const typeBadge = (type: string) => {
    if (type === "sales_invoice") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Sales Invoice')}</Badge>;
    if (type === "sales_return") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('Sales Return')}</Badge>;
    if (type === "agent_payment") return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('Agent Payment')}</Badge>;
    if (type === "customer_receipt") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Receipt')}</Badge>;
    if (type === "customer_receipt_discount") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('Receipt Discount')}</Badge>;
    if (type === "discount") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('Discount')}</Badge>;
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Payment')}</Badge>;
  };

  const isRtl = i18n.language === "ar" || i18n.language === "ckb";

  const typeLabel = (type: string) => {
    if (type === "sales_invoice") return t('Sales Invoice');
    if (type === "sales_return") return t('Sales Return');
    if (type === "agent_payment") return t('Agent Payment');
    if (type === "customer_receipt") return t('Receipt');
    if (type === "customer_receipt_discount") return t('Receipt Discount');
    if (type === "discount") return t('Discount');
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
      } else if (entry.type === "customer_receipt" || entry.type === "customer_receipt_discount") {
        const res = await fetch(`/api/customer-receipts`, { credentials: "include" });
        if (!res.ok) throw new Error();
        const all = await res.json();
        const rec = all.find((r: any) => r.id === entry.id);
        if (rec) { setReportReceipt(rec); setReportReceiptOpen(true); }
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
    if (type === "customer_receipt" || type === "customer_receipt_discount") return "/api/customer-receipts";
    if (type === "agent_payment") return "/api/agent-payments";
    return "";
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      const api = getDeleteApi(deleteEntry.type);
      await apiRequest("DELETE", `${api}/${deleteEntry.id}`);
      toast({ title: t("Deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-statement"] });
    } catch (err: any) {
      toast({ title: t("Failed to delete invoice"), description: err?.message, variant: "destructive" });
    }
    setDeleteEntry(null);
  };

  const handlePrint = () => {
    if (!statement || !entriesWithBalance.length) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const customerName = statement.customer?.name || "";
    const numAlign = isRtl ? "left" : "right";

    const invoiceEntries = entriesWithBalance.filter(e => e.type === "sales_invoice" || e.type === "sales_return");
    const receiptEntries = entriesWithBalance.filter(e => e.type === "customer_receipt" || e.type === "customer_receipt_discount" || e.type === "agent_payment");

    const invoiceItemsMap = invoiceItemsRef.current;
    const invoiceDataMap = invoiceDataRef.current;

    const rows = entriesWithBalance.map((entry, i) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${formatDate(entry.date)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;font-size:9pt;">${entry.reference || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">${entry.time}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:600;">${typeLabel(entry.type)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;">${entry.description || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#dc2626;font-size:9pt;">${entry.debit > 0 ? formatIQD(entry.debit) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#16a34a;font-size:9pt;">${entry.credit > 0 ? formatIQD(entry.credit) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:800;color:#1e40af;font-size:9pt;">${formatIQD(entry.balance)}</td>
      </tr>
    `).join("");

    const openingRow = openingBalanceIqd !== 0 ? `
      <tr style="background:#eff6ff;">
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">-</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:700;color:#1e40af;">${t('Opening Balance')}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;font-weight:700;">${t('Opening Balance')}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#dc2626;font-size:9pt;">${openingBalanceIqd > 0 ? formatIQD(openingBalanceIqd) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:700;color:#16a34a;font-size:9pt;">${openingBalanceIqd < 0 ? formatIQD(Math.abs(openingBalanceIqd)) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${numAlign};font-family:monospace;font-weight:800;color:#1e40af;font-size:9pt;">${formatIQD(openingBalanceIqd)}</td>
      </tr>
    ` : "";

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Customer Statement")} - ${customerName}</title>
        <style>
          ${printStyles}
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
          td small { color: #000 !important; }
          .info-label { color: #000 !important; }
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
                <span>${t("Customer Name")}: <strong style="color:#64748b">${customerName}</strong></span>
                <span>${t("From Date")}: <strong>${formatDate(fromDate)}</strong></span>
                <span>${t("To Date")}: <strong>${formatDate(toDate)}</strong></span>
              </div>
              <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#000;font-weight:600;flex-wrap:wrap;margin-top:6px;direction:${dir};">
                <span style="color:#1e40af;">${t("Opening Balance")}: <strong>${formatIQD(openingBalanceIqd)}</strong></span>
                <span style="color:#dc2626;">${t("Total Debit")}: <strong>${formatIQD(totalDebit)}</strong></span>
                <span style="color:#16a34a;">${t("Total Credit")}: <strong>${formatIQD(totalCredit)}</strong></span>
                <span style="color:${finalBalance > 0 ? '#dc2626' : finalBalance < 0 ? '#16a34a' : '#1e40af'};">${finalBalance > 0 ? `${t("Remaining at")} ${customerName}` : finalBalance < 0 ? `${t("Remaining at")} ${companyProfile?.name || t("Company")}` : t("Zero Account")}: <strong>${formatIQD(Math.abs(finalBalance))}</strong></span>
              </div>
            </div>
            <div style="background:#64748b;color:#fff;padding:10px 14px;border-radius:8px;min-width:130px;text-align:center;">
              <h1 style="font-size:11pt;margin:0;font-weight:800;line-height:1.3;">${t("Customer Statement")}</h1>
              <div style="font-size:10pt;font-weight:700;margin-top:3px;">IQD</div>
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
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${numAlign};">${t("Debit")} (IQD)</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${numAlign};">${t("Credit")} (IQD)</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${numAlign};">${t("Cumulative Balance")} (IQD)</th>
            </tr>
          </thead>
          <tbody>
            ${openingRow}
            ${rows}
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="6" style="padding:8px;font-size:10pt;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#dc2626;text-align:${numAlign};">${formatIQD(totalDebit)}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#16a34a;text-align:${numAlign};">${formatIQD(totalCredit)}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#1e40af;text-align:${numAlign};">${formatIQD(finalBalance)}</td>
            </tr>
          </tbody>
        </table>

        <div style="page-break-before:always;margin-top:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;text-align:center;">
              <h2 style="font-size:12pt;margin:0;font-weight:800;color:#64748b;">${t("Details")} - ${customerName}</h2>
            </div>
            <div style="background:#64748b;color:#fff;padding:10px 14px;border-radius:8px;min-width:130px;text-align:center;">
              <h1 style="font-size:11pt;margin:0;font-weight:800;line-height:1.3;">${t("Details")}</h1>
              <div style="font-size:10pt;font-weight:700;margin-top:3px;">IQD</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;direction:ltr;">
            <div style="flex:1;">
              <h3 style="font-size:10pt;font-weight:800;color:#64748b;margin:0 0 6px 0;text-align:center;">${t("Sales Invoices")} / ${t("Sales Returns")}</h3>
              ${invoiceEntries.map(entry => {
                const inv = invoiceDataMap[entry.id];
                const items = invoiceItemsMap[entry.id] || [];
                const isReturn = entry.type === "sales_return";
                return `
                  <div style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                    <div style="background:${isReturn ? '#fef2f2' : '#eff6ff'};padding:5px 8px;display:flex;justify-content:space-between;font-size:9pt;font-weight:700;direction:${dir};">
                      <span>${isReturn ? t("Sales Return") : t("Sales Invoice")}: ${entry.reference || "-"}</span>
                      <span>${formatDate(entry.date)}</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:8pt;">
                      <thead>
                        <tr style="background:#e2e8f0;color:#000;">
                          <th style="padding:3px 6px;font-weight:700;">${t("Product Name")}</th>
                          <th style="padding:3px 6px;font-weight:700;text-align:center;">${t("Quantity")}</th>
                          <th style="padding:3px 6px;font-weight:700;text-align:center;">${t("Gift")}</th>
                          <th style="padding:3px 6px;font-weight:700;text-align:${numAlign};">${t("Price")}</th>
                          <th style="padding:3px 6px;font-weight:700;text-align:${numAlign};">${t("Amount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${items.map((item: any) => `
                          <tr>
                            <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;">${item.productName || "-"}</td>
                            <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${item.quantity || "0"}</td>
                            <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${item.gift || "0"}</td>
                            <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;">${formatIQD(parseFloat(item.price || "0"))}</td>
                            <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;font-weight:700;">${formatIQD(parseFloat(item.amount || "0"))}</td>
                          </tr>
                        `).join("")}
                        <tr style="background:#f8fafc;font-weight:800;">
                          <td colspan="4" style="padding:4px 6px;text-align:${isRtl ? 'right' : 'left'};">${t("Total")}</td>
                          <td style="padding:4px 6px;text-align:${numAlign};font-family:monospace;color:${isReturn ? '#16a34a' : '#2563eb'};">${formatIQD(entry.debit || entry.credit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                `;
              }).join("")}
            </div>

            <div style="flex:1;">
              <h3 style="font-size:10pt;font-weight:800;color:#64748b;margin:0 0 6px 0;text-align:center;">${t("Receipts")} / ${t("Payments")}</h3>
              <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;font-size:8pt;">
                <thead>
                  <tr style="background:#e2e8f0;color:#000;">
                    <th style="padding:4px 6px;font-weight:700;">#</th>
                    <th style="padding:4px 6px;font-weight:700;">${t("Date")}</th>
                    <th style="padding:4px 6px;font-weight:700;">${t("Type")}</th>
                    <th style="padding:4px 6px;font-weight:700;text-align:${numAlign};">${t("Amount")}</th>
                    <th style="padding:4px 6px;font-weight:700;">${t("Note")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${receiptEntries.filter(e => e.type !== "customer_receipt_discount").map((entry, i) => `
                    <tr>
                      <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${entry.reference || "-"}</td>
                      <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${formatDate(entry.date)}</td>
                      <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;font-weight:600;">${typeLabel(entry.type)}</td>
                      <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;font-weight:700;color:#16a34a;">${formatIQD(entry.credit)}</td>
                      <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;">${entry.description || "-"}</td>
                    </tr>
                  `).join("")}
                  ${receiptEntries.filter(e => e.type !== "customer_receipt_discount").length === 0 ? `<tr><td colspan="5" style="padding:10px;text-align:center;color:#999;">${t("No data")}</td></tr>` : ""}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const handlePrintDetails = () => {
    if (!statement || !entriesWithBalance.length) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const customerName = statement.customer?.name || "";
    const numAlign = isRtl ? "left" : "right";

    const invoiceItemsMap = invoiceItemsRef.current;
    const invoiceDataMap = invoiceDataRef.current;

    const allEntries = [...entriesWithBalance]
      .filter(e => e.type !== "customer_receipt_discount")
      .sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || "00:00:00"}`).getTime();
        const db = new Date(`${b.date}T${b.time || "00:00:00"}`).getTime();
        return da - db;
      });

    let seqNum = 0;

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Details")} - ${customerName}</title>
        <style>
          ${printStyles}
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; color: #000; }
          td, th, span, div, p, h1, h2, h3, h4, h5, h6, small, label { color: inherit; }
        </style>
      </head>
      <body>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
          <div style="display:flex;flex-direction:column;align-items:center;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
            <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
          </div>
          <div style="flex:1;text-align:center;">
            <h2 style="font-size:12pt;margin:0;font-weight:800;color:#64748b;">${t("Details")} - ${customerName}</h2>
          </div>
          <div style="background:#64748b;color:#fff;padding:10px 14px;border-radius:8px;min-width:130px;text-align:center;">
            <h1 style="font-size:11pt;margin:0;font-weight:800;line-height:1.3;">${t("Details")}</h1>
            <div style="font-size:10pt;font-weight:700;margin-top:3px;">IQD</div>
          </div>
        </div>

        <div style="direction:${dir};">
          ${allEntries.map(entry => {
            seqNum++;
            const isInvoice = entry.type === "sales_invoice" || entry.type === "sales_return";
            const isReturn = entry.type === "sales_return";
            const isReceipt = entry.type === "customer_receipt";
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
                <div style="margin-bottom:10px;border:1px solid ${isReturn ? '#fecaca' : '#e2e8f0'};border-radius:6px;overflow:hidden;">
                  <div style="background:${isReturn ? '#fef2f2' : '#f1f5f9'};padding:5px 8px;font-size:10pt;font-weight:700;direction:${dir};text-align:center;color:${isReturn ? '#dc2626' : '#000'};">
                    <span>${seqNum}. ${isReturn ? t("Returns") : t("Sales Invoice")}: ${entry.reference || "-"} - ${formatDate(entry.date)}</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:9pt;">
                    <thead>
                      <tr style="background:${isReturn ? '#fecaca' : '#e2e8f0'};color:${isReturn ? '#dc2626' : '#000'};">
                        <th style="padding:3px 6px;font-weight:700;">${t("Product Name")}</th>
                        <th style="padding:3px 6px;font-weight:700;text-align:center;">${t("Quantity")}</th>
                        ${hasGift ? `<th style="padding:3px 6px;font-weight:700;text-align:center;">${t("Gift")}</th>` : ""}
                        <th style="padding:3px 6px;font-weight:700;text-align:${numAlign};">${t("Price")}</th>
                        <th style="padding:3px 6px;font-weight:700;text-align:${numAlign};">${t("Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map((item: any) => `
                        <tr style="color:${isReturn ? '#dc2626' : 'inherit'};">
                          <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;">${item.productName || "-"}</td>
                          <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${item.quantity || "0"}</td>
                          ${hasGift ? `<td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${item.gift || "0"}</td>` : ""}
                          <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;">${formatIQD(parseFloat(item.price || "0"))}</td>
                          <td style="padding:3px 6px;border-bottom:1px solid #f1f5f9;text-align:${numAlign};font-family:monospace;font-weight:700;">${formatIQD(parseFloat(item.amount || "0"))}</td>
                        </tr>
                      `).join("")}
                      <tr style="background:#f8fafc;font-weight:800;">
                        <td colspan="${colCount}" style="padding:4px 6px;">
                          <div style="display:flex;justify-content:space-around;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="color:${isReturn ? '#dc2626' : '#64748b'};">${t("Total")}: <span style="font-family:monospace;">${formatIQD(entry.debit || entry.credit)}</span></span>
                            ${!isReturn && amountPaid > 0 ? `<span style="color:#16a34a;">${t("Amount Received")}: <span style="font-family:monospace;">${formatIQD(amountPaid)}</span></span>` : ""}
                            ${!isReturn && discount > 0 ? `<span style="color:#d97706;">${t("Discount")}: <span style="font-family:monospace;">${formatIQD(discount)}</span></span>` : ""}
                            ${!isReturn && remaining > 0 ? `<span style="color:#2563eb;">${t("Remaining")}: <span style="font-family:monospace;">${formatIQD(remaining)}</span></span>` : ""}
                            ${isReturn && amountPaid > 0 ? `<span style="color:#dc2626;">${t("Amount Paid")}: <span style="font-family:monospace;">${formatIQD(amountPaid)}</span></span>` : ""}
                            ${isReturn && remaining > 0 ? `<span style="color:#dc2626;">${t("Remaining")}: <span style="font-family:monospace;">${formatIQD(remaining)}</span></span>` : ""}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `;
            }

            if (isReceipt) {
              return `
                <div style="margin-bottom:10px;border:1px solid #fecaca;border-radius:6px;overflow:hidden;">
                  <div style="background:#fef2f2;padding:8px 12px;font-size:9pt;font-weight:700;direction:${dir};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;color:#dc2626;">
                    <span>${seqNum}. ${t("Amount Received")}  ${t("Invoice Number")}: ${entry.reference || "-"} - ${t("Date")}: ${formatDate(entry.date)}${entry.description ? ` - ${entry.description}` : ""}</span>
                    <span style="font-family:monospace;font-size:10pt;">${formatIQD(entry.credit)}</span>
                  </div>
                </div>
              `;
            }

            if (isPayment) {
              return `
                <div style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                  <div style="background:#f1f5f9;padding:8px 12px;font-size:9pt;font-weight:700;direction:${dir};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;color:#000;">
                    <span>${seqNum}. ${t("Amount Paid")}: ${entry.reference || "-"} - ${formatDate(entry.date)}${entry.description ? ` - ${entry.description}` : ""}</span>
                    <span style="font-family:monospace;font-size:10pt;">${formatIQD(entry.debit)}</span>
                  </div>
                </div>
              `;
            }

            return "";
          }).join("")}
          ${allEntries.length === 0 ? `<p style="text-align:center;color:#999;font-size:9pt;">${t("No data")}</p>` : ""}
        </div>
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <IconDinar className="h-7 w-7 text-orange-600 dark:text-orange-400" />
          </div>
          {t('Agent Statement IQD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('Agent account ledger in IQD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Customer')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Label className="text-base font-bold mb-1 block">{t('Customer Name')}</Label>
              <SearchSelect
                items={customers.map((c: any) => ({ id: c.id, name: c.name }))}
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                placeholder={t('Select customer...')}
                data-testid="select-customer-statement"
                className="h-11 text-base font-semibold"
              />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t('From Date')}</Label>
              <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 text-base font-semibold w-40" data-testid="input-statement-from-date" />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t('To Date')}</Label>
              <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 text-base font-semibold w-40" data-testid="input-statement-to-date" />
            </div>
          </div>
          {selectedCustomerId && statement && (
            <div className="flex items-center gap-4 mt-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-5 py-3">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-1">{t('Opening Balance')}</p>
                  <p className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="text-opening-balance">{formatIQD(openingBalanceIqd)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-5 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400 font-bold mb-1">{t('Total Debit')}</p>
                  <p className="font-mono text-lg font-bold text-red-700 dark:text-red-300" data-testid="text-total-debit">{formatIQD(totalDebit)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-5 py-3">
                  <p className="text-sm text-green-600 dark:text-green-400 font-bold mb-1">{t('Total Credit')}</p>
                  <p className="font-mono text-lg font-bold text-green-700 dark:text-green-300" data-testid="text-total-credit">{formatIQD(totalCredit)}</p>
                </div>
                <div className={`rounded-lg px-5 py-3 border ${finalBalance > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : finalBalance < 0 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`}>
                  <p className={`text-sm font-bold mb-1 ${finalBalance > 0 ? 'text-red-600 dark:text-red-400' : finalBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {finalBalance > 0 ? `${t('Remaining at')} ${statement?.customer?.name || ''}` : finalBalance < 0 ? `${t('Remaining at')} ${companyProfile?.name || t('Company')}` : t('Zero Account')}
                  </p>
                  <p className={`font-mono text-lg font-bold ${finalBalance > 0 ? 'text-red-700 dark:text-red-300' : finalBalance < 0 ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`} data-testid="text-final-balance">{formatIQD(Math.abs(finalBalance))}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePrint} disabled={entriesWithBalance.length === 0} className="bg-primary text-white gap-2 h-11" data-testid="button-print-statement">
                  <Printer className="w-5 h-5" />
                  {t('Print')}
                </Button>
                <Button onClick={handlePrintDetails} disabled={entriesWithBalance.length === 0} className="bg-orange-600 text-white gap-2 h-11" data-testid="button-print-details">
                  <FileText className="w-5 h-5" />
                  {t('Print Details')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomerId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedCustomerId && statement && !statementLoading && (
        <>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Invoice Number')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Time')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Type')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Description')}</TableHead>
                    <TableHead className="text-sm font-bold text-red-700 dark:text-red-400">{t('Debit')} (IQD)</TableHead>
                    <TableHead className="text-sm font-bold text-green-700 dark:text-green-400">{t('Credit')} (IQD)</TableHead>
                    <TableHead className="text-sm font-bold text-blue-700 dark:text-blue-400">{t('Cumulative Balance')} (IQD)</TableHead>
                    <TableHead className="text-sm font-bold">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openingBalanceIqd !== 0 && (
                    <TableRow className="bg-blue-50 dark:bg-blue-950/20" data-testid="row-opening-balance">
                      <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">-</TableCell>
                      <TableCell><Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('Opening Balance')}</Badge></TableCell>
                      <TableCell className="text-sm font-bold">{t('Opening Balance')}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">
                        {openingBalanceIqd > 0 ? formatIQD(openingBalanceIqd) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">
                        {openingBalanceIqd < 0 ? formatIQD(Math.abs(openingBalanceIqd)) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-blue-600">
                        {formatIQD(openingBalanceIqd)}
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  )}
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-customer-statement-${entry.id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{entry.reference || "-"}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{entry.time}</TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell className="text-sm font-semibold max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">
                        {entry.debit > 0 ? formatIQD(entry.debit) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">
                        {entry.credit > 0 ? formatIQD(entry.credit) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-blue-600">
                        {formatIQD(entry.balance)}
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
                  {iqdEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {t('No transactions found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {iqdEntries.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-red-700">{formatIQD(totalDebit)}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-green-700">{formatIQD(totalCredit)}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-blue-700">{formatIQD(finalBalance)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <SalesInvoiceReport invoiceId={reportInvoiceId} open={reportInvoiceOpen} onOpenChange={setReportInvoiceOpen} currency="IQD" />
      <SalesReturnReport returnId={reportReturnId} open={reportReturnOpen} onOpenChange={setReportReturnOpen} currency="IQD" />
      <CustomerReceiptReport receipt={reportReceipt} open={reportReceiptOpen} onOpenChange={setReportReceiptOpen} />
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
