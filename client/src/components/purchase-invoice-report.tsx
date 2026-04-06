import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Printer, MessageCircle } from "lucide-react";
import { captureElementAsPdf } from "@/lib/pdf-utils";
import i18n from "@/lib/i18n";
import { useUnits } from "@/hooks/use-units";
import { resolveUnitName, getProductNameByLang } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { numberToWords } from "@/lib/number-to-words";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";
import { logExport } from "@/lib/export-log";
import { useUser } from "@/hooks/use-auth";

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
  const { data: user } = useUser();

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

  const { data: openingBalanceData } = useQuery<{ openingBalanceUsd: number; openingBalanceIqd: number }>({
    queryKey: ["/api/purchase-invoices", invoiceId, "opening-balance"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-invoices/${invoiceId}/opening-balance`);
      if (!res.ok) throw new Error("Failed to fetch opening balance");
      return res.json();
    },
    enabled: !!invoiceId && open,
    staleTime: 0,
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
    ? (openingBalanceData?.openingBalanceUsd ?? 0)
    : (openingBalanceData?.openingBalanceIqd ?? 0);

  const invoiceRemaining = parseFloat(invoice?.remaining || "0");
  const totalBalance = oldDebt + invoiceRemaining;

  const hasGifts = items?.some(item => parseFloat(item.gift || "0") > 0) || false;
  const totalGifts = items?.reduce((sum, item) => sum + parseFloat(item.gift || "0"), 0) || 0;

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
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Purchase Invoice Report")} - ${invoice?.invoiceNumber || ""}</title>
        <style>${printStyles}</style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    const doPrint = () => printWindow.print();
    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(() => setTimeout(doPrint, 200));
    } else {
      setTimeout(doPrint, 800);
    }
    if (invoice) {
      logExport({ reportName: t("Purchase Invoice Report"), supplierName: invoice.supplierName, invoiceNumber: invoice.invoiceNumber, exportType: "print", currency });
    }
  };

  const generatePdf = async (): Promise<Blob | null> => {
    const content = printRef.current;
    if (!content) return null;
    return captureElementAsPdf(content);
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
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("Purchase Invoice Report")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading || sendingWhatsApp} data-testid="button-whatsapp-invoice" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-5 h-5 mr-1 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} data-testid="button-print-invoice">
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
        ) : invoice ? (
          <div ref={printRef} style={{ width: 794, minWidth: 794, fontFamily: "'Tajawal','Segoe UI',sans-serif" }}>
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
              display: "flex", justifyContent: "space-between", alignItems: "center",
              direction: "ltr",
              marginBottom: 16, padding: "10px 20px",
              border: `2px solid ${accentColor}30`, borderRadius: 12,
              background: `linear-gradient(135deg, ${accentColor}05, ${accentColor}10)`
            }}>
              <div style={{ textAlign: "left" }}>
                <h1 style={{ fontSize: "16pt", fontWeight: 800, color: accentColor, marginBottom: 0 }}>
                  {currency === "USD" ? t("Purchase Invoice - USD") : t("Purchase Invoice - IQD")}
                </h1>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11pt", fontWeight: 700, color: "#333", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, direction: isRtl ? "rtl" : "ltr" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12h4"/><path d="M10 16h4"/></svg>
                    {t("Invoice #")}: {invoice.invoiceNumber}
                  </span>
                  <span>|</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    {formatDate(invoice.date)}
                  </span>
                  <span>|</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {invoice.time}
                  </span>
                </div>
              </div>
            </div>

            {(invoice.address || invoice.carNumber || invoice.note) && (
              <div className="info-grid" style={{
                display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap",
                marginBottom: 10, fontSize: "12pt", fontWeight: 700, textAlign: "center"
              }}>
                {invoice.address && (
                  <div className="info-item" style={{ padding: "4px 0", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span className="info-label" style={{ fontWeight: 700, color: "#64748b" }}>{t("Address")}: </span>
                    <span className="info-value" style={{ fontWeight: 700, color: "#1e293b" }}>{invoice.address}</span>
                  </div>
                )}
                {invoice.carNumber && (
                  <div className="info-item" style={{ padding: "4px 0", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                    <span className="info-label" style={{ fontWeight: 700, color: "#64748b" }}>{t("Car Number")}: </span>
                    <span className="info-value" style={{ fontWeight: 700, color: "#1e293b", direction: "ltr", unicodeBidi: "embed" }}>{invoice.carNumber}</span>
                  </div>
                )}
                {invoice.note && (
                  <div className="info-item" style={{ padding: "4px 0" }}>
                    <span className="info-label" style={{ fontWeight: 700, color: "#64748b" }}>{t("Note")}: </span>
                    <span className="info-value" style={{ fontWeight: 700, color: "#1e293b" }}>{invoice.note}</span>
                  </div>
                )}
              </div>
            )}

            <table style={{
              width: "100%", borderCollapse: "separate", borderSpacing: 0,
              fontSize: "11pt", borderRadius: 8, overflow: "hidden",
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
                      padding: "8px 6px", textAlign: "center", fontWeight: 700,
                      fontSize: "10pt", whiteSpace: "nowrap", letterSpacing: "0.2px",
                      ...(i === 0 ? { borderRadius: isRtl ? "0 8px 0 0" : "8px 0 0 0" } : {}),
                      ...(i === arr.length - 1 ? { borderRadius: isRtl ? "8px 0 0 0" : "0 8px 0 0" } : {})
                    }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items?.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "white" : "#f8fafc" }}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>{item.productCode}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: isRtl ? "right" : "left", fontWeight: 700, color: "#1e293b" }}>{resolveProductName(item)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#334155" }}>{item.quantity}</td>
                    {hasGifts && (
                      <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{parseFloat(item.gift || "0") > 0 ? item.gift : "-"}</td>
                    )}
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>{resolveUnitName(item.unit, unitsList)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#334155" }}>{fmtCurrency(item.price)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 900, color: "#2563eb" }}>{fmtCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 14, marginTop: 14, direction: "ltr" }}>
              <div className="debt-section" style={{
                flex: 1, border: `2px solid ${accentColor}30`, borderRadius: 10,
                padding: "10px 14px", background: `linear-gradient(135deg, ${accentColor}05, ${accentColor}10)`,
                display: "flex", flexDirection: "column", justifyContent: "flex-end"
              }}>
                <h3 style={{ color: accentColor, fontSize: "12pt", fontWeight: 800, marginBottom: 8, textAlign: isRtl ? "right" : "left" }}>{t("Supplier Balance")}</h3>
                <div style={{ flex: 1 }}></div>
                <div className="debt-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Opening Balance")}:</span>
                  <span>{fmtCurrency(oldDebt)}</span>
                </div>
                <div className="debt-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Invoice Remaining")}:</span>
                  <span>{fmtCurrency(invoiceRemaining)}</span>
                </div>
                <div className="debt-row final" style={{
                  display: "flex", justifyContent: "space-between",
                  fontWeight: 800, fontSize: "14pt", color: accentColor, direction: isRtl ? "rtl" : "ltr",
                  borderTop: `2px solid ${accentColor}`, paddingTop: 8, marginTop: 8
                }}>
                  <span>{t("Total Balance")}:</span>
                  <span>{fmtCurrency(totalBalance)}</span>
                </div>
                <div style={{ fontSize: "9pt", fontWeight: 600, color: "#64748b", textAlign: isRtl ? "right" : "left", marginTop: 4, fontStyle: "italic", direction: isRtl ? "rtl" : "ltr" }}>
                  {numberToWords(Math.abs(totalBalance), i18n.language, currency === "USD" ? "USD" : "IQD")}
                </div>
                {totalBalance !== 0 && (
                  <div style={{ fontSize: "10pt", fontWeight: 700, color: totalBalance > 0 ? "#dc2626" : "#16a34a", textAlign: isRtl ? "right" : "left", marginTop: 4, direction: isRtl ? "rtl" : "ltr" }}>
                    {t("Remaining with")} {totalBalance > 0 ? (companyProfile?.name || "") : invoice.supplierName}
                  </div>
                )}
              </div>

              <div className="summary-box" style={{
                flex: 1, border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px",
                background: "linear-gradient(145deg, #fafbfc, #f1f5f9)"
              }}>
                <h3 style={{ fontSize: "12pt", fontWeight: 800, marginBottom: 8, paddingBottom: 5, borderBottom: `2px solid #e2e8f0`, color: accentColor, textAlign: isRtl ? "right" : "left" }}>{t("Invoice Summary")}</h3>
                {totalExpenses > 0 && (
                  <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#334155", direction: isRtl ? "rtl" : "ltr" }}>
                    <span>{t("Total Expenses")}:</span>
                    <span>{fmtCurrency(invoice.totalExpenses)}</span>
                  </div>
                )}
                {hasGifts && (
                  <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                    <span>{t("Total Gifts")}:</span>
                    <span>{totalGifts}</span>
                  </div>
                )}
                <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#334155", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Invoice Total")}:</span>
                  <span style={{ color: "#2563eb" }}>{fmtCurrency(subtotal)}</span>
                </div>
                <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Amount Paid")}:</span>
                  <span>{fmtCurrency(amountPaid)}</span>
                </div>
                <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#d97706", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Discount")}:</span>
                  <span>{discount > 0 ? `-${fmtCurrency(discount)}` : fmtCurrency(0)}</span>
                </div>
                <div className="summary-row total" style={{
                  display: "flex", justifyContent: "space-between",
                  fontWeight: 800, fontSize: "13pt", direction: isRtl ? "rtl" : "ltr",
                  borderTop: `2px solid ${accentColor}`, paddingTop: 6, marginTop: 6, color: "#dc2626"
                }}>
                  <span>{t("Remaining")}:</span>
                  <span>{fmtCurrency(remaining)}</span>
                </div>
              </div>
            </div>

            <div className="footer" style={{ marginTop: 28, display: "flex", justifyContent: "center", fontSize: "9pt" }}>
              <div style={{ textAlign: "center", position: "relative" }}>
                {companyProfile?.stamp && (
                  <img src={companyProfile.stamp} alt={t("Stamp")} style={{ width: 120, height: 120, objectFit: "contain", opacity: 0.8 }} />
                )}
                <div style={{ fontWeight: 700, fontSize: "11pt", color: "#1e293b", marginTop: companyProfile?.stamp ? -10 : 44 }}>
                  {user?.fullName || user?.username || t("Accountant")}
                </div>
                <div style={{ borderTop: "1.5px solid #94a3b8", marginTop: 4, paddingTop: 4, fontWeight: 500, color: "#64748b" }}>{t("Accountant")}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
