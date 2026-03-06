import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOwnerTransactions, useCreateOwnerTransaction, useUpdateOwnerTransaction, useDeleteOwnerTransaction } from "@/hooks/use-owner-transactions";
import { useOwners } from "@/hooks/use-owners";
import type { OwnerTransaction, Owner } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, ArrowUpFromLine,
  Pencil, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { usd } from "@/lib/format-utils";

export default function OwnerWithdrawalsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allTxns, isLoading: txnsLoading } = useOwnerTransactions();
  const { data: ownersList } = useOwners();
  const { mutate: createTxn, isPending: isSaving } = useCreateOwnerTransaction();
  const { mutate: updateTxn, isPending: isUpdating } = useUpdateOwnerTransaction();
  const { mutate: deleteTxn } = useDeleteOwnerTransaction();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
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
  const [editWithdrawal, setEditWithdrawal] = useState<OwnerTransaction | null>(null);
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editAmountUsd, setEditAmountUsd] = useState("");
  const [editAmountIqd, setEditAmountIqd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const owners: Owner[] = ownersList || [];

  const withdrawals = allTxns?.filter((t: OwnerTransaction) => t.type === "withdrawal") || [];

  const nextInvoiceNumber = useMemo(() => {
    const nums = withdrawals
      .map((w: OwnerTransaction) => {
        const match = w.receiptNumber?.match(/OWD-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `OWD-${String(max + 1).padStart(4, "0")}`;
  }, [withdrawals]);

  useEffect(() => {
    setInvoiceNumber(nextInvoiceNumber);
  }, [nextInvoiceNumber]);

  const resetForm = () => {
    setSelectedOwnerId("");
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
    setInvoiceNumber(nextInvoiceNumber);
  };

  const selectedOwner = owners.find((o: Owner) => o.id.toString() === selectedOwnerId);

  const handleSave = () => {
    if (!selectedOwner) {
      toast({ title: t("Please select an owner"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createTxn({
      ownerId: selectedOwner.id,
      ownerName: selectedOwner.name,
      type: "withdrawal",
      receiptNumber: invoiceNumber,
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      description: description || null,
      reference: reference || null,
      date,
      time,
    }, {
      onSuccess: () => {
        toast({ title: t("Withdrawal saved successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Failed to save withdrawal"), variant: "destructive" });
      },
    });
  };

  const openEdit = (w: OwnerTransaction) => {
    setEditWithdrawal(w);
    setEditOwnerId(String(w.ownerId));
    setEditOwnerName(w.ownerName);
    setEditAmountUsd(w.amountUsd);
    setEditAmountIqd(w.amountIqd);
    setEditDescription(w.description || "");
    setEditReference(w.reference || "");
    setEditDate(w.date);
    setEditTime(w.time || "00:00");
  };

  const handleUpdate = () => {
    if (!editWithdrawal) return;
    if (!editOwnerId) {
      toast({ title: t("Please select an owner"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(editAmountUsd || "0");
    const iqdVal = parseFloat(editAmountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    updateTxn({ id: editWithdrawal.id, data: {
      ownerId: parseInt(editOwnerId),
      ownerName: editOwnerName,
      type: "withdrawal",
      receiptNumber: editWithdrawal.receiptNumber,
      amountUsd: editAmountUsd || "0",
      amountIqd: editAmountIqd || "0",
      description: editDescription || null,
      reference: editReference || null,
      date: editDate,
      time: editTime,
    }}, {
      onSuccess: () => {
        toast({ title: t("Withdrawal updated successfully") });
        setEditWithdrawal(null);
      },
      onError: () => {
        toast({ title: t("Failed to update withdrawal"), variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteTxn(id, {
      onSuccess: () => {
        toast({ title: t("Withdrawal deleted successfully") });
      },
      onError: () => {
        toast({ title: t("Failed to delete withdrawal"), variant: "destructive" });
      },
    });
  };

  const filteredWithdrawals = withdrawals.filter((w: OwnerTransaction) => {
    if (historyFilter && historyFilter !== "all" && String(w.ownerId) !== historyFilter) return false;
    if (historyFromDate && w.date < historyFromDate) return false;
    if (historyToDate && w.date > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredWithdrawals.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedWithdrawals = filteredWithdrawals.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  const totalUsd = withdrawals.reduce((sum: number, t: OwnerTransaction) => sum + parseFloat(t.amountUsd || "0"), 0);
  const totalIqd = withdrawals.reduce((sum: number, t: OwnerTransaction) => sum + parseFloat(t.amountIqd || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ArrowUpFromLine className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            {t('Owner Withdrawals')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record owner withdrawals from the business')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-withdrawal">
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('Total Withdrawals')}</p>
            <p className="font-mono font-bold text-lg text-red-600">{withdrawals.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('Total USD')}</p>
            <p className="font-mono font-bold text-lg text-blue-600" data-testid="text-total-withdrawal-usd">{usd(totalUsd)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('Total IQD')}</p>
            <p className="font-mono font-bold text-lg text-orange-600" data-testid="text-total-withdrawal-iqd">{formatIQD(totalIqd)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Withdrawal Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Invoice Number')}</Label>
                <Input value={invoiceNumber} readOnly className="font-mono bg-muted cursor-not-allowed" data-testid="input-withdrawal-invoice-number" />
              </div>
              <div className="space-y-2">
                <Label>{t('Select Owner')}</Label>
                <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                  <SelectTrigger data-testid="select-withdrawal-owner">
                    <SelectValue placeholder={t('Please select an owner')} />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o: Owner) => (
                      <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-withdrawal-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-withdrawal-time" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    {t('USD Amount')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-withdrawal-usd"
                  />
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-orange-600" />
                    {t('IQD Amount')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number" step="250" min="0" placeholder="0"
                    value={amountIqd} onChange={(e) => setAmountIqd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-withdrawal-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-withdrawal-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-withdrawal-description" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-red-200 dark:border-red-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Withdrawal Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOwner && (
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-medium">{t('Owner Name')}</span>
                  <span className="font-bold">{selectedOwner.name}</span>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-withdrawal-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-withdrawal-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-12 text-base gap-2 bg-red-600 hover:bg-red-700"
                data-testid="button-save-withdrawal"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Withdrawal')}
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
              {t('Withdrawal History')}
              <Badge variant="secondary" className="ml-2">{filteredWithdrawals.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-withdrawal-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-withdrawal-history-to-date" />
              </div>
              <div className="w-48">
                <Select value={historyFilter} onValueChange={(v) => { setHistoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-withdrawal-history" className="h-9">
                    <SelectValue placeholder={t('All Owners')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Owners')}</SelectItem>
                    {owners.map((o: Owner) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead>{t('Owner Name')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWithdrawals.map((w: OwnerTransaction, i: number) => (
                    <TableRow key={w.id} data-testid={`row-withdrawal-${w.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{w.receiptNumber || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{w.ownerName}</TableCell>
                      <TableCell className="font-mono text-sm">{w.date}</TableCell>
                      <TableCell className="font-mono text-sm">{w.time || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(w.amountUsd) > 0 ? usd(w.amountUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(w.amountIqd) > 0 ? formatIQD(parseFloat(w.amountIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{w.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.reference || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => openEdit(w)}
                            data-testid={`button-edit-withdrawal-${w.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-withdrawal-${w.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this withdrawal.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(w.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedWithdrawals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {t('No withdrawals yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredWithdrawals.length)} {t('of')} {filteredWithdrawals.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    data-testid="button-withdrawal-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-withdrawal-page-${page}`}
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
                    data-testid="button-withdrawal-next-page"
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

      <Dialog open={!!editWithdrawal} onOpenChange={(open) => { if (!open) setEditWithdrawal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              {t('Edit Withdrawal')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Invoice Number')}</Label>
              <Input value={editWithdrawal?.receiptNumber || ""} readOnly className="font-mono bg-muted cursor-not-allowed" data-testid="input-edit-withdrawal-invoice-number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Select Owner')}</Label>
                <Select value={editOwnerId} onValueChange={(v) => {
                  setEditOwnerId(v);
                  const o = owners.find(ow => ow.id === parseInt(v));
                  if (o) setEditOwnerName(o.name);
                }}>
                  <SelectTrigger data-testid="select-edit-withdrawal-owner">
                    <SelectValue placeholder={t('Please select an owner')} />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o: Owner) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-withdrawal-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-withdrawal-time" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600">{t('USD Amount')}</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-withdrawal-usd"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-600">{t('IQD Amount')}</Label>
                <Input
                  type="number" step="250" min="0" placeholder="0"
                  value={editAmountIqd} onChange={(e) => setEditAmountIqd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-withdrawal-iqd"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-withdrawal-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea placeholder={t('Description...')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="resize-none" data-testid="input-edit-withdrawal-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWithdrawal(null)}>{t('No')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="bg-orange-600 hover:bg-orange-700" data-testid="button-update-withdrawal">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('Update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
