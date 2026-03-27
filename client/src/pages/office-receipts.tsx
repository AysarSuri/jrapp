import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOfficeTransactions, useCreateOfficeTransaction, useUpdateOfficeTransaction, useDeleteOfficeTransaction } from "@/hooks/use-office-transactions";
import { useQuery } from "@tanstack/react-query";
import type { TransferOffice, TransferOfficeTransaction } from "@shared/schema";
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
import { Save, Loader2, RotateCcw, ListOrdered, ArrowDownToLine, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function OfficeReceiptsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allTxns, isLoading: txnsLoading } = useOfficeTransactions();
  const { mutate: createTxn, isPending: isSaving } = useCreateOfficeTransaction();
  const { mutate: updateTxn, isPending: isUpdating } = useUpdateOfficeTransaction();
  const { mutate: deleteTxn } = useDeleteOfficeTransaction();

  const { data: officesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const [officeId, setOfficeId] = useState<string>("");
  const [officeName, setOfficeName] = useState("");
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
  const [editReceipt, setEditReceipt] = useState<TransferOfficeTransaction | null>(null);
  const [editOfficeId, setEditOfficeId] = useState("");
  const [editOfficeName, setEditOfficeName] = useState("");
  const [editAmountUsd, setEditAmountUsd] = useState("");
  const [editAmountIqd, setEditAmountIqd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const offices = officesList || [];

  const selectOffice = useCallback((id: string) => {
    setOfficeId(id);
    const office = offices.find(b => b.id === parseInt(id));
    if (office) setOfficeName(office.name);
  }, [offices]);

  const selectedOffice = offices.find(b => b.id === parseInt(officeId));

  const resetForm = () => {
    setOfficeId("");
    setOfficeName("");
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!officeId) {
      toast({ title: t("Please select an office"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createTxn({
      officeId: parseInt(officeId),
      officeName,
      type: "receipt",
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      description: description || null,
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

  const openEdit = (r: TransferOfficeTransaction) => {
    setEditReceipt(r);
    setEditOfficeId(String(r.officeId));
    setEditOfficeName(r.officeName);
    setEditAmountUsd(r.amountUsd);
    setEditAmountIqd(r.amountIqd);
    setEditDescription(r.description || "");
    setEditReference(r.reference || "");
    setEditDate(r.date);
    setEditTime(r.time || "00:00");
  };

  const handleUpdate = () => {
    if (!editReceipt) return;
    if (!editOfficeId) {
      toast({ title: t("Please select an office"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(editAmountUsd || "0");
    const iqdVal = parseFloat(editAmountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    updateTxn({ id: editReceipt.id, data: {
      officeId: parseInt(editOfficeId),
      officeName: editOfficeName,
      type: "receipt",
      amountUsd: editAmountUsd || "0",
      amountIqd: editAmountIqd || "0",
      description: editDescription || null,
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
    deleteTxn(id, {
      onSuccess: () => {
        toast({ title: t("Receipt deleted successfully") });
      },
      onError: () => {
        toast({ title: t("Failed to delete receipt"), variant: "destructive" });
      },
    });
  };

  const receipts = allTxns?.filter(t => t.type === "receipt") || [];

  const nextInvoiceNumber = (() => {
    let maxNum = 0;
    for (const r of receipts) {
      const match = (r as any).invoiceNumber?.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `OR-${String(maxNum + 1).padStart(6, '0')}`;
  })();

  const filteredReceipts = receipts.filter(r => {
    if (historyFilter && historyFilter !== "all" && String(r.officeId) !== historyFilter) return false;
    if (historyFromDate && r.date < historyFromDate) return false;
    if (historyToDate && r.date > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReceipts = filteredReceipts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ArrowDownToLine className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            {t('Office Receipts')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record amounts received from transfer offices')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-office-receipt">
            <RotateCcw className="h-5 w-5" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t('Invoice Number')}</Label>
                <Input value={nextInvoiceNumber} readOnly disabled className="font-mono bg-muted/50 cursor-not-allowed" data-testid="input-office-receipt-invoice-number" />
              </div>
              <div className="space-y-2">
                <Label>{t('Transfer Office')}</Label>
                <SearchSelect items={offices} value={officeId} onValueChange={selectOffice} placeholder={t('Select office...')} data-testid="select-office-receipt-office" />
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-office-receipt-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-office-receipt-time" />
              </div>
            </div>

            {selectedOffice && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Transfer Office')}</p>
                      <p className="font-bold">{selectedOffice.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance USD')}</p>
                      <p className="font-mono font-bold text-blue-600">{usd(selectedOffice.oldDebtUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance IQD')}</p>
                      <p className="font-mono font-bold text-orange-600">{formatIQD(parseFloat(selectedOffice.oldDebtIqd))}</p>
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
                    data-testid="input-office-receipt-usd"
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
                    data-testid="input-office-receipt-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-office-receipt-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-office-receipt-description" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-green-200 dark:border-green-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Receipt Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOffice && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Transfer Office')}</p>
                    <p className="font-bold text-lg">{selectedOffice.name}</p>
                  </div>
                </>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-office-receipt-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-office-receipt-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !officeId}
                className="w-full h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
                data-testid="button-save-office-receipt"
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
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-green-600" />
              {t('Receipt History')}
              <Badge variant="secondary" className="ml-2">{filteredReceipts.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="show-stamp-filter" checked={showStamp} onCheckedChange={(checked) => setShowStamp(!!checked)} data-testid="switch-show-stamp" />
                <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-office-receipt-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-office-receipt-history-to-date" />
              </div>
              <div className="w-48">
                <SearchSelect items={offices} value={historyFilter === "all" ? "" : historyFilter} onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }} placeholder={t('All Offices')} showAllOption allOptionLabel={t('All Offices')} data-testid="select-filter-office-receipt-history" />
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
                    <TableHead>{t('Transfer Office')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReceipts.map((r, i) => (
                    <TableRow key={r.id} data-testid={`row-office-receipt-${r.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{(r as any).invoiceNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(r.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{r.time || "-"}</TableCell>
                      <TableCell className="font-medium">{r.officeName}</TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {parseFloat(r.amountUsd) > 0 ? usd(r.amountUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {parseFloat(r.amountIqd) > 0 ? formatIQD(parseFloat(r.amountIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.reference || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => openEdit(r)}
                            data-testid={`button-edit-office-receipt-${r.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-office-receipt-${r.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
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
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-office-receipt-prev-page"
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
                      data-testid={`button-office-receipt-page-${pg}`}
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
                    data-testid="button-office-receipt-next-page"
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

      <Dialog open={!!editReceipt} onOpenChange={(open) => { if (!open) setEditReceipt(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              {t('Edit Receipt')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Invoice Number')}</Label>
              <Input value={(editReceipt as any)?.invoiceNumber || "-"} readOnly disabled className="font-mono bg-muted/50 cursor-not-allowed" data-testid="input-edit-office-receipt-invoice-number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Transfer Office')}</Label>
                <SearchSelect items={offices} value={editOfficeId} onValueChange={(v) => {
                  setEditOfficeId(v);
                  const office = offices.find(b => b.id === parseInt(v));
                  if (office) setEditOfficeName(office.name);
                }} placeholder={t('Select office...')} data-testid="select-edit-office-receipt-office" />
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-office-receipt-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-office-receipt-time" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600">{t('USD Amount')}</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-office-receipt-usd"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-600">{t('IQD Amount')}</Label>
                <Input
                  type="number" step="250" min="0" placeholder="0"
                  value={editAmountIqd} onChange={(e) => setEditAmountIqd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-office-receipt-iqd"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-office-receipt-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea placeholder={t('Description...')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="resize-none" data-testid="input-edit-office-receipt-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReceipt(null)}>{t('Cancel')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="gap-2 bg-green-600 hover:bg-green-700 text-white" data-testid="button-update-office-receipt">
              {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
