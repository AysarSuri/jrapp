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
import { getModernPrintStyles } from "@/lib/print-styles";
import { logExport } from "@/lib/export-log";
import { numberToWords } from "@/lib/number-to-words";

type ReturnData = {
  id: number;
  returnNumber: string;
  date: string;
  time: string;
  supplierId: number | null;
  supplierName: string;
  address: string | null;
  note: string | null;
  returnType: string;
  subtotal: string;
  discount: string;
  amountPaid: string;
  remaining: string;
  totalItems: number;
  totalQuantity: string;
  currency: string;
  originalInvoiceNumber: string | null;
};

type ReturnItemData = {
  id: number;
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  gift: string;
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

interface PurchaseReturnReportProps {
  returnId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: "USD" | "IQD";
}

export default function PurchaseReturnReport({ returnId, open, onOpenChange, currency }: PurchaseReturnReportProps) {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const { data: returnData, isLoading: returnLoading } = useQuery<ReturnData>({
    queryKey: ["/api/purchase-returns", returnId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-returns/${returnId}`);
      if (!res.ok) throw new Error("Failed to fetch return");
      return res.json();
    },
    enabled: !!returnId && open,
  });

  const { data: items, isLoading: itemsLoading } = useQuery<ReturnItemData[]>({
    queryKey: ["/api/purchase-returns", returnId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-returns/${returnId}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!returnId && open,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
    enabled: !!returnData?.supplierId && open,
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

  const { data: openingBalanceData } = useQuery<{ openingBalanceUsd: number; openingBalanceIqd: number }>({
    queryKey: ["/api/purchase-returns", returnId, "opening-balance"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-returns/${returnId}/opening-balance`);
      if (!res.ok) throw new Error("Failed to fetch opening balance");
      return res.json();
    },
    enabled: !!returnId && open,
    staleTime: 0,
  });

  const resolveProductName = (item: ReturnItemData) => {
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

  const supplier = clients?.find(c => c.id === returnData?.supplierId);

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const lang = i18n.language;
  const isRtlLang = lang === "ar" || lang === "ckb";
  const currencyPrefix = currency === "USD" ? (isRtlLang ? "" : "$") : "";
  const currencySuffix = currency === "USD" ? (isRtlLang ? "$" : "") : " IQD";
  const fmtCurrency = (n: number | string) => `${currencyPrefix}${fmt(n)}${currencySuffix}`;

  const accentColor = companyProfile?.primaryColor || "#1e293b";
  const oldDebt = currency === "USD"
    ? (openingBalanceData?.openingBalanceUsd ?? 0)
    : (openingBalanceData?.openingBalanceIqd ?? 0);
  const returnRemaining = parseFloat(returnData?.remaining || "0");
  const totalBalance = oldDebt - returnRemaining;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;
    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor, accentTextColor: companyProfile?.secondaryColor || "#ffffff" });
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Purchase Return Report")} - ${returnData?.returnNumber || ""}</title>
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
    if (returnData) {
      logExport({ reportName: t("Purchase Return Report"), supplierName: returnData.supplierName, invoiceNumber: returnData.returnNumber, exportType: "print", currency });
    }
  };

  const generatePdf = async (): Promise<Blob | null> => {
    const content = printRef.current;
    if (!content) return null;
    return captureElementAsPdf(content);
  };

  const handleWhatsApp = async () => {
    if (!returnData) return;
    setSendingWhatsApp(true);

    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;

      const fileName = `${t("Purchase Return Report")}_${returnData.returnNumber}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${t("Purchase Return Report")} - ${returnData.returnNumber}`,
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
          `${currency === "USD" ? t("Purchase Return - USD") : t("Purchase Return - IQD")}\n${t("Return #")}: ${returnData.returnNumber}\n${t("Supplier Name")}: ${returnData.supplierName}\n${t("Total")}: ${currencyPrefix}${fmt(returnData.subtotal)}${currencySuffix}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
      }
      logExport({ reportName: t("Purchase Return Report"), supplierName: returnData.supplierName, invoiceNumber: returnData.returnNumber, exportType: "whatsapp", currency });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const hasGifts = items?.some(item => parseFloat(item.gift || "0") > 0) || false;
  const totalGifts = items?.reduce((sum, item) => sum + parseFloat(item.gift || "0"), 0) || 0;
  const isLoading = returnLoading || itemsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("Purchase Return Report")}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading || sendingWhatsApp} data-testid="button-whatsapp-return" className="bg-green-600 hover:bg-green-700 text-white border-green-600">
                {sendingWhatsApp ? <Loader2 className="w-5 h-5 mr-1 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-1" />}
                {sendingWhatsApp ? t("Preparing PDF...") : t("WhatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} data-testid="button-print-return">
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
        ) : returnData ? (
          <div ref={printRef} style={{ width: 794, minWidth: 794, fontFamily: "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Segoe UI',sans-serif" }}>
            {companyProfile?.cliche && (
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", height: 170, objectFit: "cover" }} />
              </div>
            )}
            <div className="header" style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #dc2626", paddingBottom: 10 }}>
              <h1 style={{ fontSize: "16pt", marginBottom: 3, color: "#dc2626" }}>
                {currency === "USD" ? t("Purchase Return - USD") : t("Purchase Return - IQD")}
              </h1>
              <p style={{ fontSize: "12pt", color: "#666", fontWeight: 700 }}>
                {t("Return #")}: {returnData.returnNumber} | {t("Date")}: {formatDate(returnData.date)} | {t("Time")}: {returnData.time}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 0", marginBottom: 12, fontSize: "12pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 10px", width: "50%", boxSizing: "border-box" }}>
                <span style={{ fontWeight: 600, color: "#555" }}>{t("Supplier Name")}:</span>
                <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{returnData.supplierName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 10px", width: "50%", boxSizing: "border-box" }}>
                <span style={{ fontWeight: 600, color: "#555" }}>{t("Return Type")}:</span>
                <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{returnData.returnType === "cash" ? t("Cash") : t("Credit")}</span>
              </div>
              {returnData.originalInvoiceNumber && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 10px", width: "50%", boxSizing: "border-box" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Original Invoice")}:</span>
                  <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{returnData.originalInvoiceNumber}</span>
                </div>
              )}
              {returnData.address && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 10px", width: "50%", boxSizing: "border-box" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Address")}:</span>
                  <span style={{ fontWeight: 500, flex: 1, textAlign: "center" }}>{returnData.address}</span>
                </div>
              )}
              {returnData.note && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 10px", width: "100%", boxSizing: "border-box" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Note")}:</span>
                  <span style={{ fontWeight: 500 }}>{returnData.note}</span>
                </div>
              )}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "12pt" }}>
              <thead>
                <tr>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>#</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Product Code")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Product Name")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Quantity")}</th>
                  {hasGifts && <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Gift")}</th>}
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Unit")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Price")}</th>
                  <th style={{ background: fieldColor, color: textColor, padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: "12pt" }}>{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "white" : "#f9f9f9" }}>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{item.productCode}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: isRtl ? "right" : "left", fontWeight: 700 }}>{resolveProductName(item)}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
                    {hasGifts && <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontWeight: 700 }}>{parseFloat(item.gift || "0") > 0 ? item.gift : "-"}</td>}
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontWeight: 700 }}>{resolveUnitName(item.unit, unitsList)}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{currencyPrefix}{fmt(item.price)}{currencySuffix}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{currencyPrefix}{fmt(item.amount)}{currencySuffix}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 14, marginTop: 14, direction: "ltr" }}>
              <div style={{
                flex: 1, border: `2px solid ${accentColor}30`, borderRadius: 10,
                padding: "10px 14px", background: `linear-gradient(135deg, ${accentColor}05, ${accentColor}10)`,
                display: "flex", flexDirection: "column", justifyContent: "flex-end"
              }}>
                <h3 style={{ color: accentColor, fontSize: "12pt", fontWeight: 800, marginBottom: 8, textAlign: isRtl ? "right" : "left" }}>{t("Supplier Balance")}</h3>
                <div style={{ flex: 1 }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Opening Balance")}:</span>
                  <span>{fmtCurrency(oldDebt)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Return Remaining")}:</span>
                  <span style={{ color: "#dc2626" }}>-{fmtCurrency(returnRemaining)}</span>
                </div>
                <div style={{
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
                    {t("Remaining with")} {totalBalance > 0 ? (companyProfile?.name || "") : returnData.supplierName}
                  </div>
                )}
              </div>

              <div style={{
                flex: 1, border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px",
                background: "linear-gradient(145deg, #fafbfc, #f1f5f9)"
              }}>
                <h3 style={{ fontSize: "12pt", fontWeight: 800, marginBottom: 8, paddingBottom: 5, borderBottom: "2px solid #e2e8f0", color: accentColor, textAlign: isRtl ? "right" : "left" }}>{t("Return Summary")}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#334155", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Products")}:</span>
                  <span>{returnData.totalItems}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#334155", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Total Quantity")}:</span>
                  <span>{returnData.totalQuantity}</span>
                </div>
                {hasGifts && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                    <span>{t("Total Gifts")}:</span>
                    <span>{totalGifts}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#334155", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Subtotal")}:</span>
                  <span style={{ color: "#2563eb" }}>{fmtCurrency(returnData.subtotal)}</span>
                </div>
                {parseFloat(returnData.discount || "0") > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#d97706", direction: isRtl ? "rtl" : "ltr" }}>
                    <span>{t("Discount")}:</span>
                    <span>-{fmtCurrency(returnData.discount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11pt", fontWeight: 700, color: "#16a34a", direction: isRtl ? "rtl" : "ltr" }}>
                  <span>{t("Amount Received")}:</span>
                  <span>{fmtCurrency(returnData.amountPaid)}</span>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontWeight: 800, fontSize: "13pt", direction: isRtl ? "rtl" : "ltr",
                  borderTop: `2px solid ${accentColor}`, paddingTop: 6, marginTop: 6, color: "#dc2626"
                }}>
                  <span>{t("Remaining")}:</span>
                  <span>{fmtCurrency(returnData.remaining)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontSize: "9pt" }}>
              <div style={{ textAlign: "center", width: 180 }}>
                <div style={{ borderTop: "1.5px solid #94a3b8", marginTop: 44, paddingTop: 4, fontWeight: 500, color: "#64748b" }}>{t("Supplier Signature")}</div>
              </div>
              {companyProfile?.stamp && (
                <div style={{ textAlign: "center" }}>
                  <img src={companyProfile.stamp} alt={t("Stamp")} style={{ width: 120, height: 120, objectFit: "contain", opacity: 0.8 }} />
                </div>
              )}
              <div style={{ textAlign: "center", width: 180 }}>
                <div style={{ borderTop: "1.5px solid #94a3b8", marginTop: 44, paddingTop: 4, fontWeight: 500, color: "#64748b" }}>{t("Accountant")}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
