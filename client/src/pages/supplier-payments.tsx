import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useSupplierPayments, useCreateSupplierPayment } from "@/hooks/use-supplier-payments";
import { useQuery } from "@tanstack/react-query";
import type { Client, Bank, TransferOffice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, ArrowLeft, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconDollar, IconDinar, IconOffice, IconBank, IconExternalDebt } from "@/components/erp-icons";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, usd } from "@/lib/format-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { playDeleteSound } from "@/lib/sounds";
import { broadcastDataUpdate } from "@/lib/broadcast";
import SupplierPaymentReport from "@/components/supplier-payment-report";
import { SupplierSearchSelect } from "@/components/supplier-search-select";
import { SearchSelect } from "@/components/search-select";

export default function SupplierPaymentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: payments, isLoading: paymentsLoading } = useSupplierPayments();
  const { mutate: createPayment, isPending: isSaving } = useCreateSupplierPayment();

  const { data: suppliers } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    select: (data: Client[]) => data.filter(c => c.type === "supplier"),
  });

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [showStamp, setShowStamp] = useState(false);
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [commissionUsd, setCommissionUsd] = useState("");
  const [commissionIqd, setCommissionIqd] = useState("");
  const [usdExchangeType, setUsdExchangeType] = useState("usd");
  const [iqdExchangeType, setIqdExchangeType] = useState("iqd");
  const [usdEquivalentAmount, setUsdEquivalentAmount] = useState("");
  const [usdEquivalentCommission, setUsdEquivalentCommission] = useState("");
  const [iqdEquivalentAmount, setIqdEquivalentAmount] = useState("");
  const [iqdEquivalentCommission, setIqdEquivalentCommission] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [isEditMode, setIsEditMode] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchNumber, setSearchNumber] = useState("");
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [reportPaymentId, setReportPaymentId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCurrency, setReportCurrency] = useState<"USD" | "IQD">("USD");
  const [deletePayment, setDeletePayment] = useState<{ id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const editId = new URLSearchParams(window.location.search).get("edit");

  const fetchNextReceiptNumber = useCallback(() => {
    fetch("/api/supplier-payments/next-receipt-number", { credentials: "include" })
      .then(res => res.json())
      .then(data => setReceiptNumber(data.receiptNumber || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) {
      fetchNextReceiptNumber();
    }
  }, [editId, fetchNextReceiptNumber]);

  useEffect(() => {
    if (editId) {
      fetch(`/api/supplier-payments/${editId}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setSupplierId(String(data.supplierId));
          setSupplierName(data.supplierName || "");
          setAmountUsd(data.amountUsd || "0");
          setAmountIqd(data.amountIqd || "0");
          setCommissionUsd(data.commissionUsd || "0");
          setCommissionIqd(data.commissionIqd || "0");
          setUsdExchangeType(data.usdExchangeType || "usd");
          setIqdExchangeType(data.iqdExchangeType || "iqd");
          setUsdEquivalentAmount(data.usdEquivalentAmount || "0");
          setUsdEquivalentCommission(data.usdEquivalentCommission || "0");
          setIqdEquivalentAmount(data.iqdEquivalentAmount || "0");
          setIqdEquivalentCommission(data.iqdEquivalentCommission || "0");
          setReceiptNumber(data.receiptNumber || "");
          setNote(data.note || "");
          setReference(data.reference || "");
          setDate(data.date || new Date().toISOString().split('T')[0]);
          setTime(data.time || new Date().toTimeString().slice(0, 5));
          setPaymentSource(data.paymentSource || "");
          setPaymentSourceName(data.paymentSourceName || "");
          setIsEditMode(true);
        });
    }
  }, [editId]);

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const selectSupplier = useCallback((id: string) => {
    setSupplierId(id);
    const supplier = suppliers?.find(s => s.id === parseInt(id));
    if (supplier) {
      setSupplierName(supplier.name);
    }
  }, [suppliers]);

  const selectPaymentSource = useCallback((val: string) => {
    setPaymentSource(val);
    if (val === "byhand:0") {
      setPaymentSourceName(t("By Hand"));
    } else {
      const [type, id] = val.split(":");
      if (type === "bank") {
        const bank = banksList?.find(b => b.id === parseInt(id));
        if (bank) setPaymentSourceName(`${t("Bank")} - ${bank.name}`);
      } else {
        const office = transferOfficesList?.find(o => o.id === parseInt(id));
        if (office) setPaymentSourceName(`${t("Transfer Office")} - ${office.name}`);
      }
    }
  }, [banksList, transferOfficesList, t]);

  const selectedSupplier = suppliers?.find(s => s.id === parseInt(supplierId));
  const isBank = paymentSource.startsWith("bank:");

  const { data: openingBalance } = useQuery<{ openingBalanceUsd: number; openingBalanceIqd: number }>({
    queryKey: ["/api/supplier-opening-balance", supplierId, date, time, editId],
    queryFn: async () => {
      const params = new URLSearchParams({ supplierId, date, time });
      if (editId) params.append("excludePaymentId", editId);
      const res = await fetch(`/api/supplier-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!supplierId && !!date && !!time,
    staleTime: 0,
  });

  const handleDeletePayment = async () => {
    if (!deletePayment) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/supplier-payments/${deletePayment.id}`);
      playDeleteSound();
      toast({ title: t("Payment deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments"] });
      broadcastDataUpdate("supplier-statement");
      setDeletePayment(null);
    } catch (err: any) {
      toast({ title: t("Failed to delete payment"), description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setSupplierId("");
    setSupplierName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setAmountUsd("");
    setAmountIqd("");
    setCommissionUsd("");
    setCommissionIqd("");
    setUsdExchangeType("usd");
    setIqdExchangeType("iqd");
    setUsdEquivalentAmount("");
    setUsdEquivalentCommission("");
    setIqdEquivalentAmount("");
    setIqdEquivalentCommission("");
    setReceiptNumber("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = async () => {
    if (!supplierId) {
      toast({ title: t("Please select a supplier"), variant: "destructive" });
      return;
    }
    if (!paymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one payment amount"), variant: "destructive" });
      return;
    }

    const payload = {
      supplierId: parseInt(supplierId),
      supplierName,
      paymentSource: paymentSource.includes(":") ? paymentSource.split(":")[0] : paymentSource,
      paymentSourceName,
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      commissionUsd: commissionUsd || "0",
      commissionIqd: commissionIqd || "0",
      usdExchangeType: isBank ? usdExchangeType : "usd",
      iqdExchangeType: isBank ? iqdExchangeType : "iqd",
      usdEquivalentAmount: (isBank && usdExchangeType === "iqd") ? (usdEquivalentAmount || "0") : "0",
      usdEquivalentCommission: (isBank && usdExchangeType === "iqd") ? (usdEquivalentCommission || "0") : "0",
      iqdEquivalentAmount: (isBank && iqdExchangeType === "usd") ? (iqdEquivalentAmount || "0") : "0",
      iqdEquivalentCommission: (isBank && iqdExchangeType === "usd") ? (iqdEquivalentCommission || "0") : "0",
      receiptNumber: receiptNumber || null,
      note: note || null,
      reference: reference || null,
      date,
      time,
    };

    if (isEditMode && editId) {
      try {
        await apiRequest("PATCH", `/api/supplier-payments/${editId}`, payload);
        toast({ title: t("Payment updated successfully") });
        queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments"] });
        broadcastDataUpdate("supplier-statement");
        resetForm();
        setIsEditMode(false);
        fetchNextReceiptNumber();
        navigate("/supplier-payments");
      } catch {
        toast({ title: t("Failed to update payment"), variant: "destructive" });
      }
    } else {
      createPayment(payload, {
        onSuccess: () => {
          toast({ title: t("Payment saved successfully") });
          broadcastDataUpdate("supplier-statement");
          resetForm();
          fetchNextReceiptNumber();
        },
        onError: () => {
          toast({ title: t("Failed to save payment"), variant: "destructive" });
        },
      });
    }
  };

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  const filteredPayments = (payments || []).filter(p => {
    if (historyFilter && historyFilter !== "all" && String(p.supplierId) !== historyFilter) return false;
    const pDate = typeof p.date === 'string' ? p.date.split('T')[0] : new Date(p.date).toISOString().split('T')[0];
    if (historyFromDate && pDate < historyFromDate) return false;
    if (historyToDate && pDate > historyToDate) return false;
    if (searchNumber && !(p.receiptNumber || "").toLowerCase().includes(searchNumber.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/supplier-management">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
              <ArrowLeft className="h-5 w-5" />
              {t("Supplier Management")}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconDinar className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEditMode ? t('Edit Payment') : t('Supplier Payments')}
          </h1>
        </div>
        <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-payment">
          <RotateCcw className="h-5 w-5" />
          {t('Reset')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Payment Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-bold">{t('Invoice Number')}</Label>
                <Input
                  value={receiptNumber}
                  readOnly
                  className="h-11 text-base font-semibold bg-muted cursor-not-allowed"
                  data-testid="input-receipt-number"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Supplier')}</Label>
                <SupplierSearchSelect
                  suppliers={suppliers || []}
                  value={supplierId}
                  onValueChange={selectSupplier}
                  placeholder={t('Select supplier...')}
                  data-testid="select-payment-supplier"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-payment-date"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  data-testid="input-payment-time"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Payment Source')}</Label>
                <SearchSelect
                  items={[
                    { id: "byhand:0", name: t('By Hand') },
                    ...(banksList || []).map(b => ({ id: `bank:${b.id}`, name: b.name })),
                    ...(transferOfficesList || []).map(o => ({ id: `transfer_office:${o.id}`, name: o.name })),
                  ]}
                  value={paymentSource}
                  onValueChange={selectPaymentSource}
                  placeholder={t('Select bank or transfer office...')}
                  data-testid="select-payment-source"
                />
              </div>
            </div>


            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <IconDollar className="h-5 w-5" />
                    {t('USD Account')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isBank && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('Exchange Type')}</Label>
                      <Select value={usdExchangeType} onValueChange={(v) => { setUsdExchangeType(v); if (v === "usd") { setUsdEquivalentAmount(""); setUsdEquivalentCommission(""); } }}>
                        <SelectTrigger data-testid="select-usd-exchange-type" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usd">{t('Against USD')}</SelectItem>
                          <SelectItem value="iqd">{t('Against IQD')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('USD Payment')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amountUsd}
                      onChange={(e) => setAmountUsd(e.target.value)}
                      className="text-lg font-mono text-center h-12"
                      data-testid="input-payment-usd"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('Commission USD')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={commissionUsd}
                      onChange={(e) => setCommissionUsd(e.target.value)}
                      className="text-sm font-mono text-center h-10 bg-blue-50/30 dark:bg-blue-950/20"
                      data-testid="input-commission-usd"
                    />
                  </div>
                  {isBank && usdExchangeType === "iqd" && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-orange-600 font-semibold">{t('IQD Equivalent')}</Label>
                        <Input
                          type="number"
                          step="250"
                          min="0"
                          placeholder="0"
                          value={usdEquivalentAmount}
                          onChange={(e) => setUsdEquivalentAmount(e.target.value)}
                          className="text-lg font-mono text-center h-12 border-orange-300 dark:border-orange-800"
                          data-testid="input-usd-equivalent-iqd"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-orange-600 font-semibold">{t('IQD Commission')}</Label>
                        <Input
                          type="number"
                          step="250"
                          min="0"
                          placeholder="0"
                          value={usdEquivalentCommission}
                          onChange={(e) => setUsdEquivalentCommission(e.target.value)}
                          className="text-sm font-mono text-center h-10 border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20"
                          data-testid="input-usd-equivalent-commission-iqd"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <IconDinar className="h-5 w-5" />
                    {t('IQD Account')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isBank && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('Exchange Type')}</Label>
                      <Select value={iqdExchangeType} onValueChange={(v) => { setIqdExchangeType(v); if (v === "iqd") { setIqdEquivalentAmount(""); setIqdEquivalentCommission(""); } }}>
                        <SelectTrigger data-testid="select-iqd-exchange-type" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iqd">{t('Against IQD')}</SelectItem>
                          <SelectItem value="usd">{t('Against USD')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('IQD Payment')}</Label>
                    <Input
                      type="number"
                      step="250"
                      min="0"
                      placeholder="0"
                      value={amountIqd}
                      onChange={(e) => setAmountIqd(e.target.value)}
                      className="text-lg font-mono text-center h-12"
                      data-testid="input-payment-iqd"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('Commission IQD')}</Label>
                    <Input
                      type="number"
                      step="250"
                      min="0"
                      placeholder="0"
                      value={commissionIqd}
                      onChange={(e) => setCommissionIqd(e.target.value)}
                      className="text-sm font-mono text-center h-10 bg-orange-50/30 dark:bg-orange-950/20"
                      data-testid="input-commission-iqd"
                    />
                  </div>
                  {isBank && iqdExchangeType === "usd" && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-blue-600 font-semibold">{t('USD Equivalent')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={iqdEquivalentAmount}
                          onChange={(e) => setIqdEquivalentAmount(e.target.value)}
                          className="text-lg font-mono text-center h-12 border-blue-300 dark:border-blue-800"
                          data-testid="input-iqd-equivalent-usd"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-blue-600 font-semibold">{t('USD Commission')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={iqdEquivalentCommission}
                          onChange={(e) => setIqdEquivalentCommission(e.target.value)}
                          className="text-sm font-mono text-center h-10 border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20"
                          data-testid="input-iqd-equivalent-commission-usd"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea
                placeholder={t('Notes...')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none h-10"
                data-testid="input-payment-note"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="border-emerald-200 dark:border-emerald-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSupplier && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Supplier')}</p>
                    <p className="font-bold text-lg">{selectedSupplier.name}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-payment-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-payment-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
                {(parseFloat(commissionUsd || "0") > 0 || parseFloat(commissionIqd || "0") > 0) && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('Commission USD')}</span>
                      <span className="font-mono text-sm" data-testid="text-commission-usd-total">
                        {usd(commissionUsd || "0")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('Commission IQD')}</span>
                      <span className="font-mono text-sm" data-testid="text-commission-iqd-total">
                        {formatIQD(parseFloat(commissionIqd || "0"))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {paymentSource && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Source')}</p>
                    <p className="font-medium text-sm">{paymentSourceName}</p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={isSaving || !supplierId || !paymentSource}
                className="w-full h-12 text-base gap-2 bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-save-payment"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Payment')}
              </Button>
            </CardContent>
          </Card>

          {selectedSupplier && (
            <Card className="border-red-200 dark:border-red-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-600">{t('Opening Balance')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('Opening Balance')} USD</span>
                  <span className="font-mono font-bold text-red-600">{usd(openingBalance?.openingBalanceUsd ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('Opening Balance')} IQD</span>
                  <span className="font-mono font-bold text-red-600">{formatIQD(openingBalance?.openingBalanceIqd ?? 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('After Payment USD')}</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {usd((openingBalance?.openingBalanceUsd ?? 0) - parseFloat(amountUsd || "0"))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('After Payment IQD')}</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatIQD((openingBalance?.openingBalanceIqd ?? 0) - parseFloat(amountIqd || "0"))}
                  </span>
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
              <ListOrdered className="h-5 w-5 text-emerald-600" />
              {t('Payment History')}
              <Badge variant="secondary" className="ml-2">{filteredPayments.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="show-stamp-filter" checked={showStamp} onCheckedChange={(checked) => setShowStamp(!!checked)} data-testid="switch-show-stamp" />
                <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <SearchInput placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => { setSearchNumber(e.target.value); setCurrentPage(1); }} onClear={() => { setSearchNumber(""); setCurrentPage(1); }} containerClassName="w-48" className="h-9" data-testid="input-search-payment-number" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-payment-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-payment-history-to-date" />
              </div>
              <div className="w-48">
                <SupplierSearchSelect
                  suppliers={suppliers || []}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  showAllOption
                  allOptionLabel={t('All Suppliers')}
                  placeholder={t('All Suppliers')}
                  inputClassName="h-9 text-sm"
                  data-testid="select-filter-payment-history"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
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
                    <TableHead>{t('Supplier')}</TableHead>
                    <TableHead>{t('Source')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Commission USD')}</TableHead>
                    <TableHead>{t('Commission IQD')}</TableHead>
                    <TableHead>{t('Notes')}</TableHead>
                    <TableHead>{t('Created By')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((p, i) => (
                    <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-bold">{p.receiptNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(p.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{p.time || "-"}</TableCell>
                      <TableCell className="font-medium">{p.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.paymentSourceName}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {parseFloat(p.amountUsd) > 0 ? usd(p.amountUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {parseFloat(p.amountIqd) > 0 ? formatIQD(parseFloat(p.amountIqd)) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {parseFloat(p.commissionUsd) > 0 ? usd(p.commissionUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {parseFloat(p.commissionIqd) > 0 ? formatIQD(parseFloat(p.commissionIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.note || "-"}</TableCell>
                      <TableCell className="text-sm font-semibold">{(p as any).createdBy || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => { setReportPaymentId(p.id); setReportCurrency(parseFloat(p.amountUsd || "0") > 0 ? "USD" : "IQD"); setReportOpen(true); }}
                            data-testid={`btn-view-payment-${p.id}`}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => { window.location.href = `/supplier-payments?edit=${p.id}`; }}
                            data-testid={`btn-edit-payment-${p.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeletePayment({ id: p.id })}
                            data-testid={`btn-delete-payment-${p.id}`}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        {t('No payments yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredPayments.length)} {t('of')} {filteredPayments.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-payment-prev-page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={pg === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pg)}
                      data-testid={`button-payment-page-${pg}`}
                    >
                      {pg}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    data-testid="button-payment-next-page"
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

      <SupplierPaymentReport
        paymentId={reportPaymentId}
        open={reportOpen}
        onOpenChange={(open) => { setReportOpen(open); if (!open) setReportPaymentId(null); }}
        currency={reportCurrency}
      />

      <AlertDialog open={!!deletePayment} onOpenChange={(open) => { if (!open) setDeletePayment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete this payment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-payment">
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
