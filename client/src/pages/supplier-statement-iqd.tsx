import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Loader2, Receipt, Banknote, ArrowDownToLine, Tag, Printer, MessageCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/format-utils";

type Client = {
  id: number;
  name: string;
  type: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
};

type StatementEntry = {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string;
  debitUsd: number;
  debitIqd: number;
  creditUsd: number;
  creditIqd: number;
  note: string | null;
  agentName?: string | null;
};

type StatementResponse = {
  supplier: Client;
  entries: StatementEntry[];
  openingBalanceIqd?: number;
};

type CompanyProfileData = {
  id: number;
  name: string;
  cliche: string | null;
  primaryColor: string;
  secondaryColor: string;
};

type ProductReportRow = {
  invoiceNumber: string;
  type: "purchase" | "return";
  date: string;
  productName: string;
  quantity: number;
  unit: string;
  returnQuantity: number;
  price: number;
};

type ProductReportResponse = {
  supplier: Client;
  rows: ProductReportRow[];
  totalQuantity: number;
  totalReturns: number;
  totalAmount: number;
  currency: string;
};

type ActiveTab = "general" | "invoices" | "payments" | "adjustments" | "products_report";

export default function SupplierStatementIqdPage() {
  const { t, i18n } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const suppliers = clients?.filter((c) => c.type === "supplier") || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: [`/api/supplier-statement/${selectedSupplierId}${startDate || endDate ? `?startDate=${startDate}&endDate=${endDate}` : ""}`],
    enabled: !!selectedSupplierId,
  });

  const { data: productsReport, isLoading: productsReportLoading } = useQuery<ProductReportResponse>({
    queryKey: [`/api/supplier-products-report/${selectedSupplierId}?currency=IQD${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`],
    enabled: !!selectedSupplierId && activeTab === "products_report",
  });

  const entries = statement?.entries || [];
  const oldDebt = parseFloat(statement?.supplier?.oldDebtIqd || "0");
  const openingBalance = statement?.openingBalanceIqd ?? oldDebt;

  const agentNames = useMemo(() => {
    const names = new Set<string>();
    entries.forEach((e) => {
      if ((e.type === "adjustment_received" || e.type === "adjustment_discount") && e.agentName) {
        names.add(e.agentName);
      }
    });
    return Array.from(names).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let filtered = entries.filter(e => e.debitIqd > 0 || e.creditIqd > 0);
    switch (activeTab) {
      case "invoices":
        filtered = filtered.filter(e => e.type === "purchase_invoice");
        break;
      case "payments":
        filtered = filtered.filter(e => e.type === "payment");
        break;
      case "adjustments":
        filtered = filtered.filter(e => e.type === "adjustment_received" || e.type === "adjustment_discount");
        if (selectedAgent !== "all") {
          filtered = filtered.filter(e => e.agentName === selectedAgent);
        }
        break;
    }
    return filtered;
  }, [entries, activeTab, selectedAgent]);

  let runningIqd = openingBalance;
  const entriesWithBalance = filteredEntries.map((entry) => {
    runningIqd += entry.debitIqd - entry.creditIqd;
    return { ...entry, balanceIqd: runningIqd };
  });

  const totalDebitIqd = filteredEntries.reduce((s, e) => s + e.debitIqd, 0);
  const totalCreditIqd = filteredEntries.reduce((s, e) => s + e.creditIqd, 0);
  const finalBalance = entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balanceIqd : openingBalance;

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const fieldColor = companyProfile?.primaryColor || "#333";
  const textColor = companyProfile?.secondaryColor || "white";

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "purchase_invoice":
        return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800 gap-1"><Receipt className="w-3 h-3" />{t("Purchase Invoice")}</Badge>;
      case "payment":
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800 gap-1"><Banknote className="w-3 h-3" />{t("Payment")}</Badge>;
      case "adjustment_received":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1"><ArrowDownToLine className="w-3 h-3" />{t("Received")}</Badge>;
      case "adjustment_discount":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 gap-1"><Tag className="w-3 h-3" />{t("Discount")}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "purchase_invoice": return t("Purchase Invoice");
      case "payment": return t("Payment");
      case "adjustment_received": return t("Received");
      case "adjustment_discount": return t("Discount");
      default: return type;
    }
  };

  const getActiveTabLabel = () => {
    switch (activeTab) {
      case "general": return t("General Statement");
      case "invoices": return t("Purchase Invoices");
      case "payments": return t("Payments & Transfers");
      case "adjustments": return t("Agent Adjustments");
      case "products_report": return t("Incoming Report");
    }
  };

  const handlePrint = () => {
    if (!statement) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const oldDebtVal = parseFloat(statement.supplier.oldDebtIqd || "0");
    const openingBalanceVal = statement.openingBalanceIqd ?? oldDebtVal;
    const rows = entriesWithBalance.map((e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDate(e.date)}<br/><small>${e.time}</small></td>
        <td>${getTypeText(e.type)}</td>
        <td>${e.description}</td>
        <td class="debit">${e.debitIqd > 0 ? fmt(e.debitIqd) + " IQD" : "-"}</td>
        <td class="credit">${e.creditIqd > 0 ? fmt(e.creditIqd) + " IQD" : "-"}</td>
        <td class="balance">${fmt(e.balanceIqd)} IQD</td>
        <td>${e.note || "-"}</td>
      </tr>
    `).join("");

    const dateRangeHtml = startDate || endDate ? `<p style="font-size: 9pt; color: #444;">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : "";
    const tabLabel = getActiveTabLabel();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Supplier Statement - IQD")} - ${statement.supplier.name} - ${tabLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; font-size: 10pt; direction: ${isRtl ? "rtl" : "ltr"}; }
          .cliche { text-align: center; margin-bottom: 8px; }
          .cliche img { width: 100%; height: 150px; object-fit: cover; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid ${fieldColor}; padding-bottom: 8px; }
          .header h1 { font-size: 14pt; margin-bottom: 2px; }
          .header p { font-size: 10pt; color: #666; }
          .supplier-bar { background: ${fieldColor}; color: ${textColor}; text-align: center; padding: 5px; border-radius: 3px; margin-bottom: 8px; font-weight: 600; font-size: 11pt; }
          .summary-cards { display: flex; gap: 10px; margin-bottom: 10px; }
          .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; text-align: center; }
          .summary-card .label { font-size: 8pt; color: #666; }
          .summary-card .value { font-size: 12pt; font-weight: 700; }
          .red { color: #dc2626; }
          .green { color: #16a34a; }
          .blue { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          th { background: ${fieldColor}; color: ${textColor}; padding: 4px 3px; text-align: center; font-weight: 600; font-size: 9pt; white-space: nowrap; }
          td { border: 1px solid #ddd; padding: 3px; text-align: center; font-size: 9pt; }
          td small { color: #999; font-size: 7pt; }
          tr:nth-child(even) { background: #f9f9f9; }
          .debit { color: #dc2626; font-weight: 500; }
          .credit { color: #16a34a; font-weight: 500; }
          .balance { font-weight: 600; }
          .total-row { background: #f0f0f0 !important; font-weight: 700; border-top: 2px solid #333; }
          .opening-row { background: #f5f5f5; font-weight: 500; }
          @media print {
            body { padding: 10mm; }
            @page { margin: 8mm; size: A4; }
          }
        </style>
      </head>
      <body>
        ${companyProfile?.cliche ? `<div class="cliche"><img src="${companyProfile.cliche}" /></div>` : ""}
        <div class="header">
          <h1>${t("Supplier Statement - IQD")} - ${tabLabel}</h1>
          <p>${formatDate(new Date())}</p>
          ${dateRangeHtml}
        </div>
        <div class="supplier-bar">${statement.supplier.name}</div>
        <div class="summary-cards">
          <div class="summary-card"><div class="label">${t("Opening Balance")}</div><div class="value red">${fmt(openingBalanceVal)} IQD</div></div>
          <div class="summary-card"><div class="label">${t("Total Payments IQD")}</div><div class="value green">${fmt(totalCreditIqd)} IQD</div></div>
          <div class="summary-card"><div class="label">${t("Final Balance IQD")}</div><div class="value blue">${fmt(finalBalance)} IQD</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Date")}</th>
              <th>${t("Type")}</th>
              <th>${t("Description")}</th>
              <th>${t("Debit IQD")}</th>
              <th>${t("Credit IQD")}</th>
              <th>${t("Balance IQD")}</th>
              <th>${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-row">
              <td>-</td><td>-</td><td colspan="2">${t("Opening Balance")}</td>
              <td>-</td><td>-</td><td class="balance red">${fmt(openingBalanceVal)} IQD</td><td></td>
            </tr>
            ${rows}
            <tr class="total-row">
              <td>-</td><td>-</td><td colspan="2">${t("Total")}</td>
              <td class="debit">${fmt(totalDebitIqd)} IQD</td>
              <td class="credit">${fmt(totalCreditIqd)} IQD</td>
              <td class="balance blue">${fmt(finalBalance)} IQD</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const generatePdf = async (): Promise<Blob | null> => {
    if (!statement || !printRef.current) return null;

    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;background:white;padding:15px;font-size:10pt;direction:" + (isRtl ? "rtl" : "ltr");
    document.body.appendChild(tempDiv);

    const oldDebtVal = parseFloat(statement.supplier.oldDebtIqd || "0");
    const openingBalanceVal = statement.openingBalanceIqd ?? oldDebtVal;
    const rows = entriesWithBalance.map((e, idx) => `
      <tr style="background:${idx % 2 === 0 ? "white" : "#f9f9f9"}">
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${formatDate(e.date)}<br/><small style="color:#999;font-size:7pt">${e.time}</small></td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${getTypeText(e.type)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.description}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;color:#dc2626">${e.debitIqd > 0 ? fmt(e.debitIqd) + " IQD" : "-"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;color:#16a34a">${e.creditIqd > 0 ? fmt(e.creditIqd) + " IQD" : "-"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;font-weight:600">${fmt(e.balanceIqd)} IQD</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.note || "-"}</td>
      </tr>
    `).join("");

    const dateRangeHtml = startDate || endDate ? `<p style="font-size: 10pt; color: #666;">${startDate || t("Beginning")} - ${endDate || t("Now")}</p>` : "";
    const tabLabel = getActiveTabLabel();

    tempDiv.innerHTML = `
      ${companyProfile?.cliche ? `<div style="text-align:center;margin-bottom:8px"><img src="${companyProfile.cliche}" style="width:100%;height:150px;object-fit:cover" /></div>` : ""}
      <div style="text-align:center;margin-bottom:10px;border-bottom:2px solid ${fieldColor};padding-bottom:8px">
        <h1 style="font-size:14pt;margin-bottom:2px">${t("Supplier Statement - IQD")} - ${tabLabel}</h1>
        <p style="font-size:10pt;color:#666">${formatDate(new Date())}</p>
        ${dateRangeHtml}
      </div>
      <div style="background:${fieldColor};color:${textColor};text-align:center;padding:5px;border-radius:3px;margin-bottom:8px;font-weight:600;font-size:11pt">${statement.supplier.name}</div>
      <div style="display:flex;gap:10px;margin-bottom:10px">
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Opening Balance")}</div><div style="font-size:12pt;font-weight:700;color:#dc2626">${fmt(openingBalanceVal)} IQD</div></div>
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Total Payments IQD")}</div><div style="font-size:12pt;font-weight:700;color:#16a34a">${fmt(totalCreditIqd)} IQD</div></div>
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Final Balance IQD")}</div><div style="font-size:12pt;font-weight:700;color:#2563eb">${fmt(finalBalance)} IQD</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:9pt">
        <thead><tr>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">#</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Date")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Type")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Description")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Debit IQD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Credit IQD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Balance IQD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Note")}</th>
        </tr></thead>
        <tbody>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td colspan="2" style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:500">${t("Opening Balance")}</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:700;color:#dc2626">${fmt(openingBalanceVal)} IQD</td><td style="border:1px solid #ddd;padding:3px"></td></tr>
          ${rows}
          <tr style="background:#f0f0f0;font-weight:700;border-top:2px solid #333"><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td colspan="2" style="border:1px solid #ddd;padding:3px;text-align:center">${t("Total")}</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#dc2626">${fmt(totalDebitIqd)} IQD</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#16a34a">${fmt(totalCreditIqd)} IQD</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#2563eb">${fmt(finalBalance)} IQD</td><td style="border:1px solid #ddd;padding:3px"></td></tr>
        </tbody>
      </table>
    `;

    const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.removeChild(tempDiv);

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
    return pdf.output("blob");
  };

  const handleWhatsApp = async () => {
    if (!statement) return;
    setSendingWhatsApp(true);
    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) return;
      const fileName = `${t("Supplier Statement - IQD")}_${statement.supplier.name}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: fileName, files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        const text = encodeURIComponent(`${t("Supplier Statement - IQD")}\n${statement.supplier.name}\n${t("Final Balance IQD")}: ${fmt(finalBalance)} IQD`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "general", label: t("General Statement") },
    { key: "invoices", label: t("Purchase Invoices") },
    { key: "payments", label: t("Payments & Transfers") },
    { key: "adjustments", label: t("Agent Adjustments") },
    { key: "products_report", label: t("Incoming Report") },
  ];

  return (
    <div className="space-y-6">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-4 w-4" />
          {t("Supplier Management")}
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-supplier-statement-iqd-title">
          <Banknote className="h-8 w-8 text-orange-600" />
          {t("Supplier Statement - IQD")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("View supplier account statement in Iraqi Dinar")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5" />
            {t("Select Supplier")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="mb-2 block">{t("Select Supplier")}</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger data-testid="select-supplier-statement-iqd" className="w-full">
                  <SelectValue placeholder={t("Select supplier...")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} data-testid={`select-supplier-iqd-${s.id}`}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">{t("From Date")}</Label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">{t("To Date")}</Label>
              <DateInput
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
                data-testid="input-end-date"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              data-testid="button-clear-filters"
            >
              {t("Clear Filters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSupplierId && (
        <div className="flex flex-wrap gap-2 items-center" data-testid="tab-buttons-container">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== "adjustments") {
                  setSelectedAgent("all");
                }
              }}
              data-testid={`tab-${tab.key}`}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {activeTab === "adjustments" && agentNames.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[200px]" data-testid="select-agent-filter">
                  <SelectValue placeholder={t("Select Agent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="select-agent-all">{t("All Agents")}</SelectItem>
                  {agentNames.map((name) => (
                    <SelectItem key={name} value={name} data-testid={`select-agent-${name}`}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {selectedSupplierId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSupplierId && statement && !statementLoading && activeTab !== "products_report" && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={sendingWhatsApp} className="bg-green-600 hover:bg-green-700 text-white border-green-600" data-testid="button-whatsapp-statement-iqd">
              {sendingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageCircle className="w-4 h-4 mr-1" />}
              {t("WhatsApp")}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-statement-iqd">
              <Printer className="w-4 h-4 mr-1" />
              {t("Print")}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Opening Balance")}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-opening-balance-iqd">{fmt(openingBalance)} IQD</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Total Payments IQD")}</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(totalCreditIqd)} IQD</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Final Balance IQD")}</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(finalBalance)} IQD</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("Account Statement")} - {statement.supplier.name} (IQD) - {getActiveTabLabel()}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t("No transactions found")}
                </div>
              ) : (
                <div className="overflow-x-auto" ref={printRef}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-center">#</TableHead>
                        <TableHead>{t("Date")}</TableHead>
                        <TableHead>{t("Type")}</TableHead>
                        <TableHead>{t("Description")}</TableHead>
                        <TableHead className="text-center bg-red-50 dark:bg-red-950/20">{t("Debit IQD")}</TableHead>
                        <TableHead className="text-center bg-green-50 dark:bg-green-950/20">{t("Credit IQD")}</TableHead>
                        <TableHead className="text-center bg-blue-50 dark:bg-blue-950/20">{t("Balance IQD")}</TableHead>
                        <TableHead>{t("Note")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/30 font-medium italic">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell colSpan={2}>{t("Opening Balance")}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400 font-bold">{fmt(openingBalance)} IQD</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                      {entriesWithBalance.map((entry, idx) => (
                        <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-statement-iqd-${idx}`}>
                          <TableCell className="text-center text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{formatDate(entry.date)}</span>
                              <span className="text-xs text-muted-foreground">{entry.time}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(entry.type)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                          <TableCell className="text-center font-mono">
                            {entry.debitIqd > 0 ? <span className="text-red-600 dark:text-red-400 font-medium">{fmt(entry.debitIqd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {entry.creditIqd > 0 ? <span className="text-green-600 dark:text-green-400 font-medium">{fmt(entry.creditIqd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            <span className={entry.balanceIqd >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                              {fmt(entry.balanceIqd)} IQD
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{entry.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell colSpan={2}>{t("Total")}</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400 font-mono">{fmt(totalDebitIqd)}</TableCell>
                        <TableCell className="text-center text-green-600 dark:text-green-400 font-mono">{fmt(totalCreditIqd)}</TableCell>
                        <TableCell className="text-center text-blue-600 dark:text-blue-400 font-mono">
                          {fmt(finalBalance)} IQD
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {selectedSupplierId && activeTab === "products_report" && (
        <>
          {productsReportLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : productsReport ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("Incoming Report")} - {productsReport.supplier?.name || ""} (IQD)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {productsReport.rows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t("No transactions found")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-center">#</TableHead>
                          <TableHead>{t("Invoice Number")}</TableHead>
                          <TableHead>{t("Type")}</TableHead>
                          <TableHead>{t("Date")}</TableHead>
                          <TableHead>{t("Product Name")}</TableHead>
                          <TableHead className="text-center">{t("Quantity")}</TableHead>
                          <TableHead>{t("Unit")}</TableHead>
                          <TableHead className="text-center text-red-600">{t("Return")}</TableHead>
                          <TableHead className="text-center">{t("Purchase Price")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsReport.rows.map((row, idx) => (
                          <TableRow key={idx} data-testid={`row-products-report-iqd-${idx}`}>
                            <TableCell className="text-center text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                            <TableCell>
                              {row.type === "purchase" ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800">{t("Purchase")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800">{t("Return")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell>{row.productName}</TableCell>
                            <TableCell className="text-center font-mono">{row.quantity > 0 ? row.quantity : "-"}</TableCell>
                            <TableCell>{row.unit}</TableCell>
                            <TableCell className="text-center font-mono text-red-600">{row.returnQuantity > 0 ? row.returnQuantity : "-"}</TableCell>
                            <TableCell className="text-center font-mono">{fmt(row.price)} IQD</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell colSpan={5} className="text-center">{t("Total")}</TableCell>
                          <TableCell className="text-center font-mono">{productsReport.totalQuantity}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-center font-mono text-red-600">{productsReport.totalReturns}</TableCell>
                          <TableCell className="text-center font-mono">{fmt(productsReport.totalAmount)} IQD</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="p-4 border-t flex flex-col sm:flex-row gap-4 text-sm">
                  <div><span className="text-muted-foreground">{t("Total Quantity")} - {t("Returns")}:</span> <span className="font-bold">{(productsReport.totalQuantity || 0) - (productsReport.totalReturns || 0)}</span></div>
                  <div><span className="text-muted-foreground">{t("Total Amount")}:</span> <span className="font-bold">{fmt(productsReport.totalAmount || 0)} IQD</span></div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
