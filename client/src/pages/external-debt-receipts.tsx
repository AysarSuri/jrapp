import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useExternalDebtTransactions, useCreateExternalDebtTransaction, useUpdateExternalDebtTransaction, useDeleteExternalDebtTransaction } from "@/hooks/use-external-debt-transactions";
import { useQuery } from "@tanstack/react-query";
import type { ExternalDebt, ExternalDebtTransaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, ArrowDownToLine,
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

export default function ExternalDebtReceiptsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allTxns, isLoading: txnsLoading } = useExternalDebtTransactions();
  const { mutate: createTxn, isPending: isSaving } = useCreateExternalDebtTransaction();
  const { mutate: updateTxn, isPending: isUpdating } = useUpdateExternalDebtTransaction();
  const { mutate: deleteTxn } = useDeleteExternalDebtTransaction();

  const { data: debtsList } = useQuery<ExternalDebt[]>({
    queryKey: ["/api/external-debts"],
  });

  const [debtId, setDebtId] = useState<string>("");
  const [debtName, setDebtName] = useState("");
  const [debtSearch, setDebtSearch] = useState("");
  const [showDebtSuggestions, setShowDebtSuggestions] = useState(false);
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFilterSearch, setHistoryFilterSearch] = useState("");
  const [showHistoryFilterSuggestions, setShowHistoryFilterSuggestions] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [editReceipt, setEditReceipt] = useState<ExternalDebtTransaction | null>(null);
  const [editDebtId, setEditDebtId] = useState("");
  const [editDebtName, setEditDebtName] = useState("");
  const [editDebtSearch, setEditDebtSearch] = useState("");
  const [showEditDebtSuggestions, setShowEditDebtSuggestions] = useState(false);
  const [editAmountUsd, setEditAmountUsd] = useState("");
  const [editAmountIqd, setEditAmountIqd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const debts = debtsList || [];

  const debtSuggestions = useMemo(() => {
    if (!debtSearch.trim() || !debts.length) return debts.slice(0, 8);
    const q = debtSearch.toLowerCase();
    return debts.filter((d: ExternalDebt) => d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [debtSearch, debts]);

  const editDebtSuggestions = useMemo(() => {
    if (!editDebtSearch.trim() || !debts.length) return debts.slice(0, 8);
    const q = editDebtSearch.toLowerCase();
    return debts.filter((d: ExternalDebt) => d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [editDebtSearch, debts]);

  const historyFilterSuggestions = useMemo(() => {
    if (!historyFilterSearch.trim() || !debts.length) return debts.slice(0, 8);
    const q = historyFilterSearch.toLowerCase();
    return debts.filter((d: ExternalDebt) => d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [historyFilterSearch, debts]);

  const selectDebt = useCallback((id: string) => {
    setDebtId(id);
    const debt = debts.find(b => b.id === parseInt(id));
    if (debt) {
      setDebtName(debt.name);
      setDebtSearch(debt.name);
    }
    setShowDebtSuggestions(false);
  }, [debts]);

  const selectedDebt = debts.find(b => b.id === parseInt(debtId));

  const resetForm = () => {
    setDebtId("");
    setDebtName("");
    setDebtSearch("");
    setShowDebtSuggestions(false);
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!debtId) {
      toast({ title: t("Please select an external debt"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createTxn({
      debtId: parseInt(debtId),
      debtName,
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

  const openEdit = (r: ExternalDebtTransaction) => {
    setEditReceipt(r);
    setEditDebtId(String(r.debtId));
    setEditDebtName(r.debtName);
    setEditDebtSearch(r.debtName);
    setEditAmountUsd(r.amountUsd);
    setEditAmountIqd(r.amountIqd);
    setEditDescription(r.description || "");
    setEditReference(r.reference || "");
    setEditDate(r.date);
    setEditTime(r.time || "00:00");
  };

  const handleUpdate = () => {
    if (!editReceipt) return;
    if (!editDebtId) {
      toast({ title: t("Please select an external debt"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(editAmountUsd || "0");
    const iqdVal = parseFloat(editAmountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    updateTxn({ id: editReceipt.id, data: {
      debtId: parseInt(editDebtId),
      debtName: editDebtName,
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
  const filteredReceipts = receipts.filter(r => {
    if (historyFilter && historyFilter !== "all" && String(r.debtId) !== historyFilter) return false;
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
            {t('External Debt Receipts')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record amounts received for external debts')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-external-debt-receipt">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 relative">
                <Label>{t('External Debt')}</Label>
                <div className="relative">
                  <Input
                    value={debtSearch}
                    onChange={(e) => {
                      setDebtSearch(e.target.value);
                      setShowDebtSuggestions(true);
                      if (!e.target.value.trim()) { setDebtId(""); setDebtName(""); }
                    }}
                    onFocus={() => setShowDebtSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDebtSuggestions(false), 200)}
                    placeholder={t('Select external debt...')}
                    data-testid="select-receipt-external-debt"
                    autoComplete="off"
                  />
                  {showDebtSuggestions && debtSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {debtSuggestions.map((item: ExternalDebt) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); selectDebt(String(item.id)); }}
                          data-testid={`suggestion-receipt-debt-${item.id}`}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : ""}
                            {parseFloat(item.oldDebtUsd) > 0 && parseFloat(item.oldDebtIqd) > 0 ? " | " : ""}
                            {parseFloat(item.oldDebtIqd) > 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-receipt-external-debt-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-receipt-external-debt-time" />
              </div>
            </div>

            {selectedDebt && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('External Debt')}</p>
                      <p className="font-bold">{selectedDebt.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance USD')}</p>
                      <p className="font-mono font-bold text-blue-600">{usd(selectedDebt.oldDebtUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance IQD')}</p>
                      <p className="font-mono font-bold text-orange-600">{formatIQD(parseFloat(selectedDebt.oldDebtIqd))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    data-testid="input-receipt-external-debt-usd"
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
                    data-testid="input-receipt-external-debt-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-receipt-external-debt-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-receipt-external-debt-description" />
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
              {selectedDebt && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('External Debt')}</p>
                    <p className="font-bold text-lg">{selectedDebt.name}</p>
                  </div>
                </>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-external-debt-receipt-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-external-debt-receipt-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !debtId}
                className="w-full h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
                data-testid="button-save-external-debt-receipt"
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
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-ext-debt-receipt-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-ext-debt-receipt-history-to-date" />
              </div>
              <div className="w-48 relative">
                <Input
                  value={historyFilterSearch}
                  onChange={(e) => {
                    setHistoryFilterSearch(e.target.value);
                    setShowHistoryFilterSuggestions(true);
                    if (!e.target.value.trim()) { setHistoryFilter(""); setCurrentPage(1); }
                  }}
                  onFocus={() => setShowHistoryFilterSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowHistoryFilterSuggestions(false), 200)}
                  placeholder={t('All External Debts')}
                  className="h-9"
                  data-testid="select-filter-ext-debt-receipt-history"
                  autoComplete="off"
                />
                {showHistoryFilterSuggestions && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/80 text-sm font-medium transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setHistoryFilter("");
                        setHistoryFilterSearch("");
                        setShowHistoryFilterSuggestions(false);
                        setCurrentPage(1);
                      }}
                      data-testid="suggestion-filter-debt-all"
                    >
                      {t('All External Debts')}
                    </button>
                    {historyFilterSuggestions.map((item: ExternalDebt) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setHistoryFilter(String(item.id));
                          setHistoryFilterSearch(item.name);
                          setShowHistoryFilterSuggestions(false);
                          setCurrentPage(1);
                        }}
                        data-testid={`suggestion-filter-debt-${item.id}`}
                      >
                        <span className="font-medium">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
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
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('External Debt')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReceipts.map((r, i) => (
                    <TableRow key={r.id} data-testid={`row-ext-debt-receipt-${r.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{r.date}</TableCell>
                      <TableCell className="font-mono text-sm">{r.time || "-"}</TableCell>
                      <TableCell className="font-medium">{r.debtName}</TableCell>
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
                            data-testid={`button-edit-ext-debt-receipt-${r.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-ext-debt-receipt-${r.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
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
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    data-testid="button-ext-debt-receipt-prev-page"
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
                      data-testid={`button-ext-debt-receipt-page-${page}`}
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
                    data-testid="button-ext-debt-receipt-next-page"
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
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              {t('Edit Receipt')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label>{t('External Debt')}</Label>
                <div className="relative">
                  <Input
                    value={editDebtSearch}
                    onChange={(e) => {
                      setEditDebtSearch(e.target.value);
                      setShowEditDebtSuggestions(true);
                      if (!e.target.value.trim()) { setEditDebtId(""); setEditDebtName(""); }
                    }}
                    onFocus={() => setShowEditDebtSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEditDebtSuggestions(false), 200)}
                    placeholder={t('Select external debt...')}
                    data-testid="select-edit-ext-debt-receipt"
                    autoComplete="off"
                  />
                  {showEditDebtSuggestions && editDebtSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {editDebtSuggestions.map((item: ExternalDebt) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setEditDebtId(String(item.id));
                            setEditDebtName(item.name);
                            setEditDebtSearch(item.name);
                            setShowEditDebtSuggestions(false);
                          }}
                          data-testid={`suggestion-edit-debt-${item.id}`}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : ""}
                            {parseFloat(item.oldDebtUsd) > 0 && parseFloat(item.oldDebtIqd) > 0 ? " | " : ""}
                            {parseFloat(item.oldDebtIqd) > 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-ext-debt-receipt-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-ext-debt-receipt-time" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600">{t('USD Amount')}</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-ext-debt-receipt-usd"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-600">{t('IQD Amount')}</Label>
                <Input
                  type="number" step="250" min="0" placeholder="0"
                  value={editAmountIqd} onChange={(e) => setEditAmountIqd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-ext-debt-receipt-iqd"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-ext-debt-receipt-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea placeholder={t('Description...')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="resize-none" data-testid="input-edit-ext-debt-receipt-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReceipt(null)}>{t('No')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="bg-orange-600 hover:bg-orange-700" data-testid="button-update-ext-debt-receipt">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('Update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
