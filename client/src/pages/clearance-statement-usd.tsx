import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CustomsClearance, CustomsClearanceTransaction } from "@shared/schema";
import { usd, formatDate } from "@/lib/format-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { playDeleteSound } from "@/lib/sounds";
import { getModernPrintStyles } from "@/lib/print-styles";
import { useUpdateClearanceTransaction, useDeleteClearanceTransaction } from "@/hooks/use-clearance-transactions";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, DollarSign, Eye, Pencil, Trash2, Printer, MessageCircle, Save, Banknote,
} from "lucide-react";
import PurchaseInvoiceReport from "@/components/purchase-invoice-report";

interface StatementEntry {
  id: number;
  date: string;
  time: string;
  type: string;
  source: string;
  description: string | null;
  reference: string | null;
  carNumber: string;
  manifest: string;
  debitUsd: number;
  debitIqd: number;
  creditUsd: number;
  creditIqd: number;
}

interface StatementResponse {
  clearance: CustomsClearance;
  entries: StatementEntry[];
}

export default function ClearanceStatementUsdPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";

  const [selectedClearanceId, setSelectedClearanceId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split("T")[0]);
  const [viewEntry, setViewEntry] = useState<(StatementEntry & { balance: number }) | null>(null);
  const [editEntry, setEditEntry] = useState<StatementEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<StatementEntry | null>(null);
  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const [editAmountUsd, setEditAmountUsd] = useState("");
  const [editAmountIqd, setEditAmountIqd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; cliche: string | null; stamp: string | null; primaryColor: string; secondaryColor: string }>({
    queryKey: ["/api/company-profile"],
  });

  const { data: clearancesList } = useQuery<CustomsClearance[]>({
    queryKey: ["/api/customs-clearances"],
  });

  const { mutate: updateTxn, isPending: isUpdating } = useUpdateClearanceTransaction();
  const { mutate: deleteTxn } = useDeleteClearanceTransaction();

  const clearances = clearancesList || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/clearance-statement", selectedClearanceId],
    enabled: !!selectedClearanceId,
  });

  const entries = statement?.entries || [];
  const usdEntries = entries.filter(e => {
    if (!(e.debitUsd > 0 || e.creditUsd > 0)) return false;
    if (dateFrom) {
      const entryDate = new Date(e.date).toISOString().slice(0, 10);
      if (entryDate < dateFrom) return false;
    }
    if (dateTo) {
      const entryDate = new Date(e.date).toISOString().slice(0, 10);
      if (entryDate > dateTo) return false;
    }
    return true;
  });

  const openingUsd = parseFloat(statement?.clearance?.oldDebtUsd || "0");

  let runUsd = openingUsd;
  const usdWithBalance = usdEntries.map((entry) => {
    runUsd += entry.debitUsd - entry.creditUsd;
    return { ...entry, balance: runUsd };
  });

  const totalCustomsFeeUsd = usdEntries.filter(e => e.source === "invoice" || e.source === "clearance_invoice").reduce((s, e) => s + e.debitUsd, 0);
  const totalReceiptsUsd = usdEntries.filter(e => e.source !== "invoice" && e.source !== "clearance_invoice" && e.type === "receipt").reduce((s, e) => s + e.debitUsd, 0);
  const totalDebitUsd = totalCustomsFeeUsd + totalReceiptsUsd;
  const totalCreditUsd = usdEntries.reduce((s, e) => s + e.creditUsd, 0);
  const finalBalanceUsd = openingUsd + totalDebitUsd - totalCreditUsd;

  const fmtUsd = (val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (val: string | number) => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };


  const typeBadge = (type: string, source: string) => {
    if (source === "clearance_invoice") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('Customs')}</Badge>;
    if (source === "invoice") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('Customs Fee')}</Badge>;
    if (type === "receipt") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Receipt')}</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Payment')}</Badge>;
  };

  const handleViewClick = (entry: StatementEntry & { balance: number }) => {
    if (entry.source === "invoice") {
      setReportInvoiceId(entry.id);
      setReportOpen(true);
    } else if (entry.source === "clearance_invoice") {
      navigate(`/clearance-purchase-invoices`);
    } else {
      setViewEntry(entry);
    }
  };

  const handleEditClick = (entry: StatementEntry) => {
    if (entry.source === "invoice") {
      navigate(`/purchase-invoice-usd?edit=${entry.id}`);
    } else if (entry.source === "clearance_invoice") {
      navigate(`/clearance-purchase-invoices`);
    } else {
      setEditEntry(entry);
      setEditAmountUsd(String(entry.type === "receipt" ? entry.debitUsd : entry.creditUsd));
      setEditAmountIqd(String(entry.type === "receipt" ? entry.debitIqd : entry.creditIqd));
      setEditDescription(entry.description || "");
      setEditReference(entry.reference || "");
      setEditDate(entry.date);
      setEditTime(entry.time || "");
    }
  };

  const handleUpdate = () => {
    if (!editEntry) return;
    updateTxn({
      id: editEntry.id,
      data: {
        amountUsd: editAmountUsd,
        amountIqd: editAmountIqd,
        description: editDescription,
        reference: editReference,
        date: editDate,
        time: editTime,
      },
    }, {
      onSuccess: () => {
        toast({ title: t("Updated successfully") });
        setEditEntry(null);
        queryClient.invalidateQueries({ queryKey: ["/api/clearance-statement", selectedClearanceId] });
      },
      onError: () => {
        toast({ title: t("Error"), variant: "destructive" });
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      if (deleteEntry.source === "clearance_invoice") {
        await apiRequest("DELETE", `/api/clearance-purchase-invoices/${deleteEntry.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/clearance-statement", selectedClearanceId] });
        toast({ title: t("Deleted successfully") });
        playDeleteSound();
        setDeleteEntry(null);
      } else if (deleteEntry.source === "invoice") {
        await apiRequest("DELETE", `/api/purchase-invoices/${deleteEntry.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/clearance-statement", selectedClearanceId] });
        toast({ title: t("Deleted successfully") });
        playDeleteSound();
        setDeleteEntry(null);
      } else {
        deleteTxn(deleteEntry.id, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clearance-statement", selectedClearanceId] });
            toast({ title: t("Deleted successfully") });
            playDeleteSound();
            setDeleteEntry(null);
          },
          onError: () => {
            toast({ title: t("Error"), variant: "destructive" });
            setDeleteEntry(null);
          },
        });
      }
    } catch {
      toast({ title: t("Error"), variant: "destructive" });
      setDeleteEntry(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          {t('Clearance Statement USD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('Clearance account statement in US Dollars')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Clearance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-auto sm:min-w-[250px]">
              <Select value={selectedClearanceId} onValueChange={setSelectedClearanceId}>
                <SelectTrigger data-testid="select-clearance-statement-usd">
                  <SelectValue placeholder={t('Select clearance...')} />
                </SelectTrigger>
                <SelectContent>
                  {clearances.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)} data-testid={`select-clearance-usd-${b.id}`}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('From Date')}</label>
                <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-date-from-usd" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('To Date')}</label>
                <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-date-to-usd" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClearanceId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedClearanceId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-5">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">{t('Customs Fee')}</p>
                <p className="font-mono font-bold text-purple-800 dark:text-purple-300" data-testid="text-usd-customs-fee">{fmtUsd(totalCustomsFeeUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('Receipts from Clearance')}</p>
                <p className="font-mono font-bold text-green-800 dark:text-green-300" data-testid="text-usd-total-receipts">{fmtUsd(totalReceiptsUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{t('Old Debt')}</p>
                <p className="font-mono font-bold text-amber-800 dark:text-amber-300" data-testid="text-usd-opening">{fmtUsd(openingUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-red-700 dark:text-red-400 mb-1">{t('Total Payments')}</p>
                <p className="font-mono font-bold text-red-800 dark:text-red-300" data-testid="text-usd-total-credit">{fmtUsd(totalCreditUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">{t('Final Balance')}</p>
                <p className="font-mono font-bold text-blue-800 dark:text-blue-300" data-testid="text-usd-final-balance">{fmtUsd(finalBalanceUsd)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Car Number')}</TableHead>
                    <TableHead>{t('Manifest')}</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400">{t('Debit')}</TableHead>
                    <TableHead className="text-red-700 dark:text-red-400">{t('Credit')}</TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-amber-50/50 dark:bg-amber-950/20 font-medium">
                    <TableCell colSpan={6} className="text-amber-700 dark:text-amber-400">
                      {t('Opening Balance')}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="font-mono text-sm text-blue-600 font-bold">{fmtUsd(openingUsd)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {usdWithBalance.map((entry, i) => (
                    <TableRow key={`usd-${entry.source}-${entry.id}`} data-testid={`row-usd-statement-${entry.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(entry.date)}</TableCell>
                      <TableCell>{typeBadge(entry.type, entry.source)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="font-mono text-sm" dir="ltr">{entry.carNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-sm" dir="ltr">{entry.manifest || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {entry.debitUsd > 0 ? fmtUsd(entry.debitUsd) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {entry.creditUsd > 0 ? fmtUsd(entry.creditUsd) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {fmtUsd(entry.balance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewClick(entry)} data-testid={`btn-view-${entry.source}-${entry.id}`}>
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(entry)} data-testid={`btn-edit-${entry.source}-${entry.id}`}>
                            <Pencil className="h-3.5 w-3.5 text-orange-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteEntry(entry)} data-testid={`btn-delete-${entry.source}-${entry.id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usdEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {t('No transactions found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {usdEntries.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6} className="text-end">{t('Total')}</TableCell>
                      <TableCell className="font-mono text-green-700">{fmtUsd(totalDebitUsd)}</TableCell>
                      <TableCell className="font-mono text-red-700">{fmtUsd(totalCreditUsd)}</TableCell>
                      <TableCell className="font-mono text-blue-700">{fmtUsd(finalBalanceUsd)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </>
      )}

      <Dialog open={!!viewEntry} onOpenChange={(open) => { if (!open) setViewEntry(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{viewEntry?.type === "receipt" ? t('Clearance Receipt') : t('Clearance Payment')}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  if (!viewEntry) return;
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
                    const title = viewEntry.type === "receipt" ? t("Clearance Receipt") : t("Clearance Payment");
                    const fileName = `${title}_${statement?.clearance?.name}_${viewEntry.date}.pdf`;
                    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ title: fileName, files: [file] });
                    } else {
                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement("a");
                      a.href = url; a.download = fileName; a.click();
                      URL.revokeObjectURL(url);
                      const text = encodeURIComponent(`${title}\n${t("Customs Clearance")}: ${statement?.clearance?.name}\n${t("Date")}: ${viewEntry.date}\n${viewEntry.debitUsd > 0 ? t("USD Amount") + ": $" + fmt(viewEntry.debitUsd) : ""}${viewEntry.creditUsd > 0 ? t("USD Amount") + ": $" + fmt(viewEntry.creditUsd) : ""}`);
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }
                  } finally { setSendingWhatsApp(false); }
                }} disabled={sendingWhatsApp} data-testid="button-whatsapp-statement" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                  {sendingWhatsApp ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                  {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const content = printRef.current;
                  if (!content) return;
                  const printWindow = window.open("", "_blank", "width=794,height=1123");
                  if (!printWindow) return;
                  const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: viewEntry?.type === "receipt" ? "#1e293b" : "#dc2626", accentTextColor: "#ffffff" });
                  const title = viewEntry?.type === "receipt" ? t("Clearance Receipt") : t("Clearance Payment");
                  printWindow.document.write(`<!DOCTYPE html><html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}"><head><meta charset="UTF-8" /><title>${title}</title><style>${printStyles} .cliche-container { text-align: center; margin-bottom: 12px; } .cliche-container img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; }</style></head><body>${content.innerHTML}</body></html>`);
                  printWindow.document.close();
                  setTimeout(() => { printWindow.print(); }, 300);
                }} data-testid="button-print-statement">
                  <Printer className="w-4 h-4 mr-1" />
                  {t("Print")}
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>{viewEntry?.description}</DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", padding: 15 }}>
              {companyProfile?.cliche && (
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <img src={companyProfile.cliche} alt={companyProfile?.name || ""} style={{ width: "100%", height: 170, objectFit: "cover" }} />
                </div>
              )}
              <div style={{ textAlign: "center", marginBottom: 15, borderBottom: `2px solid ${viewEntry.type === "receipt" ? "#333" : "#dc2626"}`, paddingBottom: 10 }}>
                <h1 style={{ fontSize: "18pt", marginBottom: 3, fontWeight: 700, color: viewEntry.type === "payment" ? "#dc2626" : "#333" }}>
                  {viewEntry.type === "receipt" ? t("Clearance Receipt") : t("Clearance Payment")}
                </h1>
                <p style={{ fontSize: "12pt", color: "#666" }}>
                  {t("Date")}: {formatDate(viewEntry.date)} | {t("Time")}: {viewEntry.time || "-"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 15, fontSize: "12pt" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Customs Clearance")}:</span>
                  <span style={{ fontWeight: 600, flex: 1, textAlign: "center" }}>{statement?.clearance?.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Type")}:</span>
                  <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{viewEntry.type === "receipt" ? t("Receipt") : t("Payment")}</span>
                </div>
                {viewEntry.reference && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0" }}>
                    <span style={{ fontWeight: 600, color: "#555" }}>{t("Reference")}:</span>
                    <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{viewEntry.reference}</span>
                  </div>
                )}
                {viewEntry.description && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "4px 0", gridColumn: "1 / -1" }}>
                    <span style={{ fontWeight: 600, color: "#555" }}>{t("Description")}:</span>
                    <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }} dir="ltr">{viewEntry.description}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 15, marginBottom: 15 }}>
                {(viewEntry.debitUsd > 0 || viewEntry.creditUsd > 0) && (
                  <div style={{ border: `2px solid ${viewEntry.type === "receipt" ? "#2563eb" : "#dc2626"}`, borderRadius: 6, padding: 15, textAlign: "center" }}>
                    <p style={{ fontSize: "11pt", color: "#555", marginBottom: 5 }}>{t("USD Amount")}</p>
                    <p style={{ fontSize: "22pt", fontWeight: 700, color: viewEntry.type === "receipt" ? "#2563eb" : "#dc2626", fontFamily: "monospace" }}>
                      ${fmt(viewEntry.debitUsd > 0 ? viewEntry.debitUsd : viewEntry.creditUsd)}
                    </p>
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

      <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              {editEntry?.type === "receipt" ? t('Edit Receipt') : t('Edit Payment')}
            </DialogTitle>
            <DialogDescription>{editEntry?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-statement-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} data-testid="input-edit-statement-time" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600">{t('USD Amount')}</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)} className="font-mono" data-testid="input-edit-statement-usd" />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-600">{t('IQD Amount')}</Label>
                <Input type="number" step="250" min="0" placeholder="0" value={editAmountIqd} onChange={(e) => setEditAmountIqd(e.target.value)} className="font-mono" data-testid="input-edit-statement-iqd" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Reference')}</Label>
              <Input placeholder={t('Reference number...')} value={editReference} onChange={(e) => setEditReference(e.target.value)} data-testid="input-edit-statement-reference" />
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea placeholder={t('Description...')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="resize-none" data-testid="input-edit-statement-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>{t('Cancel')}</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="gap-2 bg-green-600 hover:bg-green-700" data-testid="button-update-statement">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Confirmation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete this record?")} ({deleteEntry?.description || "-"})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="btn-confirm-delete-statement">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PurchaseInvoiceReport
        invoiceId={reportInvoiceId}
        open={reportOpen}
        onOpenChange={(open) => { setReportOpen(open); if (!open) setReportInvoiceId(null); }}
        currency="USD"
      />
    </div>
  );
}
