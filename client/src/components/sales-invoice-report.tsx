import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Printer, MessageCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import i18n from "@/lib/i18n";
import { useUnits } from "@/hooks/use-units";
import { resolveUnitName, getProductNameByLang } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { getModernPrintStyles } from "@/lib/print-styles";
import { logExport } from "@/lib/export-log";

type InvoiceData = {
  id: number;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId: number | null;
  customerName: string;
  address: string | null;
  mobile: string | null;
  representativeId: number | null;
  representativeName: string | null;
  representativeMobile: string | null;
  note: string | null;
  invoiceType: string;
  subtotal: string;
  discount: string;
  amountPaid: string;
  remaining: string;
  totalItems: number;
  totalQuantity: string;
  currency: string;
  status: string;
  driverName: string | null;
  driverMobile: string | null;
  vehicleNumber: string | null;
};

type InvoiceItemData = {
  id: number;
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
};

type ProductData = {
  id: number;
  name: string;
  nameEn: string;
};

type ClientData = {
  id: number;
  name: string;
  mobile: string | null;
  oldDebtUsd: string;
  oldDebtIqd: string;
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

interface SalesInvoiceReportProps {
  invoiceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: "USD" | "IQD";
}

export default function SalesInvoiceReport({ invoiceId, open, onOpenChange, currency }: SalesInvoiceReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const { data: invoice, isLoading: invoiceLoading } = useQuery<InvoiceData>({
    queryKey: ["/api/sales-invoices", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/sales-invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
    enabled: !!invoiceId && open,
  });

  const { data: items, isLoading: itemsLoading } = useQuery<InvoiceItemData[]>({
    queryKey: ["/api/sales-invoices", invoiceId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/sales-invoices/${invoiceId}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!invoiceId && open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!invoice?.customerId && open,
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
    enabled: open,
  });

  const { data: units } = useUnits();
  const unitsList = units || [];

  const { data: allProducts } = useQuery<ProductData[]>({
    queryKey: ["/api/products"],
    enabled: open,
  });

  const resolveProductName = (item: InvoiceItemData) => {
    if (item.productId && allProducts) {
      const product = allProducts.find(p => p.id === item.productId);
      if (product) {
        return getProductNameByLang(product.name, product.nameEn);
      }
    }
    return item.productName;
  };

  const fieldColor = companyProfile?.primaryColor || "#333";
  const textColor = companyProfile?.secondaryColor || "white";

  const customer = clients?.find(c => c.id === invoice?.customerId);
  const oldDebt = currency === "USD"
    ? parseFloat(customer?.oldDebtUsd || "0")
    : parseFloat(customer?.oldDebtIqd || "0");

  const invoiceRemaining = parseFloat(invoice?.remaining || "0");
  const totalBalance = oldDebt + invoiceRemaining;

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const lang = i18n.language;
  const isRtlLang = lang === "ar" || lang === "ckb";
  const currencyPrefix = currency === "USD" ? (isRtlLang ? "" : "$") : "";
  const currencySuffix = currency === "USD" ? (isRtlLang ? "$" : "") : " IQD";

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
        <title>${t("Sales Invoice Report")} - ${invoice?.invoiceNumber || ""}</title>
        <style>
          ${printStyles}
          .cliche-container { text-align: center; margin-bottom: 12px; }
          .cliche-container img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; }
          table { font-size: 10pt; }
          th { font-size: 9.5pt; }
          td { font-size: 10pt; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
    if (invoice) {
      logExport({ reportName: t("Sales Invoice Report"), supplierName: invoice.customerName, invoiceNumber: invoice.invoiceNumber, exportType: "print", currency });
    }
  };

  const generatePdf = async (): Promise<Blob | null> => {
    const content = printRef.current;
    if (!content) return null;

    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    return pdf.output("blob");
  };

  const handleWhatsApp = async () => {
    if (!invoice) return;
    setSendingWhatsApp(true);

    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;

      const fileName = `${t("Sales Invoice Report")}_${invoice.invoiceNumber}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${t("Sales Invoice Report")} - ${invoice.invoiceNumber}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        const phone = (invoice.mobile || customer?.mobile || "").replace(/[^0-9]/g, "");
        const text = encodeURIComponent(
          `${currency === "USD" ? t("Sales Invoice - USD") : t("Sales Invoice - IQD")}\n${t("Invoice #")}: ${invoice.invoiceNumber}\n${t("Customer Name")}: ${invoice.customerName}\n${t("Total Balance")}: ${currencyPrefix}${fmt(totalBalance)}${currencySuffix}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      if (invoice) {
        logExport({ reportName: t("Sales Invoice Report"), supplierName: invoice.customerName, invoiceNumber: invoice.invoiceNumber, exportType: "whatsapp", currency });
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const isLoading = invoiceLoading || itemsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("Sales Invoice Report")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading || sendingWhatsApp} data-testid="button-whatsapp-sales-invoice" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} data-testid="button-print-sales-invoice">
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
        ) : invoice ? (
          <div ref={printRef}>
            {companyProfile?.cliche && (
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", height: 170, objectFit: "cover" }} />
              </div>
            )}
            <div className="header" style={{ textAlign: "center", marginBottom: 15, borderBottom: `2px solid ${fieldColor}`, paddingBottom: 10 }}>
              <h1 style={{ fontSize: "16pt", marginBottom: 6 }}>
                {currency === "USD" ? t("Sales Invoice - USD") : t("Sales Invoice - IQD")}
              </h1>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: "12pt", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={fieldColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 10h8"/><path d="M8 14h4"/></svg>
                  {t("Invoice #")}: {invoice.invoiceNumber}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={fieldColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {t("Date")}: {formatDate(invoice.date)}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={fieldColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {t("Time")}: {invoice.time}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", marginBottom: 12, fontSize: "12pt", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span style={{ fontWeight: 700, color: "#64748b" }}>{t("Customer Name")}:</span>
                <span style={{ fontWeight: 700, marginLeft: "auto", color: "#1e293b", fontSize: "13pt" }}>{invoice.customerName}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <span style={{ fontWeight: 700, color: "#64748b" }}>{t("Invoice Type")}:</span>
                <span style={{ fontWeight: 700, marginLeft: "auto", color: invoice.invoiceType === "cash" ? "#16a34a" : fieldColor, background: invoice.invoiceType === "cash" ? "#f0fdf4" : "#fef2f2", padding: "2px 10px", borderRadius: 4, fontSize: "12pt" }}>{invoice.invoiceType === "cash" ? t("Cash") : t("Credit")}</span>
              </div>
              {invoice.mobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>{t("Mobile")}:</span>
                  <span style={{ fontWeight: 700, marginLeft: "auto", fontFamily: "monospace", color: "#1e293b", fontSize: "13pt" }}>{invoice.mobile}</span>
                </div>
              )}
              {invoice.address && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid #e2e8f0", borderRight: invoice.mobile ? "none" : "1px solid #e2e8f0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>{t("Address")}:</span>
                  <span style={{ fontWeight: 700, marginLeft: "auto", color: "#1e293b", fontSize: "13pt" }}>{invoice.address}</span>
                </div>
              )}
              {invoice.representativeName && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a1 1 0 0 1-1 1h-1"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>{t("Representative")}:</span>
                  <span style={{ fontWeight: 700, marginLeft: "auto", color: "#1e293b", fontSize: "13pt" }}>{invoice.representativeName}</span>
                </div>
              )}
              {invoice.representativeMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>{t("Rep. Mobile")}:</span>
                  <span style={{ fontWeight: 700, marginLeft: "auto", fontFamily: "monospace", color: "#1e293b", fontSize: "13pt" }}>{invoice.representativeMobile}</span>
                </div>
              )}
              {invoice.driverName && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: "10pt" }}>{t("Driver Name")}:</span>
                  <span style={{ fontWeight: 500, marginLeft: "auto", color: "#1e293b" }}>{invoice.driverName}</span>
                </div>
              )}
              {invoice.driverMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: "1px solid #e2e8f0" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: "10pt" }}>{t("Driver Mobile")}:</span>
                  <span style={{ fontWeight: 500, marginLeft: "auto", fontFamily: "monospace", color: "#1e293b" }}>{invoice.driverMobile}</span>
                </div>
              )}
              {invoice.vehicleNumber && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2"/><path d="M9 17H15"/><path d="M14 6h-4v5h9"/></svg>
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: "10pt" }}>{t("Vehicle Number")}:</span>
                  <span style={{ fontWeight: 500, marginLeft: "auto", fontFamily: "monospace", color: "#1e293b" }}>{invoice.vehicleNumber}</span>
                </div>
              )}
              {invoice.note && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: "1px solid #e2e8f0", gridColumn: "1 / -1" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: "10pt" }}>{t("Note")}:</span>
                  <span style={{ fontWeight: 500, marginLeft: "auto", color: "#1e293b" }}>{invoice.note}</span>
                </div>
              )}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "12pt" }}>
              <thead>
                <tr>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>#</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>{t("Product Code")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>{t("Product Name")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>{t("Quantity")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>{t("Unit")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>{t("Price")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 600, fontSize: "12pt" }}>{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "white" : "#f9f9f9" }}>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace" }}>{item.productCode}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: isRtl ? "right" : "left" }}>{resolveProductName(item)}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center" }}>{resolveUnitName(item.unit, unitsList)}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace" }}>{currencyPrefix}{fmt(item.price)}{currencySuffix}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>{currencyPrefix}{fmt(item.amount)}{currencySuffix}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 10 }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
                <h3 style={{ fontSize: "13pt", marginBottom: 5, borderBottom: "1px solid #e2e8f0", paddingBottom: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  {t("Invoice Summary")}
                </h3>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                  <span>{t("Products")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.totalItems}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                  <span>{t("Total Quantity")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.totalQuantity}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                  <span>{t("Invoice Total")}:</span>
                  <span style={{ fontWeight: 600 }}>{currencyPrefix}{fmt(invoice.subtotal)}{currencySuffix}</span>
                </div>
                {parseFloat(invoice.discount || "0") > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt", color: "#16a34a" }}>
                    <span>{t("Discount")}:</span>
                    <span style={{ fontWeight: 500 }}>-{currencyPrefix}{fmt(invoice.discount)}{currencySuffix}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt", color: "#16a34a" }}>
                  <span>{t("Amount Paid")}:</span>
                  <span style={{ fontWeight: 500 }}>{currencyPrefix}{fmt(invoice.amountPaid)}{currencySuffix}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px", fontSize: "14pt", fontWeight: 700, borderTop: `2px solid ${fieldColor}`, marginTop: 5, color: fieldColor }}>
                  <span>{t("Remaining")}:</span>
                  <span>{currencyPrefix}{fmt(invoice.remaining)}{currencySuffix}</span>
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 8, overflow: "hidden" }}>
                <h3 style={{ fontSize: "13pt", marginBottom: 5, borderBottom: "1px solid #e2e8f0", paddingBottom: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                  {t("Delivery Info")}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between", padding: "3px 0", fontSize: "12pt" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {t("Driver Name")}:
                  </span>
                  <span style={{ fontWeight: 500 }}>{invoice.driverName || "-"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between", padding: "3px 0", fontSize: "12pt" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {t("Driver Mobile")}:
                  </span>
                  <span style={{ fontWeight: 500, fontFamily: "monospace" }}>{invoice.driverMobile || "-"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between", padding: "3px 0", fontSize: "12pt" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a1 1 0 0 1-1 1h-1"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    {t("Vehicle Number")}:
                  </span>
                  <span style={{ fontWeight: 500, fontFamily: "monospace" }}>{invoice.vehicleNumber || "-"}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, border: `2px solid ${fieldColor}`, borderRadius: 6, padding: 8 }}>
              <h3 style={{ color: fieldColor, fontSize: "13pt", marginBottom: 5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fieldColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                {t("Customer Balance")}
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                <span>{t("Opening Balance")}:</span>
                <span style={{ fontWeight: 500 }}>{currencyPrefix}{fmt(oldDebt)}{currencySuffix}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                <span>{t("Invoice Remaining")}:</span>
                <span style={{ fontWeight: 500 }}>{currencyPrefix}{fmt(invoiceRemaining)}{currencySuffix}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px", fontSize: "14pt", fontWeight: 700, color: fieldColor, borderTop: `2px solid ${fieldColor}`, marginTop: 5 }}>
                <span>{t("Total Balance")}:</span>
                <span>{currencyPrefix}{fmt(totalBalance)}{currencySuffix}</span>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: "12pt" }}>
              <div style={{ textAlign: "center", width: 200 }}>
                <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Customer Signature")}</div>
              </div>
              <div style={{ textAlign: "center", width: 200 }}>
                <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Accountant")}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
