import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { useUser } from "@/hooks/use-auth";
import type { ExpenseType, Expense } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseTypeSearchSelect } from "@/components/expense-type-search-select";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, Pencil, Trash2, ChevronLeft, ChevronRight, Printer, FileText } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconDollar, IconDinar, IconExpenseEntry } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { usd, formatDate } from "@/lib/format-utils";
import { numberToWords } from "@/lib/number-to-words";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";
import i18n from "@/lib/i18n";

type CompanyProfileData = {
  id: number;
  name: string;
  logo: string | null;
  cliche: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allExpenses, isLoading: expensesLoading } = useExpenses();
  const { mutate: createExpense, isPending: isSaving } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense } = useDeleteExpense();
  const { data: expenseTypesList } = useExpenseTypes();
  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: user } = useUser();
  const userRole = user?.role || 'user';
  const isSalesRep = userRole === 'sales_rep';

  const { data: representativesList } = useQuery<{ id: string; name: string; repId: number | null }[]>({
    queryKey: ["/api/agents"],
  });

  const agents = useMemo(() => {
    return (representativesList || []).filter((r: any) => r.repId).map((r: any) => ({
      id: String(r.repId),
      name: r.name,
    }));
  }, [representativesList]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [expenseTypeId, setExpenseTypeId] = useState<string>("");
  const [expenseTypeName, setExpenseTypeName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [agentName, setAgentName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null);

  const types: ExpenseType[] = expenseTypesList || [];
  const isBusy = isSaving || isUpdating;

  const nextInvoiceNumber = useMemo(() => {
    const expensesList = allExpenses || [];
    let maxNum = 0;
    expensesList.forEach((e: Expense) => {
      if (e.invoiceNumber) {
        const num = parseInt(e.invoiceNumber.replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `EXP-${String(maxNum + 1).padStart(4, "0")}`;
  }, [allExpenses]);

  useEffect(() => {
    if (!editingId) {
      setInvoiceNumber(nextInvoiceNumber);
    }
  }, [nextInvoiceNumber, editingId]);

  useEffect(() => {
    if (isSalesRep && user?.fullName && !agentName) {
      setAgentName(user.fullName);
    }
  }, [isSalesRep, user?.fullName]);

  const incrementInvoiceNumber = (current: string) => {
    const match = current.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10) + 1;
      return `${prefix}${String(num).padStart(match[2].length, "0")}`;
    }
    return nextInvoiceNumber;
  };

  const resetForm = (autoIncrement?: boolean) => {
    const nextNum = autoIncrement ? incrementInvoiceNumber(invoiceNumber) : nextInvoiceNumber;
    setEditingId(null);
    setExpenseTypeId("");
    setExpenseTypeName("");
    setInvoiceNumber(nextNum);
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setAgentName(isSalesRep && user?.fullName ? user.fullName : "");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setExpenseTypeId(String(e.expenseTypeId));
    setExpenseTypeName(e.expenseTypeName);
    setInvoiceNumber(e.invoiceNumber || "");
    setAmountUsd(e.amountUsd);
    setAmountIqd(e.amountIqd);
    setDescription(e.description || "");
    setReference(e.reference || "");
    setAgentName(e.agentName || "");
    setDate(e.date);
    setTime(e.time || "00:00");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = () => {
    if (!expenseTypeId) {
      toast({ title: t("Please select an expense type"), variant: "destructive" });
      return;
    }
    if (invoiceNumber && invoiceNumber.trim()) {
      const duplicate = (allExpenses || []).find((e: Expense) =>
        e.invoiceNumber === invoiceNumber.trim() && e.id !== editingId
      );
      if (duplicate) {
        toast({ title: t("Invoice number already exists"), variant: "destructive" });
        return;
      }
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    const payload = {
      expenseTypeId: parseInt(expenseTypeId),
      expenseTypeName,
      invoiceNumber: invoiceNumber || null,
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      description: description || null,
      reference: reference || null,
      agentName: agentName || null,
      date,
      time,
    };

    if (editingId) {
      updateExpense({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: t("Expense updated successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to update expense"), variant: "destructive" });
        },
      });
    } else {
      createExpense(payload, {
        onSuccess: () => {
          toast({ title: t("Expense saved successfully") });
          resetForm(true);
        },
        onError: () => {
          toast({ title: t("Failed to save expense"), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteExpense(deleteItem.id, {
      onSuccess: () => {
        toast({ title: t("Expense deleted successfully") });
        setDeleteItem(null);
        if (editingId === deleteItem.id) resetForm();
      },
      onError: () => {
        toast({ title: t("Failed to delete expense"), variant: "destructive" });
      },
    });
  };

  const expensesList = allExpenses || [];
  const filteredExpenses = expensesList.filter((e: Expense) => {
    if (historyFilter && historyFilter !== "all" && String(e.expenseTypeId) !== historyFilter) return false;
    if (historyFromDate && e.date < historyFromDate) return false;
    if (historyToDate && e.date > historyToDate) return false;
    if (invoiceSearch.trim() && !(e.invoiceNumber || "").toLowerCase().includes(invoiceSearch.trim().toLowerCase())) return false;
    if (agentFilter && agentFilter !== "all" && (e.agentName || "") !== agentFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = filteredExpenses.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";
  const totalUsd = expensesList.reduce((sum: number, e: Expense) => sum + parseFloat(e.amountUsd || "0"), 0);
  const totalIqd = expensesList.reduce((sum: number, e: Expense) => sum + parseFloat(e.amountIqd || "0"), 0);

  const agentFilterItems = useMemo(() => {
    const names = [...new Set(expensesList.map((e: Expense) => e.agentName).filter(Boolean))];
    return names.map(n => ({ id: n as string, name: n as string }));
  }, [expensesList]);

  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const fieldColor = companyProfile?.primaryColor || "#dc2626";
  const textColor = companyProfile?.secondaryColor || "#ffffff";

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const filterTypeName = historyFilter && historyFilter !== "all"
      ? types.find(et => String(et.id) === historyFilter)?.name || ""
      : t("All Expense Types");

    const filteredTotalUsd = filteredExpenses.reduce((s: number, e: Expense) => s + parseFloat(e.amountUsd || "0"), 0);
    const filteredTotalIqd = filteredExpenses.reduce((s: number, e: Expense) => s + parseFloat(e.amountIqd || "0"), 0);

    const rows = filteredExpenses.map((e: Expense, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${e.invoiceNumber || "-"}</td>
        <td>${formatDate(e.date)}</td>
        <td>${e.time || "-"}</td>
        <td><strong>${e.expenseTypeName}</strong></td>
        <td class="debit">${parseFloat(e.amountUsd) > 0 ? usd(e.amountUsd) : "-"}</td>
        <td class="credit">${parseFloat(e.amountIqd) > 0 ? parseFloat(e.amountIqd).toLocaleString() + " IQD" : "-"}</td>
        <td>${e.description || "-"}</td>
        <td>${e.reference || "-"}</td>
        <td>${e.agentName || "-"}</td>
      </tr>
    `).join("");

    const dateRangeText = historyFromDate && historyToDate
      ? `${formatDate(historyFromDate)} - ${formatDate(historyToDate)}`
      : historyFromDate ? `${formatDate(historyFromDate)} - ${t("Now")}`
      : historyToDate ? `${t("Beginning")} - ${formatDate(historyToDate)}`
      : formatDate(new Date());

    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Expense Report")}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        
        <div class="report-banner">
          <div class="banner-right">
            <h1>${t("Expense Report")}</h1>
            <div class="supplier-name">${filterTypeName}</div>
            <div class="date-range">${dateRangeText}</div>
          </div>
          <div class="banner-left" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:10px;" />` : ""}
            <div style="font-size:11pt;font-weight:700;color:${fieldColor};">${t("Total Records")}: ${filteredExpenses.length}</div>
          </div>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-blue"><div class="label">${t("Total USD")}</div><div class="value blue">${usd(filteredTotalUsd)}</div></div>
          <div class="summary-card accent-red"><div class="label">${t("Total IQD")}</div><div class="value red">${filteredTotalIqd.toLocaleString()} IQD</div></div>
          <div class="summary-card accent-green"><div class="label">${t("Total Records")}</div><div class="value green">${filteredExpenses.length}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Invoice Number")}</th>
              <th>${t("Date")}</th>
              <th>${t("Time")}</th>
              <th>${t("Expense Type")}</th>
              <th>${t("USD Amount")}</th>
              <th>${t("IQD Amount")}</th>
              <th>${t("Note")}</th>
              <th>${t("Reference")}</th>
              <th>${t("Agent Name")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="5"><strong>${t("Total")}</strong></td>
              <td class="debit"><strong>${usd(filteredTotalUsd)}</strong></td>
              <td class="credit"><strong>${filteredTotalIqd.toLocaleString()} IQD</strong></td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
  };

  const handlePrintReceipt = (e: Expense) => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Expense Voucher")} #${e.id}</title>
        <style>
          ${printStyles}
          .voucher-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 16px 0;
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            background: #fafafa;
          }
          .voucher-details .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .voucher-details .detail-label {
            font-size: 8pt;
            color: #888;
            font-weight: 600;
            text-transform: uppercase;
          }
          .voucher-details .detail-value {
            font-size: 12pt;
            font-weight: 700;
            color: #1a1a2e;
          }
          .amount-section {
            display: flex;
            gap: 16px;
            margin: 20px 0;
          }
          .amount-box {
            flex: 1;
            padding: 20px 40px;
            border-radius: 12px;
            text-align: center;
          }
          .amount-box.usd { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #3b82f6; }
          .amount-box.iqd { background: linear-gradient(135deg, #fff7ed, #fed7aa); border: 2px solid #f97316; }
          .amount-box .amount-label { font-size: 9pt; color: #666; font-weight: 600; margin-bottom: 6px; }
          .amount-box .amount-value { font-size: 18pt; font-weight: 800; }
          .amount-box.usd .amount-value { color: #2563eb; }
          .amount-box.iqd .amount-value { color: #ea580c; }
          .description-box {
            margin: 16px 0;
            padding: 14px 18px;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            background: #fafafa;
          }
          .description-box .desc-label { font-size: 8pt; color: #888; font-weight: 600; margin-bottom: 4px; }
          .description-box .desc-value { font-size: 10pt; color: #333; }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            padding-top: 20px;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-box .sig-line { border-top: 1px solid #999; margin-bottom: 6px; }
          .signature-box .sig-label { font-size: 9pt; color: #666; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="report-banner">
          <div class="banner-right">
            <h1>${t("Expense Voucher")}</h1>
            <div class="supplier-name">${e.expenseTypeName}</div>
            <div class="date-range">${t("Voucher")} #${e.id}</div>
          </div>
          <div class="banner-left" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:10px;" />` : ""}
            ${companyProfile?.name ? `<div style="font-size:11pt;font-weight:700;color:${fieldColor};">${companyProfile.name}</div>` : ""}
          </div>
        </div>

        <div class="voucher-details">
          <div class="detail-item">
            <span class="detail-label">${t("Date")}</span>
            <span class="detail-value">${formatDate(e.date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${t("Time")}</span>
            <span class="detail-value">${e.time || "-"}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${t("Expense Type")}</span>
            <span class="detail-value">${e.expenseTypeName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${t("Invoice Number")}</span>
            <span class="detail-value">${e.invoiceNumber || "-"}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${t("Reference")}</span>
            <span class="detail-value">${e.reference || "-"}</span>
          </div>
          ${e.agentName ? `<div class="detail-item">
            <span class="detail-label">${t("Agent Name")}</span>
            <span class="detail-value">${e.agentName}</span>
          </div>` : ""}
        </div>

        <div class="amount-section">
          <div class="amount-box usd">
            <div class="amount-label">${t("USD Amount")}</div>
            <div class="amount-value">${parseFloat(e.amountUsd) > 0 ? usd(e.amountUsd) : "-"}</div>
            ${parseFloat(e.amountUsd) > 0 ? `<div style="font-size:9pt;color:#666;font-style:italic;margin-top:4px">${numberToWords(parseFloat(e.amountUsd), i18n.language, t("Dollar"))}</div>` : ""}
          </div>
          <div class="amount-box iqd">
            <div class="amount-label">${t("IQD Amount")}</div>
            <div class="amount-value">${parseFloat(e.amountIqd) > 0 ? parseFloat(e.amountIqd).toLocaleString() + " IQD" : "-"}</div>
            ${parseFloat(e.amountIqd) > 0 ? `<div style="font-size:9pt;color:#666;font-style:italic;margin-top:4px">${numberToWords(parseFloat(e.amountIqd), i18n.language, t("Dinar"))}</div>` : ""}
          </div>
        </div>

        ${e.description ? `
          <div class="description-box">
            <div class="desc-label">${t("Note")}</div>
            <div class="desc-value">${e.description}</div>
          </div>
        ` : ""}

        <div class="signature-section">
          <div class="signature-box">
            <div class="sig-line"></div>
            <div class="sig-label">${t("Received By")}</div>
          </div>
          <div class="signature-box">
            <div class="sig-line"></div>
            <div class="sig-label">${t("Approved By")}</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <IconExpenseEntry className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            {t('Expenses')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('Record expenses in USD and IQD')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-expense">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className={`lg:col-span-2 shadow-sm ${editingId ? 'border-orange-300 dark:border-orange-700' : 'border-border/50'}`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="h-5 w-5 text-orange-600" />
                  {t('Edit Expense')}
                  <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">#{editingId}</Badge>
                </>
              ) : (
                t('Expense Details')
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Invoice Number')}</Label>
                <Input value={invoiceNumber} readOnly className="font-mono bg-muted cursor-not-allowed" data-testid="input-expense-invoice-number" />
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-expense-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-expense-time" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Expense Type')}</Label>
                <ExpenseTypeSearchSelect
                  items={types}
                  value={expenseTypeId}
                  onValueChange={(id, name) => { setExpenseTypeId(id); setExpenseTypeName(name); }}
                  placeholder={t('Search expense type...')}
                  data-testid="select-expense-type"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Agent Name')}</Label>
                {isSalesRep ? (
                  <Input value={agentName} readOnly className="bg-muted cursor-not-allowed" data-testid="input-agent-name" />
                ) : (
                  <SearchSelect
                    items={agents}
                    value={agents.find(a => a.name === agentName)?.id || ""}
                    onValueChange={(id) => {
                      const agent = agents.find(a => a.id === id);
                      setAgentName(agent?.name || "");
                    }}
                    placeholder={t("Select agent...")}
                    data-testid="select-agent-name"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <IconDollar className="h-5 w-5 text-blue-600" />
                    {t('USD Amount')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-expense-usd"
                  />
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <IconDinar className="h-5 w-5 text-orange-600" />
                    {t('IQD Amount')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number" step="250" min="0" placeholder="0"
                    value={amountIqd} onChange={(e) => setAmountIqd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-expense-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-expense-reference" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('Note')}</Label>
                <Textarea placeholder={t('Note...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-expense-description" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className={`shadow-sm ${editingId ? 'border-orange-200 dark:border-orange-900' : 'border-red-200 dark:border-red-900'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{editingId ? t('Edit Expense') : t('Expense Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoiceNumber && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Invoice Number')}</p>
                  <p className="font-bold text-lg font-mono">{invoiceNumber}</p>
                </div>
              )}
              {expenseTypeName && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Expense Type')}</p>
                  <p className="font-bold text-lg">{expenseTypeName}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-expense-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-expense-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isBusy || !expenseTypeId}
                  className={`flex-1 h-12 text-base gap-2 text-[#ffffff] ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                  data-testid="button-save-expense"
                >
                  {isBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {editingId ? t('Update Expense') : t('Save Expense')}
                </Button>
                {editingId && (
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="h-12 gap-2"
                    data-testid="button-cancel-edit-expense"
                  >
                    <RotateCcw className="h-5 w-5" />
                    {t('Cancel')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('Total Expenses')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('Total USD')}</span>
                <span className="font-mono font-bold text-red-600" data-testid="text-total-expenses-usd">
                  {usd(totalUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('Total IQD')}</span>
                <span className="font-mono font-bold text-red-600" data-testid="text-total-expenses-iqd">
                  {formatIQD(totalIqd)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-muted-foreground">{t('Total Records')}</span>
                <span className="font-mono font-bold">{expensesList.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-red-600" />
              {t('Expense History')}
              <Badge variant="secondary" className="ml-2">{filteredExpenses.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-expense-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-expense-history-to-date" />
              </div>
              <SearchInput
                value={invoiceSearch}
                onChange={(e) => { setInvoiceSearch(e.target.value); setCurrentPage(1); }}
                onClear={() => { setInvoiceSearch(""); setCurrentPage(1); }}
                placeholder={t('Invoice Number')}
                containerClassName="w-48"
                className="h-9 font-mono"
                data-testid="input-search-expense-invoice"
              />
              <div className="w-48">
                <ExpenseTypeSearchSelect
                  items={types}
                  value={historyFilter}
                  onValueChange={(id) => { setHistoryFilter(id); setCurrentPage(1); }}
                  placeholder={t('All Expense Types')}
                  showAllOption
                  allOptionLabel={t('All Expense Types')}
                  data-testid="select-filter-expense-history"
                  inputClassName="h-9"
                />
              </div>
              <div className="w-48">
                <SearchSelect
                  items={agentFilterItems}
                  value={agentFilter}
                  onValueChange={(id) => { setAgentFilter(id); setCurrentPage(1); }}
                  placeholder={t('All Agents')}
                  showAllOption
                  allOptionLabel={t('All Agents')}
                  data-testid="select-filter-agent"
                  inputClassName="h-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-2 h-9" data-testid="button-print-expense-report">
                <Printer className="h-5 w-5" />
                {t('Print Report')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Invoice Number')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Expense Type')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead>{t('Agent Name')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((e: Expense, i: number) => (
                    <TableRow
                      key={e.id}
                      className={editingId === e.id ? "bg-orange-50 dark:bg-orange-900/10" : ""}
                      data-testid={`row-expense-${e.id}`}
                    >
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{e.invoiceNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(e.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{e.time || "-"}</TableCell>
                      <TableCell className="font-medium">{e.expenseTypeName}</TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(e.amountUsd) > 0 ? usd(e.amountUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(e.amountIqd) > 0 ? formatIQD(parseFloat(e.amountIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{e.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.reference || "-"}</TableCell>
                      <TableCell className="text-sm font-semibold">{e.agentName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => handlePrintReceipt(e)}
                            data-testid={`button-receipt-expense-${e.id}`}
                          >
                            <FileText className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => startEdit(e)}
                            data-testid={`button-edit-expense-${e.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteItem(e)}
                            data-testid={`button-delete-expense-${e.id}`}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {t('No expenses yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredExpenses.length)} {t('of')} {filteredExpenses.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    data-testid="button-expense-prev-page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-expense-page-${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    data-testid="button-expense-next-page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>{t('This will permanently delete this expense.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('No')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">{t('Yes')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
