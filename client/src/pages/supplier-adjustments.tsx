import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useSupplierAdjustments, useCreateSupplierAdjustment } from "@/hooks/use-supplier-adjustments";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, SupplierAdjustment, Bank, TransferOffice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
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
import {
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, ArrowDownToLine, Percent, HandCoins, Landmark, Building, ArrowLeft,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { usd, formatDate } from "@/lib/format-utils";
import { playDeleteSound } from "@/lib/sounds";
import { broadcastDataUpdate } from "@/lib/broadcast";
import SupplierAdjustmentReport from "@/components/supplier-adjustment-report";
import { SupplierSearchSelect } from "@/components/supplier-search-select";

export default function SupplierAdjustmentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: adjustments, isLoading: adjustmentsLoading } = useSupplierAdjustments();
  const { mutate: createAdjustment, isPending: isSaving } = useCreateSupplierAdjustment();

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
  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<string>("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [note, setNote] = useState("");
  const [payTo, setPayTo] = useState<string>("");
  const [payToName, setPayToName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [isEditMode, setIsEditMode] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchNumber, setSearchNumber] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [reportAdjustmentId, setReportAdjustmentId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteAdjustment, setDeleteAdjustment] = useState<{ id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const editId = new URLSearchParams(window.location.search).get("edit");

  const fetchNextReceiptNumber = useCallback(() => {
    fetch("/api/supplier-adjustments/next-receipt-number", { credentials: "include" })
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
      fetch(`/api/supplier-adjustments/${editId}`, { credentials: "include" })
        .then(res => res.json())
        .then((data: any) => {
          setSupplierId(String(data.supplierId));
          setSupplierName(data.supplierName || "");
          setAdjustmentType(data.type || "");
          setAmountUsd(data.amountUsd || "");
          setAmountIqd(data.amountIqd || "");
          setReceiptNumber(data.receiptNumber || "");
          setNote(data.note || "");
          setDate(data.date || new Date().toISOString().split('T')[0]);
          setTime(data.time || new Date().toTimeString().slice(0, 5));
          setPayTo(data.payTo || "");
          setPayToName(data.payToName || "");
          setIsEditMode(true);
        });
    }
  }, [editId]);

  const selectSupplier = useCallback((id: string) => {
    setSupplierId(id);
    const supplier = suppliers?.find(s => s.id === parseInt(id));
    if (supplier) {
      setSupplierName(supplier.name);
    }
  }, [suppliers]);

  const selectPayTo = useCallback((val: string) => {
    setPayTo(val);
    if (val === "byhand:0") {
      setPayToName(t("By Hand"));
    } else {
      const [type, id] = val.split(":");
      if (type === "bank") {
        const bank = banksList?.find(b => b.id === parseInt(id));
        if (bank) setPayToName(`${t("Bank")} - ${bank.name}`);
      } else {
        const office = transferOfficesList?.find(o => o.id === parseInt(id));
        if (office) setPayToName(`${t("Transfer Office")} - ${office.name}`);
      }
    }
  }, [banksList, transferOfficesList, t]);

  const selectedSupplier = suppliers?.find(s => s.id === parseInt(supplierId));

  const handleDeleteAdjustment = async () => {
    if (!deleteAdjustment) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/supplier-adjustments/${deleteAdjustment.id}`);
      playDeleteSound();
      toast({ title: t("Adjustment deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-adjustments"] });
      broadcastDataUpdate("supplier-statement");
      setDeleteAdjustment(null);
    } catch (err: any) {
      toast({ title: t("Failed to delete adjustment"), description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setSupplierId("");
    setSupplierName("");
    setAdjustmentType("");
    setAmountUsd("");
    setAmountIqd("");
    setReceiptNumber("");
    setNote("");
    setPayTo("");
    setPayToName("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!supplierId || !adjustmentType) {
      toast({ title: t("Please select supplier and type"), variant: "destructive" });
      return;
    }
    const usd = parseFloat(amountUsd) || 0;
    const iqd = parseFloat(amountIqd) || 0;
    if (usd <= 0 && iqd <= 0) {
      toast({ title: t("Enter at least one amount"), variant: "destructive" });
      return;
    }

    const payload = {
      supplierId: parseInt(supplierId),
      supplierName,
      type: adjustmentType,
      amountUsd: String(usd),
      amountIqd: String(iqd),
      receiptNumber: receiptNumber || undefined,
      payTo: payTo || undefined,
      payToName: payToName || undefined,
      note: note || undefined,
      date,
      time,
    };

    if (isEditMode && editId) {
      apiRequest("PATCH", `/api/supplier-adjustments/${editId}`, payload)
        .then(() => {
          toast({ title: t("Adjustment saved successfully") });
          queryClient.invalidateQueries({ queryKey: ["/api/supplier-adjustments"] });
          broadcastDataUpdate("supplier-statement");
          resetForm();
          setIsEditMode(false);
          fetchNextReceiptNumber();
          navigate("/supplier-adjustments");
        })
        .catch((err: any) => {
          toast({ title: err.message || t("Failed to save"), variant: "destructive" });
        });
    } else {
      createAdjustment(payload, {
        onSuccess: () => {
          toast({ title: t("Adjustment saved successfully") });
          broadcastDataUpdate("supplier-statement");
          resetForm();
          fetchNextReceiptNumber();
        },
        onError: (err: any) => {
          toast({ title: err.message || t("Failed to save"), variant: "destructive" });
        },
      });
    }
  };

  const supplierAdjustments = adjustments as SupplierAdjustment[] | undefined;
  const filteredHistory = supplierAdjustments?.filter(
    a => supplierId ? a.supplierId === parseInt(supplierId) : true
  ) || [];

  const filteredAdjustments = (supplierAdjustments || []).filter(adj => {
    if (historyFilter && historyFilter !== "all" && String(adj.supplierId) !== historyFilter) return false;
    const adjDate = typeof adj.date === 'string' ? adj.date.split('T')[0] : new Date(adj.date).toISOString().split('T')[0];
    if (historyFromDate && adjDate < historyFromDate) return false;
    if (historyToDate && adjDate > historyToDate) return false;
    if (searchNumber && !(adj.receiptNumber || "").toLowerCase().includes(searchNumber.toLowerCase())) return false;
    if (typeFilter && typeFilter !== "all" && adj.type !== typeFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredAdjustments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAdjustments = filteredAdjustments.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-8">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-4 w-4" />
          {t("Supplier Management")}
        </Button>
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            {isEditMode ? t("Edit Adjustment") : t("Supplier Adjustments")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("Record received amounts or discounts from suppliers")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              {t("New Adjustment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-bold">{t('Invoice Number')}</Label>
                <Input
                  value={receiptNumber}
                  readOnly
                  className="h-11 text-base font-semibold bg-muted cursor-not-allowed"
                  data-testid="input-adj-receipt-number"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("Supplier")}</Label>
                <SupplierSearchSelect
                  suppliers={suppliers || []}
                  value={supplierId}
                  onValueChange={selectSupplier}
                  placeholder={t("Select supplier...")}
                  data-testid="select-supplier"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Adjustment Type")}</Label>
                <Select value={adjustmentType} onValueChange={(val) => {
                    setAdjustmentType(val);
                    if (val === "discount") {
                      setPayTo("");
                      setPayToName("");
                    }
                  }}>
                  <SelectTrigger data-testid="select-adjustment-type">
                    <SelectValue placeholder={t("Select type...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">
                      <span className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-green-600" />
                        {t("Received from Supplier")}
                      </span>
                    </SelectItem>
                    <SelectItem value="discount">
                      <span className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-purple-600" />
                        {t("Discount from Supplier")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adjustmentType !== "discount" && (
                <div className="space-y-2">
                  <Label>{t('Payment Source')}</Label>
                  <Select value={payTo} onValueChange={selectPayTo}>
                    <SelectTrigger data-testid="select-pay-to">
                      <SelectValue placeholder={t('Select bank or transfer office...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <HandCoins className="h-3 w-3" /> {t('By Hand')}
                      </div>
                      <SelectItem value="byhand:0">{t('By Hand')}</SelectItem>

                      {banks.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Landmark className="h-3 w-3" /> {t('Banks')}
                          </div>
                          {banks.map(b => (
                            <SelectItem key={`bank:${b.id}`} value={`bank:${b.id}`}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {transferOffices.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Building className="h-3 w-3" /> {t('Transfer Offices')}
                          </div>
                          {transferOffices.map(o => (
                            <SelectItem key={`transfer_office:${o.id}`} value={`transfer_office:${o.id}`}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Date")}</Label>
                <DateInput
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Time")}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  data-testid="input-time"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
                    <DollarSign className="h-5 w-5" />
                    {t("Amount")} (USD)
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountUsd}
                    onChange={e => setAmountUsd(e.target.value)}
                    className="text-lg font-bold border-blue-300 dark:border-blue-700"
                    data-testid="input-amount-usd"
                  />
                </CardContent>
              </Card>

              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-semibold">
                    <Banknote className="h-5 w-5" />
                    {t("Amount")} (IQD)
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={amountIqd}
                    onChange={e => setAmountIqd(e.target.value)}
                    className="text-lg font-bold border-orange-300 dark:border-orange-700"
                    data-testid="input-amount-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("Note")}</Label>
              <Textarea
                placeholder={t("Add note...")}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                data-testid="input-note"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
                data-testid="button-save"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("Save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedSupplier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Supplier Info")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("Name")}</p>
                  <p className="font-semibold text-lg">{selectedSupplier.name}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Opening Balance USD")}</p>
                    <p className="text-xl font-bold text-red-600">
                      {usd(selectedSupplier.oldDebtUsd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Opening Balance IQD")}</p>
                    <p className="text-xl font-bold text-red-600">
                      {parseFloat(selectedSupplier.oldDebtIqd).toLocaleString()} IQD
                    </p>
                  </div>
                </div>
                {(parseFloat(amountUsd || "0") > 0 || parseFloat(amountIqd || "0") > 0) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("Remaining USD")}</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {usd(parseFloat(selectedSupplier.oldDebtUsd || "0") - parseFloat(amountUsd || "0"))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("Remaining IQD")}</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {(parseFloat(selectedSupplier.oldDebtIqd || "0") - parseFloat(amountIqd || "0")).toLocaleString()} IQD
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {supplierId && filteredHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Recent Adjustments")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredHistory.slice(0, 5).map(adj => (
                    <div key={adj.id} className="border rounded-lg p-3 space-y-1" data-testid={`card-recent-adj-${adj.id}`}>
                      <div className="flex items-center justify-between">
                        <Badge variant={adj.type === "received" ? "default" : "secondary"} className="text-xs">
                          {adj.type === "received" ? t("Received from Supplier") : t("Discount from Supplier")}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">{formatDate(adj.date)}</span>
                      </div>
                      {parseFloat(adj.amountUsd) > 0 && (
                        <p className="text-sm text-blue-600 font-medium">{usd(adj.amountUsd)}</p>
                      )}
                      {parseFloat(adj.amountIqd) > 0 && (
                        <p className="text-sm text-orange-600 font-medium">{parseFloat(adj.amountIqd).toLocaleString()} IQD</p>
                      )}
                    </div>
                  ))}
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
              {t('Adjustment History')}
              <Badge variant="secondary" className="ml-2">{filteredAdjustments.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => { setSearchNumber(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-search-adj-number" />
              </div>
              <div className="w-44">
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-adj-type" className="h-9">
                    <SelectValue placeholder={t('All Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Types')}</SelectItem>
                    <SelectItem value="received">{t('Received from Supplier')}</SelectItem>
                    <SelectItem value="discount">{t('Discount from Supplier')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-adj-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-adj-history-to-date" />
              </div>
              <div className="w-48">
                <Select value={historyFilter} onValueChange={(v) => { setHistoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-adj-history" className="h-9">
                    <SelectValue placeholder={t('All Suppliers')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Suppliers')}</SelectItem>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {adjustmentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Invoice Number')}</TableHead>
                    <TableHead>{t('Supplier')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Amount USD')}</TableHead>
                    <TableHead>{t('Amount IQD')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Note')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAdjustments.map((adj, i) => (
                    <TableRow key={adj.id} data-testid={`row-adjustment-${adj.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-bold">{adj.receiptNumber || "-"}</TableCell>
                      <TableCell className="font-medium">{adj.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant={adj.type === "received" ? "default" : "secondary"}>
                          {adj.type === "received" ? t("Received from Supplier") : t("Discount from Supplier")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-blue-600 font-bold">{usd(adj.amountUsd)}</TableCell>
                      <TableCell className="font-mono text-sm text-orange-600 font-bold">{parseFloat(adj.amountIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm">{formatDate(adj.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{adj.time}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{adj.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => { setReportAdjustmentId(adj.id); setReportOpen(true); }}
                            data-testid={`btn-view-adjustment-${adj.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => { window.location.href = `/supplier-adjustments?edit=${adj.id}`; }}
                            data-testid={`btn-edit-adjustment-${adj.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteAdjustment({ id: adj.id })}
                            data-testid={`btn-delete-adjustment-${adj.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedAdjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No adjustments recorded yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredAdjustments.length)} {t('of')} {filteredAdjustments.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-adj-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={pg === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pg)}
                      data-testid={`button-adj-page-${pg}`}
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
                    data-testid="button-adj-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <SupplierAdjustmentReport
        adjustmentId={reportAdjustmentId}
        open={reportOpen}
        onOpenChange={(open) => { setReportOpen(open); if (!open) setReportAdjustmentId(null); }}
        currency="USD"
      />

      <AlertDialog open={!!deleteAdjustment} onOpenChange={(open) => { if (!open) setDeleteAdjustment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete this adjustment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdjustment} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-adjustment">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
