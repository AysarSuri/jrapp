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
  supplierId: number | null;
  supplierName: string;
  address: string | null;
  note: string | null;
  customsClearance: string | null;
  carNumber: string | null;
  manifest: string | null;
  invoiceType: string;
  carExpense: string;
  customsExpense: string;
  otherExpenses: string;
  totalExpenses: string;
  subtotal: string;
  discount: string;
  amountPaid: string;
  remaining: string;
  totalItems: number;
  totalQuantity: string;
  currency: string;
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
  gift: string;
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

interface PurchaseInvoiceReportProps {
  invoiceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: "USD" | "IQD";
}

export default function PurchaseInvoiceReport({ invoiceId, open, onOpenChange, currency }: PurchaseInvoiceReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const { data: invoice, isLoading: invoiceLoading } = useQuery<InvoiceData>({
    queryKey: ["/api/purchase-invoices", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
    enabled: !!invoiceId && open,
  });

  const { data: items, isLoading: itemsLoading } = useQuery<InvoiceItemData[]>({
    queryKey: ["/api/purchase-invoices", invoiceId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-invoices/${invoiceId}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!invoiceId && open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!invoice?.supplierId && open,
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

  const accentColor = companyProfile?.primaryColor || "#1e293b";
  const accentText = companyProfile?.secondaryColor || "#ffffff";

  const supplier = clients?.find(c => c.id === invoice?.supplierId);
  const oldDebt = currency === "USD"
    ? parseFloat(supplier?.oldDebtUsd || "0")
    : parseFloat(supplier?.oldDebtIqd || "0");

  const invoiceRemaining = parseFloat(invoice?.remaining || "0");
  const totalBalance = oldDebt + invoiceRemaining;

  const hasGifts = items?.some(item => parseFloat(item.gift || "0") > 0) || false;

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const lang = i18n.language;
  const isRtlLang = lang === "ar" || lang === "ckb";
  const currencyPrefix = currency === "USD" ? (isRtlLang ? "" : "$") : "";
  const currencySuffix = currency === "USD" ? (isRtlLang ? "$" : "") : " IQD";

  const fmtCurrency = (n: number | string) => `${currencyPrefix}${fmt(n)}${currencySuffix}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;
    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor, accentTextColor: accentText });
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Purchase Invoice Report")} - ${invoice?.invoiceNumber || ""}</title>
        <style>${printStyles}</style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
    if (invoice) {
      logExport({ reportName: t("Purchase Invoice Report"), supplierName: invoice.supplierName, invoiceNumber: invoice.invoiceNumber, exportType: "print", currency });
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

      const fileName = `${t("Purchase Invoice Report")}_${invoice.invoiceNumber}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${t("Purchase Invoice Report")} - ${invoice.invoiceNumber}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        const phone = supplier?.mobile ? supplier.mobile.replace(/[^0-9]/g, "") : "";
        const text = encodeURIComponent(
          `${currency === "USD" ? t("Purchase Invoice - USD") : t("Purchase Invoice - IQD")}\n${t("Invoice #")}: ${invoice.invoiceNumber}\n${t("Supplier Name")}: ${invoice.supplierName}\n${t("Total Balance")}: ${fmtCurrency(totalBalance)}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      if (invoice) {
        logExport({ reportName: t("Purchase Invoice Report"), supplierName: invoice.supplierName, invoiceNumber: invoice.invoiceNumber, exportType: "whatsapp", currency });
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const isLoading = invoiceLoading || itemsLoading;

  const subtotal = parseFloat(invoice?.subtotal || "0");
  const discount = parseFloat(invoice?.discount || "0");
  const amountPaid = parseFloat(invoice?.amountPaid || "0");
  const remaining = parseFloat(invoice?.remaining || "0");
  const totalExpenses = parseFloat(invoice?.totalExpenses || "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("Purchase Invoice Report")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading || sendingWhatsApp} data-testid="button-whatsapp-invoice" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} data-testid="button-print-invoice">
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
              <div className="cliche" style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 6 }} />
              </div>
            )}

            {!companyProfile?.cliche && companyProfile && (
              <div className="company-header" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
                marginBottom: 16, padding: "14px 20px",
                background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}15)`,
                border: `1px solid ${accentColor}20`, borderRadius: 12
              }}>
                {companyProfile.logo && (
                  <img src={companyProfile.logo} alt="" style={{ width: 70, height: 70, objectFit: "contain", borderRadius: 10 }} />
                )}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20pt", fontWeight: 800, color: accentColor, letterSpacing: "-0.5px" }}>{companyProfile.name}</div>
                  {companyProfile.address && <div style={{ fontSize: "9pt", color: "#64748b" }}>{companyProfile.address}</div>}
                </div>
              </div>
            )}

            <div className="report-banner" style={{
              display: "flex", justifyContent: isRtl ? "flex-end" : "flex-start", alignItems: "center",
              marginBottom: 16, padding: "16px 20px",
              border: `2px solid ${accentColor}30`, borderRadius: 12,
              background: `linear-gradient(135deg, ${accentColor}05, ${accentColor}10)`
            }}>
              <div style={{ textAlign: "left" }}>
                <h1 style={{ fontSize: "16pt", fontWeight: 800, color: accentColor, marginBottom: 4 }}>
                  {currency === "USD" ? t("Purchase Invoice - USD") : t("Purchase Invoice - IQD")}
                </h1>
                <div style={{ fontSize: "13pt", fontWeight: 700, color: "#333", marginBottom: 3 }}>
                  {invoice.supplierName}
                </div>
                <div style={{ fontSize: "9pt", color: "#666" }}>
                  {t("Invoice #")}: {invoice.invoiceNumber} &nbsp;|&nbsp; {formatDate(invoice.date)} &nbsp;|&nbsp; {invoice.time}
                </div>
              </div>
            </div>

            {(invoice.address || invoice.carNumber || invoice.manifest || invoice.note) && (
              <div className="info-grid" style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px",
                marginBottom: 14, fontSize: "10pt"
              }}>
                {invoice.address && (
                  <div className="info-item" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span className="info-label" style={{ fontWeight: 600, color: "#64748b", fontSize: "9pt" }}>{t("Address")}</span>
                    <span className="info-value" style={{ fontWeight: 500, color: "#1e293b" }}>{invoice.address}</span>
                  </div>
                )}
                {invoice.carNumber && (
                  <div className="info-item" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span className="info-label" style={{ fontWeight: 600, color: "#64748b", fontSize: "9pt" }}>{t("Car Number")}</span>
                    <span className="info-value" style={{ fontWeight: 500, color: "#1e293b" }}>{invoice.carNumber}</span>
                  </div>
                )}
                {invoice.manifest && (
                  <div className="info-item" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span className="info-label" style={{ fontWeight: 600, color: "#64748b", fontSize: "9pt" }}>{t("Manifest")}</span>
                    <span className="info-value" style={{ fontWeight: 500, color: "#1e293b" }}>{invoice.manifest}</span>
                  </div>
                )}
                {invoice.note && (
                  <div className="info-item" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9", gridColumn: "1 / -1" }}>
                    <span className="info-label" style={{ fontWeight: 600, color: "#64748b", fontSize: "9pt" }}>{t("Note")}</span>
                    <span className="info-value" style={{ fontWeight: 500, color: "#1e293b" }}>{invoice.note}</span>
                  </div>
                )}
              </div>
            )}

            <table style={{
              width: "100%", borderCollapse: "separate", borderSpacing: 0,
              fontSize: "9pt", borderRadius: 8, overflow: "hidden",
              border: "1px solid #e2e8f0", marginBottom: 14
            }}>
              <thead>
                <tr>
                  {[
                    "#",
                    t("Product Code"),
                    t("Product Name"),
                    t("Quantity"),
                    ...(hasGifts ? [t("Gift")] : []),
                    t("Unit"),
                    t("Price"),
                    t("Amount")
                  ].map((header, i, arr) => (
                    <th key={i} style={{
                      background: `linear-gradient(145deg, ${accentColor}, ${accentColor}ee)`,
                      color: accentText,
                      padding: "8px 6px", textAlign: "center", fontWeight: 600,
                      fontSize: "8.5pt", whiteSpace: "nowrap", letterSpacing: "0.2px",
                      ...(i === 0 ? { borderRadius: isRtl ? "0 8px 0 0" : "8px 0 0 0" } : {}),
                      ...(i === arr.length - 1 ? { borderRadius: isRtl ? "8px 0 0 0" : "0 8px 0 0" } : {})
                    }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items?.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "white" : "#f8fafc" }}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", color: "#94a3b8", fontSize: "8pt", fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", fontFamily: "monospace", color: "#334155" }}>{item.productCode}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: isRtl ? "right" : "left", fontWeight: 500, color: "#1e293b" }}>{resolveProductName(item)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", fontWeight: 600, color: "#334155" }}>{item.quantity}</td>
                    {hasGifts && (
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", fontWeight: 600, color: "#16a34a" }}>{parseFloat(item.gift || "0") > 0 ? item.gift : "-"}</td>
                    )}
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", color: "#64748b" }}>{resolveUnitName(item.unit, unitsList)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", fontFamily: "monospace", color: "#334155" }}>{fmtCurrency(item.price)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>{fmtCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="summary-section" style={{ marginTop: 14 }}>
              <div className="summary-box" style={{
                border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px",
                background: "linear-gradient(145deg, #fafbfc, #f1f5f9)"
              }}>
                <h3 style={{ fontSize: "10pt", fontWeight: 700, marginBottom: 6, paddingBottom: 4, borderBottom: `2px solid #e2e8f0`, color: accentColor }}>{t("Invoice Summary")}</h3>
                {totalExpenses > 0 && (
                  <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "9.5pt", color: "#334155" }}>
                    <span>{t("Total Expenses")}:</span>
                    <span style={{ fontWeight: 600 }}>{fmtCurrency(invoice.totalExpenses)}</span>
                  </div>
                )}
                <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "9.5pt", color: "#334155" }}>
                  <span>{t("Invoice Total")}:</span>
                  <span style={{ fontWeight: 700, color: "#2563eb" }}>{fmtCurrency(subtotal)}</span>
                </div>
                <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "9.5pt", color: "#16a34a" }}>
                  <span>{t("Amount Paid")}:</span>
                  <span style={{ fontWeight: 600 }}>{fmtCurrency(amountPaid)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "9.5pt", color: "#d97706" }}>
                    <span>{t("Discount")}:</span>
                    <span style={{ fontWeight: 600 }}>-{fmtCurrency(discount)}</span>
                  </div>
                )}
                <div className="summary-row total" style={{
                  display: "flex", justifyContent: "space-between",
                  fontWeight: 800, fontSize: "11pt",
                  borderTop: `2px solid ${accentColor}`, paddingTop: 6, marginTop: 6, color: "#dc2626"
                }}>
                  <span>{t("Remaining")}:</span>
                  <span>{fmtCurrency(remaining)}</span>
                </div>
              </div>
            </div>

            <div className="debt-section" style={{
              marginTop: 14, border: "2px solid #ef4444", borderRadius: 10,
              padding: "10px 14px", background: "linear-gradient(145deg, #fef2f2, #fff5f5)"
            }}>
              <h3 style={{ color: "#dc2626", fontSize: "10pt", fontWeight: 700, marginBottom: 6 }}>{t("Supplier Balance")}</h3>
              <div className="debt-row" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "9.5pt" }}>
                <span>{t("Opening Balance")}:</span>
                <span style={{ fontWeight: 600 }}>{fmtCurrency(oldDebt)}</span>
              </div>
              <div className="debt-row" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "9.5pt" }}>
                <span>{t("Invoice Remaining")}:</span>
                <span style={{ fontWeight: 600 }}>{fmtCurrency(invoiceRemaining)}</span>
              </div>
              <div className="debt-row final" style={{
                display: "flex", justifyContent: "space-between",
                fontWeight: 800, fontSize: "12pt", color: "#dc2626",
                borderTop: "2px solid #dc2626", paddingTop: 6, marginTop: 6
              }}>
                <span>{t("Total Balance")}:</span>
                <span>{fmtCurrency(totalBalance)}</span>
              </div>
            </div>

            <div className="footer" style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontSize: "9pt" }}>
              <div className="signature-box" style={{ textAlign: "center", width: 180 }}>
                <div className="signature-line" style={{ borderTop: "1.5px solid #94a3b8", marginTop: 44, paddingTop: 4, fontWeight: 500, color: "#64748b" }}>{t("Supplier Signature")}</div>
              </div>
              {companyProfile?.stamp && (
                <div style={{ textAlign: "center" }}>
                  <img src={companyProfile.stamp} alt={t("Stamp")} style={{ width: 90, height: 90, objectFit: "contain", opacity: 0.8 }} />
                </div>
              )}
              <div className="signature-box" style={{ textAlign: "center", width: 180 }}>
                <div className="signature-line" style={{ borderTop: "1.5px solid #94a3b8", marginTop: 44, paddingTop: 4, fontWeight: 500, color: "#64748b" }}>{t("Accountant")}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
