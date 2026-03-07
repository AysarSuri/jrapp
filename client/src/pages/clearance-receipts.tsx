import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useClearanceTransactions, useCreateClearanceTransaction, useUpdateClearanceTransaction, useDeleteClearanceTransaction } from "@/hooks/use-clearance-transactions";
import { useQuery } from "@tanstack/react-query";
import type { CustomsClearance, CustomsClearanceTransaction } from "@shared/schema";
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
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, ArrowDownToLine,
  Eye, Pencil, Trash2, Printer, MessageCircle, ChevronLeft, ChevronRight,
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
import { usd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles } from "@/lib/print-styles";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function ClearanceReceiptsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; cliche: string | null; stamp: string | null; primaryColor: string; secondaryColor: string; mobile1: string }>({
    queryKey: ["/api/company-profile"],
  });
  const { data: allTxns, isLoading: txnsLoading } = useClearanceTransactions();
  const { mutate: createTxn, isPending: isSaving } = useCreateClearanceTransaction();
  const { mutate: updateTxn, isPending: isUpdating } = useUpdateClearanceTransaction();
  const { mutate: deleteTxn } = useDeleteClearanceTransaction();

  const { data: clearancesList } = useQuery<CustomsClearance[]>({
    queryKey: ["/api/customs-clearances"],
  });

  const [clearanceId, setClearanceId] = useState<string>("");
  const [clearanceName, setClearanceName] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [viewReceipt, setViewReceipt] = useState<CustomsClearanceTransaction | null>(null);
  const [editReceipt, setEditReceipt] = useState<CustomsClearanceTransaction | null>(null);
  const [editClearanceId, setEditClearanceId] = useState("");
  const [editClearanceName, setEditClearanceName] = useState("");
  const [editAmountUsd, setEditAmountUsd] = useState("");
  const [editAmountIqd, setEditAmountIqd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const clearances = clearancesList || [];

  const selectClearance = useCallback((id: string) => {
    setClearanceId(id);
    const clearance = clearances.find(b => b.id === parseInt(id));
    if (clearance) setClearanceName(clearance.name);
  }, [clearances]);

  const selectedClearance = clearances.find(b => b.id === parseInt(clearanceId));

  const resetForm = () => {
    setClearanceId("");
    setClearanceName("");
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!clearanceId) {
      toast({ title: t("Please select a clearance"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createTxn({
      clearanceId: parseInt(clearanceId),
      clearanceName,
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

  const openEdit = (r: CustomsClearanceTransaction) => {
    setEditReceipt(r);
    setEditClearanceId(String(r.clearanceId));
    setEditClearanceName(r.clearanceName);
    setEditAmountUsd(r.amountUsd);
    setEditAmountIqd(r.amountIqd);
    setEditDescription(r.description || "");
    setEditReference(r.reference || "");
    setEditDate(r.date);
    setEditTime(r.time || "00:00");
  };

  const handleUpdate = () => {
    if (!editReceipt) return;
    if (!editClearanceId) {
      toast({ title: t("Please select a clearance"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(editAmountUsd || "0");
    const iqdVal = parseFloat(editAmountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    updateTxn({ id: editReceipt.id, data: {
      clearanceId: parseInt(editClearanceId),
      clearanceName: editClearanceName,
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
    if (historyFilter && historyFilter !== "all" && String(r.clearanceId) !== historyFilter) return false;
    if (historyFromDate && r.date < historyFromDate) return false;
    if (historyToDate && r.date > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReceipts = filteredReceipts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";
  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ArrowDownToLine className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            {t('Clearance Receipts')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record amounts received from customs clearances')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-clearance-receipt">
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
              <div className="space-y-2">
                <Label>{t('Customs Clearance')}</Label>
                <Select value={clearanceId} onValueChange={selectClearance}>
                  <SelectTrigger data-testid="select-clearance-receipt-clearance">
                    <SelectValue placeholder={t('Select clearance...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clearances.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-clearance-receipt-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-clearance-receipt-time" />
              </div>
            </div>

            {selectedClearance && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Customs Clearance')}</p>
                      <p className="font-bold">{selectedClearance.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance USD')}</p>
                      <p className="font-mono font-bold text-blue-600">{usd(selectedClearance.oldDebtUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance IQD')}</p>
                      <p className="font-mono font-bold text-orange-600">{formatIQD(parseFloat(selectedClearance.oldDebtIqd))}</p>
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
                    data-testid="input-clearance-receipt-usd"
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
                    data-testid="input-clearance-receipt-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-clearance-receipt-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-clearance-receipt-description" />
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
              {selectedClearance && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Customs Clearance')}</p>
                    <p className="font-bold text-lg">{selectedClearance.name}</p>
                  </div>
                </>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-clearance-receipt-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-clearance-receipt-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !clearanceId}
                className="w-full h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
                data-testid="button-save-clearance-receipt"
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
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-history-to-date" />
              </div>
              <div className="w-48">
                <Select value={historyFilter} onValueChange={(v) => { setHistoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-receipt-history" className="h-9">
                    <SelectValue placeholder={t('All Clearances')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Clearances')}</SelectItem>
                    {clearances.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
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
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Customs Clearance')}</TableHead>
                    <TableHead>{t('USD Amount')}</TableHead>
                    <TableHead>{t('IQD Amount')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReceipts.map((r, i) => (
                    <TableRow key={r.id} data-testid={`row-clearance-receipt-${r.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{r.date}</TableCell>
                      <TableCell className="font-mono text-sm">{r.time || "-"}</TableCell>
                      <TableCell className="font-medium">{r.clearanceName}</TableCell>
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
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setViewReceipt(r)}
                            data-testid={`button-view-clearance-receipt-${r.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => openEdit(r)}
                            data-testid={`button-edit-clearance-receipt-${r.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-clearance-receipt-${r.id}`}
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
                    data-testid="button-prev-page"
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
                      data-testid={`button-page-${page}`}
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
                    data-testid="button-next-page"
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

      {/* View Receipt Dialog - Printable Invoice */}
      <Dialog open={!!viewReceipt} onOpenChange={(open) => { if (!open) setViewReceipt(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('Clearance Receipt')}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  if (!viewReceipt) return;
                  setSendingWhatsApp(true);
                  try {
                    const content = printRef.current;
                    if (!content) return;
                    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
                    const imgWidth = 210;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    const pdf = new jsPDF("p", "mm", "a4");
                    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
                    const pdfBlob = pdf.output("blob");
                    const fileName = `${t("Clearance Receipt")}_${viewReceipt.clearanceName}_${viewReceipt.date}.pdf`;
                    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ title: fileName, files: [file] });
                    } else {
                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement("a");
                      a.href = url; a.download = fileName; a.click();
                      URL.revokeObjectURL(url);
                      const text = encodeURIComponent(`${t("Clearance Receipt")}\n${t("Customs Clearance")}: ${viewReceipt.clearanceName}\n${t("Date")}: ${viewReceipt.date}\n${parseFloat(viewReceipt.amountUsd) > 0 ? t("USD Amount") + ": $" + fmt(viewReceipt.amountUsd) : ""}${parseFloat(viewReceipt.amountIqd) > 0 ? "\n" + t("IQD Amount") + ": " + fmt(viewReceipt.amountIqd) + " IQD" : ""}`);
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }
                  } finally { setSendingWhatsApp(false); }
                }} disabled={sendingWhatsApp} data-testid="button-whatsapp-clearance-receipt" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                  {sendingWhatsApp ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                  {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const content = printRef.current;
                  if (!content) return;
                  const printWindow = window.open("", "_blank", "width=794,height=1123");
                  if (!printWindow) return;
                  const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: "#1e293b", accentTextColor: "#ffffff" });
                  printWindow.document.write(`<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}"><head><meta charset="UTF-8" /><title>${t("Clearance Receipt")}</title><style>${printStyles} .cliche-container { text-align: center; margin-bottom: 12px; } .cliche-container img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; }</style></head><body>${content.innerHTML}</body></html>`);
                  printWindow.document.close();
                  setTimeout(() => { printWindow.print(); }, 300);
                }} data-testid="button-print-clearance-receipt">
                  <Printer className="w-4 h-4 mr-1" />
                  {t("Print")}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewReceipt && (
            <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", padding: 15 }}>
              {companyProfile?.cliche && (
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <img src={companyProfile.cliche} alt={companyProfile?.name || ""} style={{ width: "100%", height: 170, objectFit: "cover" }} />
                </div>
              )}
              <div style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #333", paddingBottom: 10 }}>
                <h1 style={{ fontSize: "18pt", marginBottom: 3, fontWeight: 700 }}>{t("Clearance Receipt")}</h1>
                <p style={{ fontSize: "12pt", color: "#666" }}>
                  {t("Date")}: {formatDate(viewReceipt.date)} | {t("Time")}: {viewReceipt.time || "-"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 15, fontSize: "12pt" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Customs Clearance")}:</span>
                  <span style={{ fontWeight: 600, flex: 1, textAlign: "center" }}>{viewReceipt.clearanceName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Type")}:</span>
                  <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{t("Receipt")}</span>
                </div>
                {viewReceipt.reference && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0" }}>
                    <span style={{ fontWeight: 600, color: "#555" }}>{t("Reference")}:</span>
                    <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{viewReceipt.reference}</span>
                  </div>
                )}
                {viewReceipt.description && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0", gridColumn: "1 / -1" }}>
                    <span style={{ fontWeight: 600, color: "#555" }}>{t("Description")}:</span>
                    <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{viewReceipt.description}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
                {parseFloat(viewReceipt.amountUsd) > 0 && (
                  <div style={{ border: "2px solid #2563eb", borderRadius: 6, padding: 15, textAlign: "center" }}>
                    <p style={{ fontSize: "11pt", color: "#555", marginBottom: 5 }}>{t("USD Amount")}</p>
                    <p style={{ fontSize: "22pt", fontWeight: 700, color: "#2563eb", fontFamily: "monospace" }}>${fmt(viewReceipt.amountUsd)}</p>
                  </div>
                )}
                {parseFloat(viewReceipt.amountIqd) > 0 && (
                  <div style={{ border: "2px solid #ea580c", borderRadius: 6, padding: 15, textAlign: "center" }}>
                    <p style={{ fontSize: "11pt", color: "#555", marginBottom: 5 }}>{t("IQD Amount")}</p>
                    <p style={{ fontSize: "22pt", fontWeight: 700, color: "#ea580c", fontFamily: "monospace" }}>{fmt(viewReceipt.amountIqd)} IQD</p>
                  </div>
                )}
              </div>

              {companyProfile?.stamp && (
                <div style={{ textAlign: "center", marginTop: 15 }}>
                  <img src={companyProfile.stamp} alt="Stamp" style={{ maxHeight: 120, opacity: 0.8 }} />
                </div>
              )}

              <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", fontSize: "12pt" }}>
                <div style={{ textAlign: "center", width: 200 }}>
                  <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Recipient Signature")}</div>
                </div>
                <div style={{ textAlign: "center", width: 200 }}>
                  <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Accountant")}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Receipt Dialog */}
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
              <div className="space-y-2">
                <Label>{t('Customs Clearance')}</Label>
                <Select value={editClearanceId} onValueChange={(v) => {
                  setEditClearanceId(v);
                  const c = clearances.find(b => b.id === parseInt(v));
                  if (c) setEditClearanceName(c.name);
                }}>
                  <SelectTrigger data-testid="select-edit-clearance-receipt">
                    <SelectValue placeholder={t('Select clearance...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clearances.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-clearance-receipt-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-clearance-receipt-time" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600">{t('USD Amount')}</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-clearance-receipt-usd"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-600">{t('IQD Amount')}</Label>
                <Input
                  type="number" step="250" min="0" placeholder="0"
                  value={editAmountIqd} onChange={(e) => setEditAmountIqd(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-clearance-receipt-iqd"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-clearance-receipt-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea placeholder={t('Description...')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="resize-none" data-testid="input-edit-clearance-receipt-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReceipt(null)}>{t('Cancel')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="gap-2 bg-green-600 hover:bg-green-700" data-testid="button-update-clearance-receipt">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
