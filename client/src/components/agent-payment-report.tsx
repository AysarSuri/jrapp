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
import type { AgentPayment } from "@shared/schema";

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

interface AgentPaymentReportProps {
  payment: AgentPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AgentPaymentReport({ payment, open, onOpenChange }: AgentPaymentReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const { data: user } = useUser();

  const currency = payment?.currency || "USD";

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!payment?.agentId && open,
  });

  const { data: openingBalance, isLoading: balanceLoading } = useQuery<{ openingBalance: number }>({
    queryKey: ["/api/customer-opening-balance", payment?.agentId, payment?.date, payment?.time, payment?.id, currency],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: String(payment!.agentId),
        date: payment!.date,
        time: payment!.time || "00:00",
        currency,
      });
      const res = await fetch(`/api/customer-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!payment?.agentId && !!payment?.date && open,
    staleTime: 0,
  });

  const fieldColor = companyProfile?.primaryColor || "#333";
  const customer = clients?.find(c => c.id === payment?.agentId);

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const amount = parseFloat(payment?.amount || "0");
  const currencyWord = currency === "USD" ? t("Dollar") : t("Dinar");

  const receiptTitle = currency === "USD"
    ? t("Agent Payment Receipt - USD")
    : t("Agent Payment Receipt - IQD");

  const fmtCurrency = (val: number) => {
    if (currency === "USD") return `$${fmt(val)}`;
    return `${fmt(val)} IQD`;
  };

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
        <title>${receiptTitle} - ${payment?.agentName || ""}</title>
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
    const doPrintFn = () => printWindow.print();
    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200));
    } else {
      setTimeout(doPrintFn, 800);
    }
    if (payment) {
      logExport({ reportName: receiptTitle, supplierName: payment.agentName, invoiceNumber: payment.paymentNumber || `PAY-${payment.id}`, exportType: "print", currency });
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
      const fileName = `${receiptTitle}_${payment.agentName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${receiptTitle} - ${payment.agentName}`, files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        const phone = customer?.mobile ? customer.mobile.replace(/[^0-9]/g, "") : "";
        const mainAmount = fmtCurrency(amount);
        const text = encodeURIComponent(
          `${receiptTitle}\n${t("Customer Name")}: ${payment.agentName}\n${t("Payment Source")}: ${payment.paymentSourceName}\n${t("Amount")}: ${mainAmount}\n${t("Date")}: ${formatDate(payment.date)}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      logExport({ reportName: receiptTitle, supplierName: payment.agentName, invoiceNumber: payment.paymentNumber || `PAY-${payment.id}`, exportType: "whatsapp", currency });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const renderRow = (label: string, value: string, bold?: boolean, color?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", fontSize: "12pt" }}>
      <span style={{ fontWeight: 700, color: "#555" }}>{label}:</span>
      <span style={{ fontWeight: bold ? 800 : 700, color: color || "inherit", fontFamily: "monospace" }}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{receiptTitle}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={!payment || sendingWhatsApp} data-testid="button-whatsapp-agent-payment" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-5 h-5 mr-1 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!payment} data-testid="button-print-agent-payment">
                <Printer className="w-5 h-5 mr-1" />
                {t("Print")}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!payment ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div ref={printRef}>
            {companyProfile?.cliche && (
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", height: 170, objectFit: "cover" }} />
              </div>
            )}

            <div style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #333", paddingBottom: 10 }}>
              <h1 style={{ fontSize: "16pt", marginBottom: 3 }}>{receiptTitle}</h1>
              <p style={{ fontSize: "11pt", color: "#666", fontWeight: 700 }}>
                {t("Payment #")}: {payment.paymentNumber || "-"}
              </p>
              <p style={{ fontSize: "12pt", color: "#666", fontWeight: 700 }}>
                {t("Date")}: {formatDate(payment.date)} | {t("Time")}: {payment.time}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 16, fontSize: "12pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0" }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{t("Customer Name")}:</span>
                <span style={{ fontWeight: 700, flex: 1, textAlign: "center" }}>{payment.agentName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0" }}>
                <span style={{ fontWeight: 700, color: "#555" }}>{t("Payment Source")}:</span>
                <span style={{ fontWeight: 700, flex: 1, textAlign: "center" }}>{payment.paymentSourceName}</span>
              </div>
              {payment.note && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>{t("Note")}:</span>
                  <span style={{ fontWeight: 700 }}>{payment.note}</span>
                </div>
              )}
              {payment.reference && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "6px 0", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>{t("Reference")}:</span>
                  <span style={{ fontWeight: 700 }}>{payment.reference}</span>
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: "13pt", marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 5, fontWeight: 700, color: fieldColor }}>
                {t("Payment Details")}
              </h3>
              {renderRow(t("Amount"), fmtCurrency(amount))}
              {amount > 0 && (
                <p style={{ fontSize: "9pt", color: "#666", fontStyle: "italic", margin: "2px 0 6px" }}>
                  {numberToWords(amount, i18n.language, currencyWord)}
                </p>
              )}
            </div>

            <div style={{ border: `2px solid ${fieldColor}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <h3 style={{ color: fieldColor, fontSize: "13pt", marginBottom: 8, fontWeight: 700 }}>{t("Customer Balance")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", direction: isRtl ? "rtl" : "ltr" }}>
                  <span style={{ fontWeight: 700 }}>{t("Opening Balance")}:</span>
                  <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                    {balanceLoading ? "..." : fmtCurrency(openingBalance?.openingBalance ?? 0)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12pt", color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                  <span style={{ fontWeight: 700 }}>{t("Payment")}:</span>
                  <span style={{ fontWeight: 700, fontFamily: "monospace" }}>-{fmtCurrency(amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14pt", color: "#dc2626", fontWeight: 800, borderTop: `2px solid ${fieldColor}`, marginTop: 4, paddingTop: 8, direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Total Balance")}:</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {balanceLoading ? "..." : fmtCurrency((openingBalance?.openingBalance ?? 0) - amount)}
                  </span>
                </div>
                {!balanceLoading && ((openingBalance?.openingBalance ?? 0) - amount) !== 0 && (
                  <div style={{ fontSize: "10pt", fontWeight: 700, color: ((openingBalance?.openingBalance ?? 0) - amount) > 0 ? "#dc2626" : "#16a34a", textAlign: isRtl ? "right" : "left", marginTop: 4, direction: isRtl ? "rtl" : "ltr" }}>
                    {t("Remaining with")} {((openingBalance?.openingBalance ?? 0) - amount) > 0 ? payment.agentName : (companyProfile?.name || "")}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: "12pt" }}>
              <div style={{ textAlign: "center", width: 200 }}>
                <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Customer Signature")}</div>
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
        )}
      </DialogContent>
    </Dialog>
  );
}