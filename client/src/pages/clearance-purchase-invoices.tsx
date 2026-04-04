import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomsClearance, ClearancePurchaseInvoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, FileText, Pencil, Trash2, Printer, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconDollar, IconDinar } from "@/components/erp-icons";
import { Link } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { usd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";
import { apiRequest } from "@/lib/queryClient";

export default function ClearancePurchaseInvoicesPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const qc = useQueryClient();

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; primaryColor: string; secondaryColor: string }>({
    queryKey: ["/api/company-profile"],
  });
  const { data: invoices, isLoading } = useQuery<ClearancePurchaseInvoice[]>({
    queryKey: ["/api/clearance-purchase-invoices"],
  });
  const { data: clearancesList } = useQuery<CustomsClearance[]>({
    queryKey: ["/api/customs-clearances"],
  });
  const { data: nextNumberData } = useQuery<{ number: string }>({
    queryKey: ["/api/clearance-purchase-invoices/next-number"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/clearance-purchase-invoices", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clearance-purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["/api/clearance-purchase-invoices/next-number"] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/clearance-purchase-invoices/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clearance-purchase-invoices"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/clearance-purchase-invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clearance-purchase-invoices"] });
    },
  });

  const clearances = clearancesList || [];

  const [listNumber, setListNumber] = useState("");
  const [clearanceId, setClearanceId] = useState("");
  const [clearanceName, setClearanceName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [carNumber, setCarNumber] = useState("");
  const [manifest, setManifest] = useState("");
  const [customsUsd, setCustomsUsd] = useState("");
  const [customsIqd, setCustomsIqd] = useState("");
  const [description, setDescription] = useState("");
  const [editInvoice, setEditInvoice] = useState<ClearancePurchaseInvoice | null>(null);

  const [historyFilter, setHistoryFilter] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchListNumber, setSearchListNumber] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (nextNumberData?.number && !editInvoice) setListNumber(nextNumberData.number);
  }, [nextNumberData, editInvoice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId && invoices) {
      const inv = invoices.find(i => i.id === parseInt(editId));
      if (inv) {
        setEditInvoice(inv);
        setClearanceId(String(inv.clearanceId));
        const c = clearances.find(b => b.id === inv.clearanceId);
        if (c) setClearanceName(c.name);
        setListNumber(inv.listNumber || "");
        setDate(inv.date);
        setTime(inv.time || "");
        setCarNumber(inv.carNumber || "");
        setManifest(inv.manifest || "");
        setCustomsUsd(inv.customsUsd || "");
        setCustomsIqd(inv.customsIqd || "");
        setDescription(inv.description || "");
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [invoices, clearances]);

  const selectClearance = (id: string) => {
    setClearanceId(id);
    const c = clearances.find(b => b.id === parseInt(id));
    if (c) setClearanceName(c.name);
  };

  const resetForm = () => {
    setClearanceId("");
    setClearanceName("");
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toTimeString().slice(0, 5));
    setCarNumber("");
    setManifest("");
    setCustomsUsd("");
    setCustomsIqd("");
    setDescription("");
    setEditInvoice(null);
    qc.invalidateQueries({ queryKey: ["/api/clearance-purchase-invoices/next-number"] });
  };

  const openEdit = (inv: ClearancePurchaseInvoice) => {
    setEditInvoice(inv);
    setListNumber(inv.listNumber || "");
    setClearanceId(String(inv.clearanceId));
    setClearanceName(inv.clearanceName);
    setDate(inv.date);
    setTime(inv.time || "00:00");
    setCarNumber(inv.carNumber || "");
    setManifest(inv.manifest || "");
    setCustomsUsd(inv.customsUsd);
    setCustomsIqd(inv.customsIqd);
    setDescription(inv.description || "");
  };

  const cancelEdit = () => {
    setEditInvoice(null);
    resetForm();
  };

  const handleSave = () => {
    if (!clearanceId) {
      toast({ title: t("Please select a clearance"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(customsUsd || "0");
    const iqdVal = parseFloat(customsIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }
    const payload = {
      listNumber: listNumber || null,
      clearanceId: parseInt(clearanceId),
      clearanceName,
      date,
      time,
      carNumber: carNumber || null,
      manifest: manifest || null,
      customsUsd: customsUsd || "0",
      customsIqd: customsIqd || "0",
      description: description || null,
    };

    if (editInvoice) {
      updateMutation.mutate({ id: editInvoice.id, data: payload }, {
        onSuccess: () => {
          toast({ title: t("Invoice updated successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to update invoice"), variant: "destructive" });
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: t("Invoice saved successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to save invoice"), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: t("Invoice deleted successfully") }),
      onError: () => toast({ title: t("Failed to delete invoice"), variant: "destructive" }),
    });
  };

  const allInvoices = invoices || [];
  const filteredInvoices = allInvoices.filter(inv => {
    if (historyFilter && historyFilter !== "all" && String(inv.clearanceId) !== historyFilter) return false;
    if (historyFromDate && inv.date < historyFromDate) return false;
    if (historyToDate && inv.date > historyToDate) return false;
    if (searchListNumber && !(inv.listNumber || "").toLowerCase().includes(searchListNumber.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInvoices = filteredInvoices.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  const isSaving = createMutation.isPending;
  const isUpdating = updateMutation.isPending;

  const fieldColor = companyProfile?.primaryColor || "#0ea5e9";
  const textColor = companyProfile?.secondaryColor || "#ffffff";

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const filterName = historyFilter && historyFilter !== "all"
      ? clearances.find(c => String(c.id) === historyFilter)?.name || ""
      : t("All Clearances");

    const totalUsd = filteredInvoices.reduce((s, inv) => s + parseFloat(inv.customsUsd || "0"), 0);
    const totalIqd = filteredInvoices.reduce((s, inv) => s + parseFloat(inv.customsIqd || "0"), 0);

    const rows = filteredInvoices.map((inv, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${inv.listNumber || "-"}</td>
        <td>${formatDate(inv.date)}</td>
        <td><strong>${inv.clearanceName}</strong></td>
        <td>${inv.carNumber || "-"}</td>
        <td>${inv.manifest || "-"}</td>
        <td class="debit">${parseFloat(inv.customsUsd) > 0 ? usd(inv.customsUsd) : "-"}</td>
        <td class="credit">${parseFloat(inv.customsIqd) > 0 ? parseFloat(inv.customsIqd).toLocaleString() + " IQD" : "-"}</td>
        <td>${inv.description || "-"}</td>
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
        <title>${t("Clearance Purchase Invoice Report")}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="report-banner">
          <div class="banner-right">
            <h1>${t("Clearance Purchase Invoice Report")}</h1>
            <div class="supplier-name">${filterName}</div>
            <div class="date-range">${dateRangeText}</div>
          </div>
          <div class="banner-left" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:10px;" />` : ""}
            <div style="font-size:11pt;font-weight:700;color:${fieldColor};">${t("Total Records")}: ${filteredInvoices.length}</div>
          </div>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-blue"><div class="label">${t("Total Customs USD")}</div><div class="value blue">${usd(totalUsd)}</div></div>
          <div class="summary-card accent-red"><div class="label">${t("Total Customs IQD")}</div><div class="value red">${totalIqd.toLocaleString()} IQD</div></div>
          <div class="summary-card accent-green"><div class="label">${t("Total Records")}</div><div class="value green">${filteredInvoices.length}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("List No")}</th>
              <th>${t("Date")}</th>
              <th>${t("Customs Clearance")}</th>
              <th>${t("Car Number")}</th>
              <th>${t("Manifest")}</th>
              <th>${t("Customs USD")}</th>
              <th>${t("Customs IQD")}</th>
              <th>${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="6"><strong>${t("Total")}</strong></td>
              <td class="debit"><strong>${usd(totalUsd)}</strong></td>
              <td class="credit"><strong>${totalIqd.toLocaleString()} IQD</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
            <Link href="/clearance-management">
              <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-back">
                <Undo2 className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <FileText className="h-7 w-7 text-sky-600 dark:text-sky-400" />
            </div>
            {t('Clearance Purchase Invoices')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('Manage purchase invoices for customs clearances')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-form">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {editInvoice && <Pencil className="h-5 w-5 text-orange-600" />}
                {editInvoice ? t('Edit Invoice') : t('Invoice Details')}
              </CardTitle>
              {editInvoice && (
                <Button variant="outline" size="sm" onClick={cancelEdit} data-testid="button-cancel-edit">
                  {t('Cancel')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('List No')}</Label>
                <Input value={listNumber} readOnly className="bg-muted cursor-not-allowed font-mono" data-testid="input-list-number" />
              </div>
              <div className="space-y-2">
                <Label>{t('Customs Clearance')}</Label>
                <SearchSelect
                  items={clearances.map(c => ({ id: c.id, name: c.name }))}
                  value={clearanceId}
                  onValueChange={selectClearance}
                  placeholder={t('Select clearance...')}
                  data-testid="select-clearance"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-time" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Car Number')}</Label>
                <Input dir="ltr" value={carNumber} onChange={(e) => setCarNumber(e.target.value)} placeholder={t('Car Number')} data-testid="input-car-number" />
              </div>
              <div className="space-y-2">
                <Label>{t('Manifest')}</Label>
                <Input dir="ltr" value={manifest} onChange={(e) => setManifest(e.target.value)} placeholder={t('Manifest')} data-testid="input-manifest" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <IconDollar className="h-5 w-5 text-blue-600" />
                  {t('Customs USD')}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customsUsd}
                  onChange={(e) => setCustomsUsd(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                  data-testid="input-customs-usd"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <IconDinar className="h-5 w-5 text-orange-600" />
                  {t('Customs IQD')}
                </Label>
                <Input
                  type="number"
                  step="1"
                  value={customsIqd}
                  onChange={(e) => setCustomsIqd(e.target.value)}
                  placeholder="0"
                  className="font-mono"
                  data-testid="input-customs-iqd"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('Description')} className="resize-none" rows={2} data-testid="input-description" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clearanceName && (
              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
                <p className="text-sm text-sky-600 dark:text-sky-400 font-medium">{t('Customs Clearance')}</p>
                <p className="font-bold text-lg" data-testid="text-selected-clearance">{clearanceName}</p>
              </div>
            )}
            {carNumber && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-muted-foreground font-medium">{t('Car Number')}</p>
                <p className="font-bold" data-testid="text-car-number">{carNumber}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-600">{t('Customs USD')}</span>
                <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-customs-usd-total">
                  {usd(customsUsd || "0")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">{t('Customs IQD')}</span>
                <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-customs-iqd-total">
                  {formatIQD(parseFloat(customsIqd || "0"))}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={(editInvoice ? isUpdating : isSaving) || !clearanceId}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] shadow-sm hover:shadow-md px-4 py-2 w-full h-12 text-base gap-2 bg-sky-600 hover:bg-sky-700 text-[#ffffff]"
              data-testid="button-save-invoice"
            >
              {(editInvoice ? isUpdating : isSaving) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {editInvoice ? t('Update') : t('Save Invoice')}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-sky-600" />
              {t('Invoice History')}
              <Badge variant="secondary" className="ml-2">{filteredInvoices.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-history-to-date" />
              </div>
              <div className="w-48">
                <SearchSelect
                  items={clearances.map(c => ({ id: c.id, name: c.name }))}
                  value={historyFilter === "all" ? "" : historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  placeholder={t('All Clearances')}
                  showAllOption
                  allOptionLabel={t('All Clearances')}
                  data-testid="select-filter-clearance"
                />
              </div>
              <SearchInput
                placeholder={t('List No')}
                value={searchListNumber}
                onChange={(e) => { setSearchListNumber(e.target.value); setCurrentPage(1); }}
                onClear={() => { setSearchListNumber(""); setCurrentPage(1); }}
                containerClassName="w-48"
                className="h-9"
                data-testid="input-search-list-number"
              />
              <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-2 h-9" data-testid="button-print-report">
                <Printer className="h-5 w-5" />
                {t('Report')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('List No')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Customs Clearance')}</TableHead>
                    <TableHead>{t('Car Number')}</TableHead>
                    <TableHead>{t('Manifest')}</TableHead>
                    <TableHead>{t('Customs USD')}</TableHead>
                    <TableHead>{t('Customs IQD')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((inv, i) => (
                    <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{inv.listNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(inv.date)}</TableCell>
                      <TableCell className="font-medium">{inv.clearanceName}</TableCell>
                      <TableCell className="text-sm">{inv.carNumber || "-"}</TableCell>
                      <TableCell className="text-sm">{inv.manifest || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">
                        {parseFloat(inv.customsUsd) > 0 ? usd(inv.customsUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-orange-600">
                        {parseFloat(inv.customsIqd) > 0 ? formatIQD(parseFloat(inv.customsIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inv.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => openEdit(inv)}
                            data-testid={`button-edit-invoice-${inv.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-invoice-${inv.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this invoice.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(inv.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {t('No invoices yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredInvoices.length)} {t('of')} {filteredInvoices.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} data-testid="button-prev-page">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button key={page} variant={page === safePage ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(page)} data-testid={`button-page-${page}`}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} data-testid="button-next-page">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
