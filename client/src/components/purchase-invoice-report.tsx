import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Printer, MessageCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
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

  const fieldColor = companyProfile?.primaryColor || "#333";
  const textColor = companyProfile?.secondaryColor || "white";

  const supplier = clients?.find(c => c.id === invoice?.supplierId);
  const oldDebt = currency === "USD"
    ? parseFloat(supplier?.oldDebtUsd || "0")
    : parseFloat(supplier?.oldDebtIqd || "0");

  const invoiceRemaining = parseFloat(invoice?.remaining || "0");
  const totalBalance = oldDebt + invoiceRemaining;

  const fmt = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currencySymbol = currency === "USD" ? "$" : "";
  const currencySuffix = currency === "IQD" ? " IQD" : "";

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Purchase Invoice Report")} - ${invoice?.invoiceNumber || ""}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; font-size: 12pt; direction: ${isRtl ? "rtl" : "ltr"}; }
          .cliche-container { text-align: center; margin-bottom: 10px; }
          .cliche-container img { width: 100%; height: 170px; object-fit: cover; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 16pt; margin-bottom: 3px; }
          .header p { font-size: 12pt; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 12px; font-size: 12pt; }
          .info-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #ddd; padding: 2px 0; }
          .info-label { font-weight: 600; color: #555; }
          .info-value { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12pt; }
          th { background: #333; color: white; padding: 5px 4px; text-align: center; font-weight: 600; font-size: 12pt; }
          td { border: 1px solid #ddd; padding: 4px; text-align: center; font-size: 12pt; }
          tr:nth-child(even) { background: #f9f9f9; }
          .summary-section { margin-top: 10px; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .summary-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px; }
          .summary-box h3 { font-size: 13pt; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
          .summary-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12pt; }
          .summary-row.total { font-weight: 700; font-size: 14pt; border-top: 2px solid #333; padding-top: 5px; margin-top: 5px; }
          .debt-section { margin-top: 10px; border: 2px solid #dc2626; border-radius: 4px; padding: 8px; }
          .debt-section h3 { color: #dc2626; font-size: 13pt; margin-bottom: 5px; }
          .debt-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12pt; }
          .debt-row.final { font-weight: 700; font-size: 14pt; color: #dc2626; border-top: 2px solid #dc2626; padding-top: 5px; margin-top: 5px; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 12pt; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 3px; }
          @media print {
            body { padding: 15mm; }
            @page { margin: 10mm; size: A4; }
          }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
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
          `${currency === "USD" ? t("Purchase Invoice - USD") : t("Purchase Invoice - IQD")}\n${t("Invoice #")}: ${invoice.invoiceNumber}\n${t("Supplier Name")}: ${invoice.supplierName}\n${t("Total Balance")}: ${currencySymbol}${fmt(totalBalance)}${currencySuffix}`
        );
        const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
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
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src={companyProfile.cliche} alt={companyProfile.name || "Company"} style={{ width: "100%", height: 170, objectFit: "cover" }} />
              </div>
            )}
            <div className="header" style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #333", paddingBottom: 10 }}>
              <h1 style={{ fontSize: "16pt", marginBottom: 3 }}>
                {currency === "USD" ? t("Purchase Invoice - USD") : t("Purchase Invoice - IQD")}
              </h1>
              <p style={{ fontSize: "12pt", color: "#666" }}>
                {t("Invoice #")}: {invoice.invoiceNumber} | {t("Date")}: {invoice.date} | {t("Time")}: {invoice.time}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 12, fontSize: "12pt" }}>
              <div style={{ display: "flex", justifyContent: "center", borderBottom: "1px dotted #ddd", padding: "2px 0", gridColumn: "1 / -1" }}>
                <span style={{ fontWeight: 600 }}>{invoice.supplierName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 0" }}>
                <span style={{ fontWeight: 600, color: "#555" }}>{t("Invoice Type")}:</span>
                <span style={{ fontWeight: 500 }}>{invoice.invoiceType === "cash" ? t("Cash") : t("Credit")}</span>
              </div>
              {invoice.address && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Address")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.address}</span>
                </div>
              )}
              {invoice.customsClearance && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Customs Clearance")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.customsClearance}</span>
                </div>
              )}
              {invoice.carNumber && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Car Number")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.carNumber}</span>
                </div>
              )}
              {invoice.manifest && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 0" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Manifest")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.manifest}</span>
                </div>
              )}
              {invoice.note && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", padding: "2px 0", gridColumn: "1 / -1" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{t("Note")}:</span>
                  <span style={{ fontWeight: 500 }}>{invoice.note}</span>
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
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: isRtl ? "right" : "left" }}>{item.productName}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center" }}>{item.unit}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace" }}>{currencySymbol}{fmt(item.price)}{currencySuffix}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4, textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>{currencySymbol}{fmt(item.amount)}{currencySuffix}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 10 }}>
              <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 8 }}>
                <h3 style={{ fontSize: "13pt", marginBottom: 5, borderBottom: "1px solid #eee", paddingBottom: 3, fontWeight: 700 }}>{t("Invoice Summary")}</h3>
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
                  <span style={{ fontWeight: 600 }}>{currencySymbol}{fmt(invoice.subtotal)}{currencySuffix}</span>
                </div>
                {parseFloat(invoice.discount || "0") > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt", color: "#16a34a" }}>
                    <span>{t("Discount")}:</span>
                    <span style={{ fontWeight: 500 }}>-{currencySymbol}{fmt(invoice.discount)}{currencySuffix}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt", color: "#16a34a" }}>
                  <span>{t("Amount Paid")}:</span>
                  <span style={{ fontWeight: 500 }}>{currencySymbol}{fmt(invoice.amountPaid)}{currencySuffix}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px", fontSize: "14pt", fontWeight: 700, borderTop: "2px solid #333", marginTop: 5, color: "#dc2626" }}>
                  <span>{t("Remaining")}:</span>
                  <span>{currencySymbol}{fmt(invoice.remaining)}{currencySuffix}</span>
                </div>
              </div>

              {parseFloat(invoice.totalExpenses || "0") > 0 && (
                <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 8 }}>
                  <h3 style={{ fontSize: "13pt", marginBottom: 5, borderBottom: "1px solid #eee", paddingBottom: 3, fontWeight: 700 }}>{t("Expenses")}</h3>
                  {parseFloat(invoice.carExpense || "0") > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                      <span>{t("Car Expense")}:</span>
                      <span style={{ fontWeight: 500 }}>{currencySymbol}{fmt(invoice.carExpense)}{currencySuffix}</span>
                    </div>
                  )}
                  {parseFloat(invoice.customsExpense || "0") > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                      <span>{t("Customs Expense")}:</span>
                      <span style={{ fontWeight: 500 }}>{currencySymbol}{fmt(invoice.customsExpense)}{currencySuffix}</span>
                    </div>
                  )}
                  {parseFloat(invoice.otherExpenses || "0") > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                      <span>{t("Other Expenses")}:</span>
                      <span style={{ fontWeight: 500 }}>{currencySymbol}{fmt(invoice.otherExpenses)}{currencySuffix}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px", fontSize: "12pt", fontWeight: 700, borderTop: "1px solid #ddd", marginTop: 5 }}>
                    <span>{t("Total Expenses")}:</span>
                    <span>{currencySymbol}{fmt(invoice.totalExpenses)}{currencySuffix}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, border: "2px solid #dc2626", borderRadius: 4, padding: 8 }}>
              <h3 style={{ color: "#dc2626", fontSize: "13pt", marginBottom: 5, fontWeight: 700 }}>{t("Supplier Balance")}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                <span>{t("Old Debt")}:</span>
                <span style={{ fontWeight: 500 }}>{currencySymbol}{fmt(oldDebt)}{currencySuffix}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "12pt" }}>
                <span>{t("Invoice Remaining")}:</span>
                <span style={{ fontWeight: 500 }}>{currencySymbol}{fmt(invoiceRemaining)}{currencySuffix}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px", fontSize: "14pt", fontWeight: 700, color: "#dc2626", borderTop: "2px solid #dc2626", marginTop: 5 }}>
                <span>{t("Total Balance")}:</span>
                <span>{currencySymbol}{fmt(totalBalance)}{currencySuffix}</span>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: "12pt" }}>
              <div style={{ textAlign: "center", width: 200 }}>
                <div style={{ borderTop: "1px solid #333", marginTop: 40, paddingTop: 3 }}>{t("Supplier Signature")}</div>
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
