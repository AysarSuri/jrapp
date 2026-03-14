import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCustomerReceipts, useCreateCustomerReceipt, useUpdateCustomerReceipt, useDeleteCustomerReceipt } from "@/hooks/use-customer-receipts";
import { useQuery } from "@tanstack/react-query";
import type { Client, Bank, TransferOffice, CustomerReceipt } from "@shared/schema";
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
import {
  Save, Loader2, Banknote, RotateCcw, ListOrdered, Building, Landmark, Percent,
  Pencil, Trash2, ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format-utils";

export default function CustomerReceiptIqdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
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

  const [receiptNumber, setReceiptNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
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
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPaymentSource, setEditPaymentSource] = useState("");
  const [editPaymentSourceName, setEditPaymentSourceName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

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

  const resetForm = () => {
    setReceiptNumber("");
    setCustomerId("");
    setCustomerName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setAmount("");
    setDiscount("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
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

    createReceipt({
      receiptNumber,
      customerId: parseInt(customerId),
      customerName,
      paymentSource: paymentSource.split(":")[0],
      paymentSourceName,
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
  };

  const openEdit = (r: CustomerReceipt) => {
    setEditReceipt(r);
    setEditCustomerId(String(r.customerId));
    setEditCustomerName(r.customerName);
    setEditPaymentSource(r.paymentSource);
    setEditPaymentSourceName(r.paymentSourceName);
    setEditAmount(r.amount);
    setEditDiscount(r.discount);
    setEditNote(r.note || "");
    setEditReference(r.reference || "");
    setEditDate(r.date);
    setEditTime(r.time || "00:00");
  };

  const handleUpdate = () => {
    if (!editReceipt) return;
    if (!editCustomerId) {
      toast({ title: t("Please select a customer"), variant: "destructive" });
      return;
    }
    if (!editPaymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const amountVal = parseFloat(editAmount || "0");
    const discountVal = parseFloat(editDiscount || "0");
    if (amountVal <= 0 && discountVal <= 0) {
      toast({ title: t("Please enter an amount or discount"), variant: "destructive" });
      return;
    }

    updateReceipt({ id: editReceipt.id, data: {
      customerId: parseInt(editCustomerId),
      customerName: editCustomerName,
      paymentSource: editPaymentSource.split(":")[0],
      paymentSourceName: editPaymentSourceName,
      amount: editAmount || "0",
      discount: editDiscount || "0",
      currency: "IQD",
      note: editNote || null,
      reference: editReference || null,
      date: editDate,
      time: editTime,
    }}, {
      onSuccess: () => {
        toast({ title: t("Receipt updated successfully") });
        setEditReceipt(null);
      },
      onError: () => {
        toast({ title: t("Failed to update receipt"), variant: "destructive" });
      },
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Banknote className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            {t('Customer Receipt IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Receive payments from customers in IQD')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-receipt">
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Receipt Details')}</CardTitle>
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

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-orange-600" />
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
                    <Percent className="h-4 w-4 text-green-600" />
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
                disabled={isSaving || !customerId || !paymentSource}
                className="w-full h-12 text-base gap-2 bg-orange-600 hover:bg-orange-700"
                data-testid="button-save-receipt"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Receipt')}
              </Button>
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{t('Current Debt IQD')}</p>
                  <p className="font-mono text-2xl font-bold text-red-600">
                    {formatIQD(parseFloat(selectedCustomer.oldDebtIqd))}
                  </p>
                  {totalDeducted > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">{t('After Receipt')}</p>
                      <p className="font-mono text-xl font-bold text-emerald-600">
                        {formatIQD(parseFloat(selectedCustomer.oldDebtIqd) - totalDeducted)}
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
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
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
                    <TableHead>{t('Opening Balance')}</TableHead>
                    <TableHead>{t('Remaining')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
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
                      <TableCell className="font-mono text-sm text-red-600">
                        {formatIQD(parseFloat(r.oldDebt))}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-emerald-600">
                        {formatIQD(parseFloat(r.remaining))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.reference || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(r)}
                            data-testid={`button-edit-receipt-${r.id}`}
                          >
                            <Pencil className="h-4 w-4 text-orange-600" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-receipt-${r.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
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
                    <ChevronLeft className="h-4 w-4" />
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
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editReceipt} onOpenChange={(open) => { if (!open) setEditReceipt(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Edit Receipt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Customer Name')}</Label>
              <CustomerSearchSelect
                customers={customers || []}
                value={editCustomerId}
                onValueChange={(id) => {
                  setEditCustomerId(id);
                  const customer = customers?.find(c => c.id === parseInt(id));
                  if (customer) setEditCustomerName(customer.name);
                }}
                placeholder={t('Select customer...')}
                data-testid="select-edit-receipt-customer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-receipt-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-receipt-time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Payment Source')}</Label>
              <SearchSelect
                items={[
                  ...banks.map(b => ({ id: `bank:${b.id}`, name: b.name })),
                  ...transferOffices.map(o => ({ id: `transfer_office:${o.id}`, name: o.name })),
                ]}
                value={editPaymentSource}
                onValueChange={(v) => {
                  if (!v) { setEditPaymentSource(""); setEditPaymentSourceName(""); return; }
                  setEditPaymentSource(v);
                  const [type, id] = v.split(":");
                  if (type === "bank") {
                    const bank = banksList?.find(b => b.id === parseInt(id));
                    if (bank) setEditPaymentSourceName(`${t("Bank")} - ${bank.name}`);
                  } else {
                    const office = transferOfficesList?.find(o => o.id === parseInt(id));
                    if (office) setEditPaymentSourceName(`${t("Transfer Office")} - ${office.name}`);
                  }
                }}
                placeholder={t('Select payment source...')}
                data-testid="select-edit-receipt-source"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Amount')} (IQD)</Label>
                <Input type="number" step="250" min="0" placeholder="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} data-testid="input-edit-receipt-amount" />
              </div>
              <div className="space-y-2">
                <Label>{t('Discount')} (IQD)</Label>
                <Input type="number" step="250" min="0" placeholder="0" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} data-testid="input-edit-receipt-discount" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-receipt-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea placeholder={t('Notes...')} value={editNote} onChange={(e) => setEditNote(e.target.value)} className="resize-none" data-testid="input-edit-receipt-note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReceipt(null)} data-testid="button-cancel-edit-receipt">{t('Cancel')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white" data-testid="button-save-edit-receipt">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
