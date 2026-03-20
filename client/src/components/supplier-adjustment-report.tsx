import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Printer, MessageCircle } from "lucide-react";
import { captureElementAsPdf } from "@/lib/pdf-utils";
import { formatDate } from "@/lib/format-utils";
import { numberToWords } from "@/lib/number-to-words";
import { getModernPrintStyles } from "@/lib/print-styles";
import { logExport } from "@/lib/export-log";
import { useUser } from "@/hooks/use-auth";

type AdjustmentData = {
  id: number;
  supplierId: number;
  supplierName: string;
  type: string;
  amountUsd: string;
  amountIqd: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
  remainingUsd: string;
  remainingIqd: string;
  payTo: string | null;
  payToName: string | null;
  note: string | null;
  date: string;
  time: string;
};

type ClientData = {
  id: number;
  name: string;
  mobile: string | null;
};

type CompanyProfileData = {
  id: number;
  name: string;
  address: string;
  mobile1: string;
  mobile2: string;
  businessType: string;
  logo: string | null;
  cliche: string | null;
  stamp: string | null;
  qrAddress: string;
  primaryColor: string;
  secondaryColor: string;
};

interface SupplierAdjustmentReportProps {
  adjustmentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: "USD" | "IQD";
}

export default function SupplierAdjustmentReport({ adjustmentId, open, onOpenChange, currency }: SupplierAdjustmentReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const { data: user } = useUser();
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const { data: adjustment, isLoading } = useQuery<AdjustmentData>({
    queryKey: ["/api/supplier-adjustments", adjustmentId],
    queryFn: async () => {
      const res = await fetch(`/api/supplier-adjustments/${adjustmentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch adjustment");
      return res.json();
    },
    enabled: !!adjustmentId && open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!adjustment?.supplierId && open,
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

  const { data: openingBalance } = useQuery<{ openingBalanceUsd: number; openingBalanceIqd: number }>({
    queryKey: ["/api/supplier-opening-balance", adjustment?.supplierId, adjustment?.date, adjustment?.time, adjustmentId],
    queryFn: async () => {
      const params = new URLSearchParams({
        supplierId: String(adjustment!.supplierId),
        date: adjustment!.date,
        time: adjustment!.time || "00:00",
        excludeAdjustmentId: String(adjustmentId),
      });
      const res = await fetch(`/api/supplier-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!adjustment?.supplierId && !!adjustment?.date && open,
    staleTime: 0,
  });

  const fieldColor = companyProfile?.primaryColor || "#333";
  const supplier = clients?.find(c => c.id === adjustment?.supplierId);

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const amountUsd = parseFloat(adjustment?.amountUsd || "0");
  const amountIqd = parseFloat(adjustment?.amountIqd || "0");
  const isReceived = adjustment?.type === "received";
  const typeLabel = isReceived ? t("Received") : t("Discount");
  const typeColor = isReceived ? "#16a34a" : "#f59e0b";

  const receiptTitle = currency === "USD"
    ? t("Supplier Adjustment Receipt - USD")
    : t("Supplier Adjustment Receipt - IQD");

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;
    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: "#1e293b", accentTextColor: "#ffffff" });
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Supplier Adjustment Receipt")} - ${adjustment?.supplierName || ""}</title>
        <style>
          ${printStyles}
          .cliche-container { text-align: center; margin-bottom: 12px; }
          .cliche-container img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
    if (adjustment) {
      logExport({ reportName: t("Supplier Adjustment Receipt"), supplierName: adjustment.supplierName, invoiceNumber: `ADJ-${adjustment.id}`, exportType: "print", currency });
    }
  };

  const generatePdf = async (): Promise<Blob | null> => {
    const content = printRef.current;
    if (!content) return null;
    return captureElementAsPdf(content);
  };

  const handleWhatsApp = async () => {
    if (!adjustment) return;
    setSendingWhatsApp(true);
    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;
      const fileName = `${t("Supplier Adjustment Receipt")}_${adjustment.supplierName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${t("Supplier Adjustment Receipt")} - ${adjustment.supplierName}`, files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        const phone = supplier?.mobile ? supplier.mobile.replace(/[^0-9]/g, "") : "";
        const mainAmount = currency === "USD" ? `$${fmt(amountUsd)}` : `${fmt(amountIqd)} IQD`;
        const text = encodeURIComponent(
          `${receiptTitle}\n${t("Supplier Name")}: ${adjustment.supplierName}\n${t("Adjustment Type")}: ${typeLabel}\n${t("Amount")}: ${mainAmount}\n${t("Date")}: ${formatDate(adjustment.date)}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      logExport({ reportName: t("Supplier Adjustment Receipt"), supplierName: adjustment.supplierName, invoiceNumber: `ADJ-${adjustment.id}`, exportType: "whatsapp", currency });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("Supplier Adjustment Receipt")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading || sendingWhatsApp} data-testid="button-whatsapp-adjustment" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-5 h-5 mr-1 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} data-testid="button-print-adjustment">
                <Printer className="w-5 h-5 mr-1" />
                {t("Print")}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : adjustment ? (
          <div ref={printRef} style={{ fontFamily: "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Segoe UI',sans-serif" }}>
            {companyProfile?.cliche && (
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", height: 170, objectFit: "cover" }} />
              </div>
            )}

            <div style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #333", paddingBottom: 10 }}>
              <h1 style={{ fontSize: "16pt", marginBottom: 3 }}>{receiptTitle}</h1>
              <p style={{ fontSize: "12pt", color: "#666", fontWeight: 700 }}>
                {t("Date")}: {formatDate(adjustment.date)} | {t("Time")}: {adjustment.time}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 16, fontSize: "12pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0" }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{t("Supplier Name")}:</span>
                <span style={{ fontWeight: 700, flex: 1, textAlign: "center" }}>{adjustment.supplierName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0" }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{t("Adjustment Type")}:</span>
                <span style={{ fontWeight: 700, flex: 1, textAlign: "center", color: typeColor }}>{typeLabel}</span>
              </div>
              {adjustment.payToName && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>{t("Pay To")}:</span>
                  <span style={{ fontWeight: 700 }}>{adjustment.payToName}</span>
                </div>
              )}
              {adjustment.note && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>{t("Note")}:</span>
                  <span style={{ fontWeight: 700, textAlign: "center", flex: 1 }}>{adjustment.note}</span>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: amountUsd > 0 && amountIqd > 0 ? "1fr 1fr" : "1fr", gap: 15, marginBottom: 16 }}>
              {amountUsd > 0 && (
                <div style={{ border: "2px solid " + typeColor, borderRadius: 6, padding: 12 }}>
                  <h3 style={{ fontSize: "14pt", marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 5, fontWeight: 700, color: fieldColor }}>
                    {t("Amount")} (USD)
                  </h3>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "15px 0", fontSize: "22pt", fontWeight: 800, fontFamily: "monospace", color: typeColor }}>
                    ${fmt(amountUsd)}
                  </div>
                  <p style={{ fontSize: "9pt", color: "#666", fontStyle: "italic", textAlign: "center", margin: "0 0 4px" }}>
                    {numberToWords(amountUsd, i18n.language, t("Dollar"))}
                  </p>
                </div>
              )}
              {amountIqd > 0 && (
                <div style={{ border: "2px solid " + typeColor, borderRadius: 6, padding: 12 }}>
                  <h3 style={{ fontSize: "14pt", marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 5, fontWeight: 700, color: fieldColor }}>
                    {t("Amount")} (IQD)
                  </h3>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "15px 0", fontSize: "22pt", fontWeight: 800, fontFamily: "monospace", color: typeColor }}>
                    {fmt(amountIqd)} IQD
                  </div>
                  <p style={{ fontSize: "9pt", color: "#666", fontStyle: "italic", textAlign: "center", margin: "0 0 4px" }}>
                    {numberToWords(amountIqd, i18n.language, t("Dinar"))}
                  </p>
                </div>
              )}
            </div>

            <div style={{ border: `2px solid ${fieldColor}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <h3 style={{ color: fieldColor, fontSize: "13pt", marginBottom: 8, fontWeight: 700 }}>{t("Supplier Balance")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {amountUsd > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{t("Opening Balance")}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>${fmt(openingBalance?.openingBalanceUsd ?? 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", color: isReceived ? "#16a34a" : "#dc2626", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{typeLabel}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{isReceived ? "+" : "-"}${fmt(amountUsd)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14pt", color: "#dc2626", fontWeight: 800, borderTop: `2px solid ${fieldColor}`, marginTop: 4, paddingTop: 8, direction: isRtl ? "rtl" : "ltr" }}>
                      <span>{t("Total Balance")}:</span>
                      <span style={{ fontFamily: "monospace" }}>${fmt(isReceived ? (openingBalance?.openingBalanceUsd ?? 0) + amountUsd : (openingBalance?.openingBalanceUsd ?? 0) - amountUsd)}</span>
                    </div>
                    {(() => { const bal = isReceived ? (openingBalance?.openingBalanceUsd ?? 0) + amountUsd : (openingBalance?.openingBalanceUsd ?? 0) - amountUsd; return bal !== 0 ? (
                      <div style={{ fontSize: "10pt", fontWeight: 700, color: bal > 0 ? "#dc2626" : "#16a34a", textAlign: isRtl ? "right" : "left", marginTop: 4, direction: isRtl ? "rtl" : "ltr" }}>
                        {t("Remaining with")} {bal > 0 ? (companyProfile?.name || "") : adjustment?.supplierName}
                      </div>
                    ) : null; })()}
                  </>
                )}
                {amountIqd > 0 && amountUsd <= 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{t("Opening Balance")}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{fmt(openingBalance?.openingBalanceIqd ?? 0)} IQD</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", color: isReceived ? "#16a34a" : "#dc2626", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{typeLabel}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{isReceived ? "+" : "-"}{fmt(amountIqd)} IQD</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14pt", color: "#dc2626", fontWeight: 800, borderTop: `2px solid ${fieldColor}`, marginTop: 4, paddingTop: 8, direction: isRtl ? "rtl" : "ltr" }}>
                      <span>{t("Total Balance")}:</span>
                      <span style={{ fontFamily: "monospace" }}>{fmt(isReceived ? (openingBalance?.openingBalanceIqd ?? 0) + amountIqd : (openingBalance?.openingBalanceIqd ?? 0) - amountIqd)} IQD</span>
                    </div>
                    {(() => { const bal = isReceived ? (openingBalance?.openingBalanceIqd ?? 0) + amountIqd : (openingBalance?.openingBalanceIqd ?? 0) - amountIqd; return bal !== 0 ? (
                      <div style={{ fontSize: "10pt", fontWeight: 700, color: bal > 0 ? "#dc2626" : "#16a34a", textAlign: isRtl ? "right" : "left", marginTop: 4, direction: isRtl ? "rtl" : "ltr" }}>
                        {t("Remaining with")} {bal > 0 ? (companyProfile?.name || "") : adjustment?.supplierName}
                      </div>
                    ) : null; })()}
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: "12pt" }}>
              <div style={{ textAlign: "center", width: 200 }}>
                <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Supplier Signature")}</div>
              </div>
              <div style={{ textAlign: "center", width: 200 }}>
                {companyProfile?.stamp && (
                  <img src={companyProfile.stamp} alt="Stamp" style={{ maxWidth: 120, maxHeight: 120, objectFit: "contain", margin: "0 auto 5px" }} />
                )}
                <div style={{ fontWeight: 700, fontSize: "12pt" }}>{user?.fullName || ""}</div>
                <div style={{ borderTop: "1px solid #333", marginTop: 10, paddingTop: 3 }}>{t("Accountant")}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
