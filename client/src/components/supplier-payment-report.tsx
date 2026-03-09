import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Printer, MessageCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/format-utils";
import { numberToWords } from "@/lib/number-to-words";
import { getModernPrintStyles } from "@/lib/print-styles";
import { logExport } from "@/lib/export-log";
import { useUser } from "@/hooks/use-auth";

type PaymentData = {
  id: number;
  supplierId: number;
  supplierName: string;
  paymentSource: string;
  paymentSourceName: string;
  amountUsd: string;
  amountIqd: string;
  commissionUsd: string;
  commissionIqd: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
  remainingUsd: string;
  remainingIqd: string;
  note: string | null;
  reference: string | null;
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

interface SupplierPaymentReportProps {
  paymentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: "USD" | "IQD";
}

export default function SupplierPaymentReport({ paymentId, open, onOpenChange, currency }: SupplierPaymentReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const { data: user } = useUser();

  const { data: payment, isLoading } = useQuery<PaymentData>({
    queryKey: ["/api/supplier-payments", paymentId],
    queryFn: async () => {
      const res = await fetch(`/api/supplier-payments/${paymentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payment");
      return res.json();
    },
    enabled: !!paymentId && open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!payment?.supplierId && open,
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

  const { data: openingBalance } = useQuery<{ openingBalanceUsd: number; openingBalanceIqd: number }>({
    queryKey: ["/api/supplier-opening-balance", payment?.supplierId, payment?.date, payment?.time, paymentId],
    queryFn: async () => {
      const params = new URLSearchParams({
        supplierId: String(payment!.supplierId),
        date: payment!.date,
        time: payment!.time || "00:00",
        excludePaymentId: String(paymentId),
      });
      const res = await fetch(`/api/supplier-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!payment?.supplierId && !!payment?.date && open,
  });

  const fieldColor = companyProfile?.primaryColor || "#333";
  const textColor = companyProfile?.secondaryColor || "white";
  const supplier = clients?.find(c => c.id === payment?.supplierId);

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const lang = i18n.language;
  const isRtlLang = lang === "ar" || lang === "ckb";

  const amountUsd = parseFloat(payment?.amountUsd || "0");
  const amountIqd = parseFloat(payment?.amountIqd || "0");
  const commUsd = parseFloat(payment?.commissionUsd || "0");
  const commIqd = parseFloat(payment?.commissionIqd || "0");
  const netUsd = amountUsd - commUsd;
  const netIqd = amountIqd - commIqd;

  const receiptTitle = currency === "USD"
    ? t("Supplier Payment Receipt - USD")
    : t("Supplier Payment Receipt - IQD");

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
        <title>${t("Supplier Payment Receipt")} - ${payment?.supplierName || ""}</title>
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
    if (payment) {
      logExport({ reportName: t("Supplier Payment Receipt"), supplierName: payment.supplierName, invoiceNumber: `PAY-${payment.id}`, exportType: "print", currency });
    }
  };

  const generatePdf = async (): Promise<Blob | null> => {
    const content = printRef.current;
    if (!content) return null;
    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    return pdf.output("blob");
  };

  const handleWhatsApp = async () => {
    if (!payment) return;
    setSendingWhatsApp(true);
    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;
      const fileName = `${t("Supplier Payment Receipt")}_${payment.supplierName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${t("Supplier Payment Receipt")} - ${payment.supplierName}`, files: [file] });
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
          `${receiptTitle}\n${t("Supplier Name")}: ${payment.supplierName}\n${t("Payment Source")}: ${payment.paymentSourceName}\n${t("Amount")}: ${mainAmount}\n${t("Date")}: ${formatDate(payment.date)}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      logExport({ reportName: t("Supplier Payment Receipt"), supplierName: payment.supplierName, invoiceNumber: `PAY-${payment.id}`, exportType: "whatsapp", currency });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const renderRow = (label: string, value: string, bold?: boolean, color?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", fontSize: "12pt" }}>
      <span style={{ fontWeight: 700, color: "#555" }}>{label}:</span>
      <span style={{ fontWeight: 700, color: color || "inherit", fontFamily: "monospace" }}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("Supplier Payment Receipt")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading || sendingWhatsApp} data-testid="button-whatsapp-payment" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} data-testid="button-print-payment">
                <Printer className="w-4 h-4 mr-1" />
                {t("Print")}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : payment ? (
          <div ref={printRef}>
            {companyProfile?.cliche && (
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", height: 170, objectFit: "cover" }} />
              </div>
            )}

            <div style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #333", paddingBottom: 10 }}>
              <h1 style={{ fontSize: "16pt", marginBottom: 3 }}>{receiptTitle}</h1>
              <p style={{ fontSize: "12pt", color: "#666", fontWeight: 700 }}>
                {t("Date")}: {formatDate(payment.date)} | {t("Time")}: {payment.time}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 16, fontSize: "12pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0" }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{t("Supplier Name")}:</span>
                <span style={{ fontWeight: 700, flex: 1, textAlign: "center" }}>{payment.supplierName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0" }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{t("Note")}:</span>
                <span style={{ fontWeight: 700, flex: 1, textAlign: "center" }}>{payment.note || "-"}</span>
              </div>
              {payment.reference && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>{t("Reference")}:</span>
                  <span style={{ fontWeight: 700 }}>{payment.reference}</span>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 16 }}>
              {amountUsd > 0 && (
                <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
                  <h3 style={{ fontSize: "13pt", marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 5, fontWeight: 700, color: fieldColor }}>
                    {t("Payment Amount (USD)")}
                  </h3>
                  {renderRow(t("Amount"), `$${fmt(amountUsd)}`)}
                  <p style={{ fontSize: "9pt", color: "#666", fontStyle: "italic", margin: "2px 0 6px" }}>
                    {numberToWords(amountUsd, i18n.language, t("Dollar"))}
                  </p>
                  {commUsd > 0 && renderRow(t("Commission"), `-$${fmt(commUsd)}`, false, "#dc2626")}
                  {commUsd > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: "14pt", fontWeight: 700, borderTop: "2px solid #333", marginTop: 5 }}>
                      <span>{t("Net Amount")}:</span>
                      <span style={{ fontFamily: "monospace", color: "#16a34a" }}>${fmt(netUsd)}</span>
                    </div>
                  )}
                </div>
              )}
              {amountIqd > 0 && (
                <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
                  <h3 style={{ fontSize: "13pt", marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 5, fontWeight: 700, color: fieldColor }}>
                    {t("Payment Amount (IQD)")}
                  </h3>
                  {renderRow(t("Amount"), `${fmt(amountIqd)} IQD`)}
                  <p style={{ fontSize: "9pt", color: "#666", fontStyle: "italic", margin: "2px 0 6px" }}>
                    {numberToWords(amountIqd, i18n.language, t("Dinar"))}
                  </p>
                  {commIqd > 0 && renderRow(t("Commission"), `-${fmt(commIqd)} IQD`, false, "#dc2626")}
                  {commIqd > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", fontSize: "14pt", fontWeight: 700, borderTop: "2px solid #333", marginTop: 5 }}>
                      <span>{t("Net Amount")}:</span>
                      <span style={{ fontFamily: "monospace", color: "#16a34a" }}>{fmt(netIqd)} IQD</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ border: `2px solid ${fieldColor}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <h3 style={{ color: fieldColor, fontSize: "13pt", marginBottom: 8, fontWeight: 700 }}>{t("Supplier Balance")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {currency === "USD" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{t("Opening Balance")}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>${fmt(openingBalance?.openingBalanceUsd ?? 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{t("Payment")}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>-${fmt(amountUsd)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14pt", color: "#dc2626", fontWeight: 800, borderTop: `2px solid ${fieldColor}`, marginTop: 4, paddingTop: 8, direction: isRtl ? "rtl" : "ltr" }}>
                      <span>{t("Total Balance")}:</span>
                      <span style={{ fontFamily: "monospace" }}>${fmt((openingBalance?.openingBalanceUsd ?? 0) - amountUsd)}</span>
                    </div>
                  </>
                )}
                {currency === "IQD" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{t("Opening Balance")}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{fmt(openingBalance?.openingBalanceIqd ?? 0)} IQD</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                      <span style={{ fontWeight: 700 }}>{t("Payment")}:</span>
                      <span style={{ fontWeight: 700, fontFamily: "monospace" }}>-{fmt(amountIqd)} IQD</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14pt", color: "#dc2626", fontWeight: 800, borderTop: `2px solid ${fieldColor}`, marginTop: 4, paddingTop: 8, direction: isRtl ? "rtl" : "ltr" }}>
                      <span>{t("Total Balance")}:</span>
                      <span style={{ fontFamily: "monospace" }}>{fmt((openingBalance?.openingBalanceIqd ?? 0) - amountIqd)} IQD</span>
                    </div>
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
