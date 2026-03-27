import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBankTransactions, useCreateBankTransaction, useUpdateBankTransaction, useDeleteBankTransaction } from "@/hooks/use-bank-transactions";
import { useQuery } from "@tanstack/react-query";
import type { Bank, BankTransaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, ArrowUpFromLine, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { IconDollar, IconDinar } from "@/components/erp-icons";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { usd, formatDate } from "@/lib/format-utils";

export default function BankPaymentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allTxns, isLoading: txnsLoading } = useBankTransactions();
  const { mutate: createTxn, isPending: isSaving } = useCreateBankTransaction();
  const { mutate: updateTxn, isPending: isUpdating } = useUpdateBankTransaction();
  const { mutate: deleteTxn } = useDeleteBankTransaction();

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const [bankId, setBankId] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [showStamp, setShowStamp] = useState(false);
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [editPayment, setEditPayment] = useState<BankTransaction | null>(null);
  const [editBankId, setEditBankId] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editAmountUsd, setEditAmountUsd] = useState("");
  const [editAmountIqd, setEditAmountIqd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const banks = banksList || [];

  const selectBank = useCallback((id: string) => {
    setBankId(id);
    const bank = banks.find(b => b.id === parseInt(id));
    if (bank) setBankName(bank.name);
  }, [banks]);

  const selectedBank = banks.find(b => b.id === parseInt(bankId));

  const resetForm = () => {
    setBankId("");
    setBankName("");
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!bankId) {
      toast({ title: t("Please select a bank"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createTxn({
      bankId: parseInt(bankId),
      bankName,
      type: "payment",
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      description: description || null,
      reference: reference || null,
      date,
      time,
    }, {
      onSuccess: () => {
        toast({ title: t("Payment saved successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Failed to save payment"), variant: "destructive" });
      },
    });
  };

  const openEdit = (p: BankTransaction) => {
    setEditPayment(p);
    setEditBankId(String(p.bankId));
    setEditBankName(p.bankName);
    setEditAmountUsd(p.amountUsd);
    setEditAmountIqd(p.amountIqd);
    setEditDescription(p.description || "");
    setEditReference(p.reference || "");
    setEditDate(p.date);
    setEditTime(p.time || "00:00");
  };

  const handleUpdate = () => {
    if (!editPayment) return;
    if (!editBankId) {
      toast({ title: t("Please select a bank"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(editAmountUsd || "0");
    const iqdVal = parseFloat(editAmountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    updateTxn({ id: editPayment.id, data: {
      bankId: parseInt(editBankId),
      bankName: editBankName,
      type: "payment",
      amountUsd: editAmountUsd || "0",
      amountIqd: editAmountIqd || "0",
      description: editDescription || null,
      reference: editReference || null,
      date: editDate,
      time: editTime,
    }}, {
      onSuccess: () => {
        toast({ title: t("Payment updated successfully") });
        setEditPayment(null);
      },
      onError: () => {
        toast({ title: t("Failed to update payment"), variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteTxn(id, {
      onSuccess: () => {
        toast({ title: t("Payment deleted successfully") });
      },
      onError: () => {
        toast({ title: t("Failed to delete payment"), variant: "destructive" });
      },
    });
  };

  const allPaymentTxns = allTxns?.filter(t => t.type === "payment") || [];
  const nextInvoiceNumber = (() => {
    let maxNum = 0;
    for (const t of allPaymentTxns) {
      const match = (t as any).invoiceNumber?.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `BP-${String(maxNum + 1).padStart(6, '0')}`;
  })();

  const payments = allPaymentTxns;
  const filteredPayments = payments.filter(p => {
    if (historyFilter && historyFilter !== "all" && String(p.bankId) !== historyFilter) return false;
    if (historyFromDate && p.date < historyFromDate) return false;
    if (historyToDate && p.date > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ArrowUpFromLine className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            {t('Bank Payments')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record payments made to banks')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-bank-payment">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Payment Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-bold">{t('Invoice Number')}</Label>
                <Input value={nextInvoiceNumber} disabled className="h-11 text-base font-semibold bg-muted" data-testid="input-bank-payment-invoice-number" />
              </div>
              <div className="space-y-2">
                <Label>{t('Bank')}</Label>
                <SearchSelect items={banks} value={bankId} onValueChange={selectBank} placeholder={t('Select bank...')} data-testid="select-bank-payment-bank" />
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-bank-payment-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-bank-payment-time" />
              </div>
            </div>

            {selectedBank && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Bank')}</p>
                      <p className="font-bold">{selectedBank.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance USD')}</p>
                      <p className="font-mono font-bold text-blue-600">{usd(selectedBank.oldDebtUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance IQD')}</p>
                      <p className="font-mono font-bold text-orange-600">{formatIQD(parseFloat(selectedBank.oldDebtIqd))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    data-testid="input-bank-payment-usd"
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
                    data-testid="input-bank-payment-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-bank-payment-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-bank-payment-description" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-red-200 dark:border-red-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBank && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Bank')}</p>
                  <p className="font-bold text-lg">{selectedBank.name}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-bank-payment-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-bank-payment-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !bankId}
                className="w-full h-12 text-base gap-2 bg-red-600 hover:bg-red-700"
                data-testid="button-save-bank-payment"
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
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-red-600" />
              {t('Payment History')}
              <Badge variant="secondary" className="ml-2">{filteredPayments.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="show-stamp-filter" checked={showStamp} onCheckedChange={(checked) => setShowStamp(!!checked)} data-testid="switch-show-stamp" />
                <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-bank-payment-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-bank-payment-history-to-date" />
              </div>
              <div className="w-48">
                <SearchSelect items={banks} value={historyFilter === "all" ? "" : historyFilter} onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }} placeholder={t('All Banks')} showAllOption allOptionLabel={t('All Banks')} data-testid="select-filter-bank-payment-history" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {txnsLoading ? (
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
                    <TableHead>{t('Bank')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((p, i) => (
                    <TableRow key={p.id} data-testid={`row-bank-payment-${p.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{(p as any).invoiceNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(p.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{p.time || "-"}</TableCell>
                      <TableCell className="font-medium">{p.bankName}</TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(p.amountUsd) > 0 ? usd(p.amountUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(p.amountIqd) > 0 ? formatIQD(parseFloat(p.amountIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.reference || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => openEdit(p)}
                            data-testid={`button-edit-bank-payment-${p.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-bank-payment-${p.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this payment.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                    data-testid="button-bank-payment-prev-page"
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
                      data-testid={`button-bank-payment-page-${pg}`}
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
                    data-testid="button-bank-payment-next-page"
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

      <Dialog open={!!editPayment} onOpenChange={(open) => { if (!open) setEditPayment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              {t('Edit Payment')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-bold">{t('Invoice Number')}</Label>
              <Input value={(editPayment as any)?.invoiceNumber || "-"} disabled className="h-11 text-base font-semibold bg-muted" data-testid="input-edit-bank-payment-invoice-number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Bank')}</Label>
                <SearchSelect items={banks} value={editBankId} onValueChange={(v) => {
                  setEditBankId(v);
                  const bank = banks.find(b => b.id === parseInt(v));
                  if (bank) setEditBankName(bank.name);
                }} placeholder={t('Select bank...')} data-testid="select-edit-bank-payment-bank" />
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-bank-payment-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-bank-payment-time" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600">{t('USD Amount')}</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-bank-payment-usd"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-600">{t('IQD Amount')}</Label>
                <Input
                  type="number" step="250" min="0" placeholder="0"
                  value={editAmountIqd} onChange={(e) => setEditAmountIqd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-bank-payment-iqd"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-bank-payment-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea placeholder={t('Description...')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="resize-none" data-testid="input-edit-bank-payment-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>{t('Cancel')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="gap-2 bg-red-600 hover:bg-red-700 text-white" data-testid="button-update-bank-payment">
              {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
