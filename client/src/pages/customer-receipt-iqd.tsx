import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCustomerReceipts, useCreateCustomerReceipt, useUpdateCustomerReceipt, useDeleteCustomerReceipt } from "@/hooks/use-customer-receipts";
import { useQuery } from "@tanstack/react-query";
import type { Client, Bank, TransferOffice, CustomerReceipt, Representative } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { CustomerSearchSelect } from "@/components/customer-search-select";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, Percent, Pencil, Trash2, ChevronLeft, ChevronRight, Search, ArrowLeft, Eye, Printer } from "lucide-react";
import { useLocation } from "wouter";
import { IconDinar, IconOffice, IconBank } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import CustomerReceiptReport from "@/components/customer-receipt-report";
import { formatDate } from "@/lib/format-utils";
import { getModernPrintStyles } from "@/lib/print-styles";

type CompanyProfileData = {
  id: number; name: string; address: string; mobile1: string; mobile2: string;
  businessType: string; logo: string | null; cliche: string | null; stamp: string | null;
  qrAddress: string; primaryColor: string; secondaryColor: string;
};

export default function CustomerReceiptIqdPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const { data: receipts, isLoading: receiptsLoading } = useCustomerReceipts();
  const { mutate: createReceipt, isPending: isSaving } = useCreateCustomerReceipt();
  const { mutate: updateReceipt, isPending: isUpdating } = useUpdateCustomerReceipt();
  const { mutate: deleteReceipt } = useDeleteCustomerReceipt();

  const { data: customers } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    select: (data: Client[]) => data.filter(c => c.type === "customer"),
  });

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const { data: nextNumber } = useQuery<{ receiptNumber: string }>({
    queryKey: ["/api/customer-receipts/next-number"],
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: representativesList } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"],
  });

  const [receiptNumber, setReceiptNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));

  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [searchNumber, setSearchNumber] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [editReceipt, setEditReceipt] = useState<CustomerReceipt | null>(null);
  const [reportReceipt, setReportReceipt] = useState<CustomerReceipt | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  if (nextNumber?.receiptNumber && !receiptNumber) {
    setReceiptNumber(nextNumber.receiptNumber);
  }

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const iqdReceipts = receipts?.filter(r => r.currency === "IQD") || [];

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  const selectCustomer = useCallback((id: string) => {
    if (!id) {
      setCustomerId("");
      setCustomerName("");
      return;
    }
    setCustomerId(id);
    const customer = customers?.find(c => c.id === parseInt(id));
    if (customer) {
      setCustomerName(customer.name);
    }
  }, [customers]);

  const selectPaymentSource = useCallback((val: string) => {
    setPaymentSource(val);
    const [type, id] = val.split(":");
    if (type === "bank") {
      const bank = banksList?.find(b => b.id === parseInt(id));
      if (bank) setPaymentSourceName(`${t("Bank")} - ${bank.name}`);
    } else {
      const office = transferOfficesList?.find(o => o.id === parseInt(id));
      if (office) setPaymentSourceName(`${t("Transfer Office")} - ${office.name}`);
    }
  }, [banksList, transferOfficesList, t]);

  const selectedCustomer = customers?.find(c => c.id === parseInt(customerId));

  const { data: currentBalance, isLoading: balanceLoading } = useQuery<{ openingBalance: number }>({
    queryKey: ["/api/customer-opening-balance", customerId, "current", "IQD"],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId,
        date: "2099-12-31",
        time: "23:59",
        currency: "IQD",
      });
      const res = await fetch(`/api/customer-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!customerId,
    staleTime: 0,
  });

  const resetForm = () => {
    setEditReceipt(null);
    setReceiptNumber("");
    setCustomerId("");
    setCustomerName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setRepresentativeName("");
    setAmount("");
    setDiscount("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const openEdit = (r: CustomerReceipt) => {
    setEditReceipt(r);
    setReceiptNumber(r.receiptNumber || "");
    setCustomerId(String(r.customerId));
    setCustomerName(r.customerName);
    const src = r.paymentSource || "";
    if (src === "bank") {
      const bank = banksList?.find(b => r.paymentSourceName?.includes(b.name));
      setPaymentSource(bank ? `bank:${bank.id}` : src);
    } else if (src === "transfer_office") {
      const office = transferOfficesList?.find(o => r.paymentSourceName?.includes(o.name));
      setPaymentSource(office ? `transfer_office:${office.id}` : src);
    } else {
      setPaymentSource(src);
    }
    setPaymentSourceName(r.paymentSourceName);
    setAmount(r.amount);
    setDiscount(r.discount);
    setNote(r.note || "");
    setReference(r.reference || "");
    setRepresentativeName(r.representativeName || "");
    setDate(r.date);
    setTime(r.time || "00:00");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!customerId) {
      toast({ title: t("Please select a customer"), variant: "destructive" });
      return;
    }
    if (!paymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const amountVal = parseFloat(amount || "0");
    const discountVal = parseFloat(discount || "0");
    if (amountVal <= 0 && discountVal <= 0) {
      toast({ title: t("Please enter an amount or discount"), variant: "destructive" });
      return;
    }

    if (editReceipt) {
      updateReceipt({ id: editReceipt.id, data: {
        customerId: parseInt(customerId),
        customerName,
        paymentSource: paymentSource.split(":")[0],
        paymentSourceName,
        representativeName: representativeName || null,
        amount: amount || "0",
        discount: discount || "0",
        currency: "IQD",
        note: note || null,
        reference: reference || null,
        date,
        time,
      }}, {
        onSuccess: () => {
          toast({ title: t("Receipt updated successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to update receipt"), variant: "destructive" });
        },
      });
    } else {
      createReceipt({
        receiptNumber,
        customerId: parseInt(customerId),
        customerName,
        paymentSource: paymentSource.split(":")[0],
        paymentSourceName,
        representativeName: representativeName || null,
        amount: amount || "0",
        discount: discount || "0",
        currency: "IQD",
        note: note || null,
        reference: reference || null,
        date,
        time,
      }, {
        onSuccess: () => {
          toast({ title: t("Receipt saved successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to save receipt"), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteReceipt(id, {
      onSuccess: () => {
        toast({ title: t("Receipt deleted successfully") });
      },
      onError: () => {
        toast({ title: t("Failed to delete receipt"), variant: "destructive" });
      },
    });
  };

  const filteredReceipts = iqdReceipts.filter(r => {
    if (historyFilter && historyFilter !== "all" && String(r.customerId) !== historyFilter) return false;
    if (historyFromDate && r.date < historyFromDate) return false;
    if (historyToDate && r.date > historyToDate) return false;
    if (searchNumber && !(r.receiptNumber || "").toLowerCase().includes(searchNumber.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReceipts = filteredReceipts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalDeducted = parseFloat(amount || "0") + parseFloat(discount || "0");

  const [, navigate] = useLocation();

  const handlePrintList = () => {
    const selectedCust = historyFilter && historyFilter !== "all"
      ? customers?.find(c => c.id === parseInt(historyFilter))
      : null;
    const totalAmount = filteredReceipts.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
    const totalDiscount = filteredReceipts.reduce((s, r) => s + parseFloat(r.discount || "0"), 0);
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: companyProfile?.primaryColor || "#1e293b", accentTextColor: "#ffffff" });
    const primaryColor = companyProfile?.primaryColor || "#1e293b";

    const rows = filteredReceipts.map((r, i) => {
      const amt = parseFloat(r.amount || "0");
      const disc = parseFloat(r.discount || "0");
      return `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;font-size:9pt;">${r.receiptNumber || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${formatDate(r.date)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">${r.time || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:9pt;">${r.customerName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;">${r.paymentSourceName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${isRtl ? "left" : "right"};font-family:monospace;font-weight:700;color:#c2410c;font-size:9pt;">${amt.toLocaleString()} IQD</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${isRtl ? "left" : "right"};font-family:monospace;color:#16a34a;font-size:9pt;">${disc > 0 ? disc.toLocaleString() + " IQD" : "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:8pt;color:#64748b;max-width:180px;">${r.note || "-"}</td>
      </tr>`;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Customer Receipt IQD")} - ${t("Receipt History")}</title>
        <style>
          ${printStyles}
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;" />` : ""}
            <div style="background:${primaryColor};color:#fff;padding:8px 20px;border-radius:8px;display:inline-block;">
              <h1 style="font-size:15pt;margin:0;font-weight:800;">${t("Customer Receipt IQD")} - ${t("Receipt History")}</h1>
            </div>
          </div>
          <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#555;font-weight:600;flex-wrap:wrap;">
            ${selectedCust ? `<span>${t("Customer Name")}: <strong style="color:${primaryColor}">${selectedCust.name}</strong></span>` : `<span>${t("All Customers")}</span>`}
            <span>${t("From Date")}: <strong>${formatDate(historyFromDate)}</strong></span>
            <span>${t("To Date")}: <strong>${formatDate(historyToDate)}</strong></span>
            <span>${t("Count")}: <strong>${filteredReceipts.length}</strong></span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:${primaryColor};color:#fff;">
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Receipt Number")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Time")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Source")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${isRtl ? "left" : "right"};">${t("Amount")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${isRtl ? "left" : "right"};">${t("Discount")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Notes")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f1f5f9;font-weight:800;">
              <td colspan="6" style="padding:8px;font-size:10pt;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#c2410c;text-align:${isRtl ? "left" : "right"};">${totalAmount.toLocaleString()} IQD</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#16a34a;text-align:${isRtl ? "left" : "right"};">${totalDiscount > 0 ? totalDiscount.toLocaleString() + " IQD" : "-"}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align:center;margin-top:12px;font-size:9pt;color:#94a3b8;">
          ${companyProfile?.name || ""} ${companyProfile?.mobile1 ? " | " + companyProfile.mobile1 : ""}
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank", "width=1200,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    if (w.document.fonts?.ready) {
      w.document.fonts.ready.then(() => setTimeout(() => w.print(), 200));
    } else {
      setTimeout(() => w.print(), 800);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <IconDinar className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            {t('Customer Receipt IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Receive payments from customers in IQD')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/sales-management")} data-testid="button-back-sales-management">
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('Sales Management')}
          </Button>
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-receipt">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {editReceipt ? (
                <span className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-orange-500" />
                  {t('Edit Receipt')} #{editReceipt.receiptNumber}
                </span>
              ) : t('Receipt Details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Receipt Number')}</Label>
                <Input
                  value={receiptNumber}
                  readOnly
                  className="bg-muted/50 font-mono font-bold text-center"
                  data-testid="input-receipt-number"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Customer Name')}</Label>
                <CustomerSearchSelect
                  customers={customers || []}
                  value={customerId}
                  onValueChange={selectCustomer}
                  placeholder={t('Select customer...')}
                  data-testid="select-receipt-customer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-receipt-date"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  data-testid="input-receipt-time"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Amount Received At')}</Label>
                <SearchSelect
                  items={[
                    ...banks.map(b => ({ id: `bank:${b.id}`, name: b.name })),
                    ...transferOffices.map(o => ({ id: `transfer_office:${o.id}`, name: o.name })),
                  ]}
                  value={paymentSource}
                  onValueChange={(v) => selectPaymentSource(v || "")}
                  placeholder={t('Select account where amount was received...')}
                  data-testid="select-receipt-source"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>{t('Via Representative')}</Label>
                <SearchSelect
                  items={(representativesList || []).filter(r => !r.hidden).map(r => ({ id: r.name, name: r.name }))}
                  value={representativeName}
                  onValueChange={(v) => setRepresentativeName(v || "")}
                  placeholder={t('Select representative...')}
                  data-testid="select-receipt-representative"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <IconDinar className="h-5 w-5 text-orange-600" />
                    {t('Amount')} (IQD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="250"
                    min="0"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-receipt-amount"
                  />
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Percent className="h-5 w-5 text-green-600" />
                    {t('Discount')} (IQD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="250"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-receipt-discount"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input
                  placeholder={t('Reference number...')}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="input-receipt-reference"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Textarea
                  placeholder={t('Notes...')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none h-10"
                  data-testid="input-receipt-note"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-orange-200 dark:border-orange-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Receipt Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Customer Name')}</p>
                    <p className="font-bold text-lg">{selectedCustomer.name}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-receipt-amount-total">
                    {formatIQD(parseFloat(amount || "0"))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-600">{t('Discount')}</span>
                  <span className="font-mono font-bold text-lg text-green-600" data-testid="text-receipt-discount-total">
                    {formatIQD(parseFloat(discount || "0"))}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('Total Deducted')}</span>
                  <span className="font-mono font-bold text-lg" data-testid="text-receipt-total-deducted">
                    {formatIQD(totalDeducted)}
                  </span>
                </div>
              </div>

              {paymentSource && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Received at')}</p>
                    <p className="font-medium text-sm">{paymentSourceName}</p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={(editReceipt ? isUpdating : isSaving) || !customerId || !paymentSource}
                className={`w-full h-12 text-base gap-2 ${editReceipt ? "bg-orange-600 hover:bg-orange-700" : "bg-orange-600 hover:bg-orange-700"}`}
                data-testid="button-save-receipt"
              >
                {(editReceipt ? isUpdating : isSaving) ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {editReceipt ? t('Update Receipt') : t('Save Receipt')}
              </Button>
              {editReceipt && (
                <Button variant="outline" onClick={resetForm} className="w-full h-10 gap-2 mt-2" data-testid="button-cancel-edit-receipt">
                  <RotateCcw className="h-4 w-4" />
                  {t('Cancel Edit')}
                </Button>
              )}
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{t('Current Debt IQD')}</p>
                  <p className="font-mono text-2xl font-bold text-red-600">
                    {balanceLoading ? "..." : formatIQD(currentBalance?.openingBalance ?? 0)}
                  </p>
                  {totalDeducted > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">{t('After Receipt')}</p>
                      <p className="font-mono text-xl font-bold text-emerald-600">
                        {balanceLoading ? "..." : formatIQD((currentBalance?.openingBalance ?? 0) - totalDeducted)}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-orange-600" />
              {t('Receipt History')}
              <Badge variant="secondary" className="ml-2">{filteredReceipts.length}</Badge>
              <Button variant="outline" size="sm" onClick={handlePrintList} disabled={filteredReceipts.length === 0} className="ml-2 gap-1" data-testid="button-print-receipt-list">
                <Printer className="h-4 w-4" />
                {t('Print List')}
              </Button>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => { setSearchNumber(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-search-receipt-number" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-receipt-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-receipt-history-to-date" />
              </div>
              <div className="w-64">
                <CustomerSearchSelect
                  customers={customers || []}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  showAllOption
                  allOptionLabel={t('All Customers')}
                  placeholder={t('All Customers')}
                  inputClassName="h-9 text-sm"
                  data-testid="select-filter-receipt-history"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {receiptsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Receipt Number')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Customer Name')}</TableHead>
                    <TableHead>{t('Source')}</TableHead>
                    <TableHead>{t('Amount')}</TableHead>
                    <TableHead>{t('Discount')}</TableHead>
                    <TableHead>{t('Notes')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReceipts.map((r, i) => (
                    <TableRow key={r.id} data-testid={`row-receipt-${r.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-bold">{r.receiptNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(r.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{r.time || "-"}</TableCell>
                      <TableCell className="font-medium">{r.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{r.paymentSourceName}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">
                        {parseFloat(r.amount) > 0 ? formatIQD(parseFloat(r.amount)) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {parseFloat(r.discount) > 0 ? formatIQD(parseFloat(r.discount)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => { setReportReceipt(r); setReportOpen(true); }}
                            data-testid={`button-view-receipt-${r.id}`}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(r)}
                            data-testid={`button-edit-receipt-${r.id}`}
                          >
                            <Pencil className="h-5 w-5 text-orange-600" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-receipt-${r.id}`}
                              >
                                <Trash2 className="h-5 w-5 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this receipt.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(r.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedReceipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        {t('No receipts yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredReceipts.length)} {t('of')} {filteredReceipts.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-receipt-history-prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === safePage ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-receipt-history-page-${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    data-testid="button-receipt-history-next"
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

      <CustomerReceiptReport
        receipt={reportReceipt}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}
