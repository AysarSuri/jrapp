import { useRef, useState, useEffect } from "react";
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
import QRCode from "qrcode";
import type { CustomerReceipt } from "@shared/schema";

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

type ClientData = {
  id: number;
  name: string;
  mobile: string | null;
};

interface CustomerReceiptReportProps {
  receipt: CustomerReceipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerReceiptReport({ receipt, open, onOpenChange }: CustomerReceiptReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const { data: user } = useUser();

  const currency = receipt?.currency || "USD";

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!receipt?.customerId && open,
  });

  const { data: openingBalance, isLoading: balanceLoading } = useQuery<{ openingBalance: number }>({
    queryKey: ["/api/customer-opening-balance", receipt?.customerId, receipt?.date, receipt?.time, receipt?.id, currency],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: String(receipt!.customerId),
        date: receipt!.date,
        time: receipt!.time || "00:00",
        currency,
      });
      const res = await fetch(`/api/customer-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!receipt?.customerId && !!receipt?.date && open,
    staleTime: 0,
  });

  useEffect(() => {
    const qrText = companyProfile?.qrAddress;
    if (qrText && open) {
      QRCode.toDataURL(qrText, { width: 100, margin: 1, color: { dark: "#1e293b", light: "#ffffff" } })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(""));
    } else {
      setQrDataUrl("");
    }
  }, [companyProfile?.qrAddress, open]);

  const primaryColor = companyProfile?.primaryColor || "#1e293b";
  const customer = clients?.find(c => c.id === receipt?.customerId);

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const amount = parseFloat(receipt?.amount || "0");
  const discount = parseFloat(receipt?.discount || "0");
  const totalDeducted = amount + discount;
  const currencyLabel = currency === "USD" ? "$" : " IQD";
  const currencyWord = currency === "USD" ? t("Dollar") : t("Dinar");

  const receiptTitle = currency === "USD"
    ? t("Customer Receipt - USD")
    : t("Customer Receipt - IQD");

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
        <title>${receiptTitle} - ${receipt?.customerName || ""}</title>
        <style>
          ${printStyles}
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    const doPrintFn = () => printWindow.print();
    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200));
    } else {
      setTimeout(doPrintFn, 800);
    }
    if (receipt) {
      logExport({ reportName: receiptTitle, supplierName: receipt.customerName, invoiceNumber: receipt.receiptNumber || `REC-${receipt.id}`, exportType: "print", currency });
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
    if (!receipt) return;
    setSendingWhatsApp(true);
    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;
      const fileName = `${receiptTitle}_${receipt.customerName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${receiptTitle} - ${receipt.customerName}`, files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        const phone = customer?.mobile ? customer.mobile.replace(/[^0-9]/g, "") : "";
        const mainAmount = currency === "USD" ? `$${fmt(amount)}` : `${fmt(amount)} IQD`;
        const text = encodeURIComponent(
          `${receiptTitle}\n${t("Customer Name")}: ${receipt.customerName}\n${t("Payment Source")}: ${receipt.paymentSourceName}\n${t("Amount")}: ${mainAmount}\n${t("Date")}: ${formatDate(receipt.date)}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      logExport({ reportName: receiptTitle, supplierName: receipt.customerName, invoiceNumber: receipt.receiptNumber || `REC-${receipt.id}`, exportType: "whatsapp", currency });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const fmtCurrency = (val: number) => {
    if (currency === "USD") return `$${fmt(val)}`;
    return `${fmt(val)} IQD`;
  };

  const closingBalance = (openingBalance?.openingBalance ?? 0) - totalDeducted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{receiptTitle}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={!receipt || sendingWhatsApp} data-testid="button-whatsapp-receipt" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-5 h-5 mr-1 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!receipt} data-testid="button-print-receipt">
                <Printer className="w-5 h-5 mr-1" />
                {t("Print")}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!receipt ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div ref={printRef} style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", direction: isRtl ? "rtl" : "ltr" }}>
            {companyProfile?.cliche && (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8 }} />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: `3px solid ${primaryColor}`, direction: "ltr" }}>
              {qrDataUrl && (
                <div style={{ flexShrink: 0, marginRight: 16, order: isRtl ? -1 : 1 }}>
                  <img src={qrDataUrl} alt="QR" style={{ width: 80, height: 80, borderRadius: 6, border: "1px solid #e2e8f0" }} />
                </div>
              )}

              <div style={{ flex: 1, textAlign: "center", order: 0 }}>
                <div style={{ background: primaryColor, color: "#fff", padding: "10px 24px", borderRadius: 8, display: "inline-block", marginBottom: 8 }}>
                  <h1 style={{ fontSize: "16pt", margin: 0, fontWeight: 800, letterSpacing: "0.5px" }}>{receiptTitle}</h1>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: "11pt", color: "#555", fontWeight: 600 }}>
                  <span>{t("Receipt #")}: <strong style={{ color: primaryColor }}>{receipt.receiptNumber || "-"}</strong></span>
                  <span>{t("Date")}: <strong>{formatDate(receipt.date)}</strong></span>
                  <span>{t("Time")}: <strong>{receipt.time}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderRight: isRtl ? "none" : "1px solid #e2e8f0", borderLeft: isRtl ? "1px solid #e2e8f0" : "none" }}>
                <div style={{ fontSize: "9pt", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{t("Customer Name")}</div>
                <div style={{ fontSize: "12pt", fontWeight: 700, color: "#1e293b" }}>{receipt.customerName}</div>
              </div>
              <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "9pt", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{t("Payment Source")}</div>
                <div style={{ fontSize: "12pt", fontWeight: 700, color: "#1e293b" }}>{receipt.paymentSourceName}</div>
              </div>
              {receipt.reference && (
                <div style={{ padding: "10px 14px", background: "#fff", borderBottom: receipt.note ? "1px solid #e2e8f0" : "none", borderRight: isRtl ? "none" : "1px solid #e2e8f0", borderLeft: isRtl ? "1px solid #e2e8f0" : "none" }}>
                  <div style={{ fontSize: "9pt", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{t("Reference")}</div>
                  <div style={{ fontSize: "11pt", fontWeight: 600, color: "#475569" }}>{receipt.reference}</div>
                </div>
              )}
              {receipt.note && (
                <div style={{ padding: "10px 14px", background: "#fff", gridColumn: receipt.reference ? "auto" : "1 / -1" }}>
                  <div style={{ fontSize: "9pt", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{t("Note")}</div>
                  <div style={{ fontSize: "11pt", fontWeight: 600, color: "#475569" }}>{receipt.note}</div>
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: primaryColor, color: "#fff", padding: "8px 14px", fontSize: "11pt", fontWeight: 700 }}>
                {t("Receipt Details")}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "11pt", fontWeight: 600, color: "#64748b" }}>{t("Amount")}</span>
                  <span style={{ fontSize: "14pt", fontWeight: 800, color: "#1e293b", fontFamily: "monospace" }}>{fmtCurrency(amount)}</span>
                </div>
                {amount > 0 && (
                  <div style={{ fontSize: "9pt", color: "#94a3b8", fontStyle: "italic", padding: "4px 0 6px", borderBottom: discount > 0 ? "1px solid #f1f5f9" : "none" }}>
                    {numberToWords(amount, i18n.language, currencyWord)}
                  </div>
                )}
                {discount > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "11pt", fontWeight: 600, color: "#16a34a" }}>{t("Discount")}</span>
                      <span style={{ fontSize: "13pt", fontWeight: 700, color: "#16a34a", fontFamily: "monospace" }}>{fmtCurrency(discount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 4px", borderTop: `2px solid ${primaryColor}`, marginTop: 6 }}>
                      <span style={{ fontSize: "13pt", fontWeight: 800, color: primaryColor }}>{t("Total Deducted")}</span>
                      <span style={{ fontSize: "16pt", fontWeight: 800, color: primaryColor, fontFamily: "monospace" }}>{fmtCurrency(totalDeducted)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ border: `2px solid ${primaryColor}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ background: primaryColor, color: "#fff", padding: "8px 14px", fontSize: "11pt", fontWeight: 700 }}>
                {t("Customer Balance")}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9", direction: isRtl ? "rtl" : "ltr" }}>
                  <span style={{ fontSize: "11pt", fontWeight: 600, color: "#64748b" }}>{t("Opening Balance")}</span>
                  <span style={{ fontSize: "12pt", fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>
                    {balanceLoading ? "..." : fmtCurrency(openingBalance?.openingBalance ?? 0)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9", direction: isRtl ? "rtl" : "ltr" }}>
                  <span style={{ fontSize: "11pt", fontWeight: 600, color: "#16a34a" }}>{t("Receipt")}</span>
                  <span style={{ fontSize: "12pt", fontWeight: 700, fontFamily: "monospace", color: "#16a34a" }}>-{fmtCurrency(totalDeducted)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 4px", borderTop: `2px solid ${primaryColor}`, marginTop: 6, direction: isRtl ? "rtl" : "ltr" }}>
                  <span style={{ fontSize: "13pt", fontWeight: 800, color: closingBalance > 0 ? "#dc2626" : "#16a34a" }}>{t("Total Balance")}</span>
                  <span style={{ fontSize: "16pt", fontWeight: 800, fontFamily: "monospace", color: closingBalance > 0 ? "#dc2626" : "#16a34a" }}>
                    {balanceLoading ? "..." : fmtCurrency(closingBalance)}
                  </span>
                </div>
                {!balanceLoading && closingBalance !== 0 && (
                  <div style={{ fontSize: "10pt", fontWeight: 700, color: closingBalance > 0 ? "#dc2626" : "#16a34a", textAlign: isRtl ? "right" : "left", marginTop: 6, padding: "6px 10px", background: closingBalance > 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 6, direction: isRtl ? "rtl" : "ltr" }}>
                    {t("Remaining with")} {closingBalance > 0 ? receipt.customerName : (companyProfile?.name || "")}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24, paddingTop: 12 }}>
              <div style={{ textAlign: "center", width: 200 }}>
                <div style={{ borderTop: `2px solid ${primaryColor}`, marginTop: 50, paddingTop: 6, fontSize: "10pt", fontWeight: 700, color: "#64748b" }}>{t("Customer Signature")}</div>
              </div>
              <div style={{ textAlign: "center", width: 200 }}>
                {companyProfile?.stamp && (
                  <img src={companyProfile.stamp} alt="Stamp" style={{ maxWidth: 110, maxHeight: 110, objectFit: "contain", margin: "0 auto 5px" }} />
                )}
                <div style={{ fontWeight: 700, fontSize: "11pt", color: "#1e293b", marginBottom: 4 }}>{user?.fullName || ""}</div>
                <div style={{ borderTop: `2px solid ${primaryColor}`, paddingTop: 6, fontSize: "10pt", fontWeight: 700, color: "#64748b" }}>{t("Accountant")}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}