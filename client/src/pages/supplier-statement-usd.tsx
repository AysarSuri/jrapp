import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Loader2, Receipt, Banknote, ArrowDownToLine, Tag, DollarSign, Printer, MessageCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { usd } from "@/lib/format-utils";

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
};

type StatementResponse = {
  supplier: Client;
  entries: StatementEntry[];
};

type CompanyProfileData = {
  id: number;
  name: string;
  cliche: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export default function SupplierStatementUsdPage() {
  const { t, i18n } = useTranslation();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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

  const entries = statement?.entries || [];
  const oldDebt = parseFloat(statement?.supplier?.oldDebtUsd || "0");
  const openingBalance = statement?.openingBalanceUsd ?? oldDebt;

  const usdEntries = entries.filter(e => e.debitUsd > 0 || e.creditUsd > 0);

  let runningUsd = openingBalance;
  const entriesWithBalance = usdEntries.map((entry) => {
    runningUsd += entry.debitUsd - entry.creditUsd;
    return { ...entry, balanceUsd: runningUsd };
  });

  const totalDebitUsd = usdEntries.reduce((s, e) => s + e.debitUsd, 0);
  const totalCreditUsd = usdEntries.reduce((s, e) => s + e.creditUsd, 0);
  const finalBalance = entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balanceUsd : openingBalance;

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const dollarFmt = (n: number) => isRtl ? fmt(n) + "$" : "$" + fmt(n);

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

  const handlePrint = () => {
    if (!statement) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const oldDebt = parseFloat(statement.supplier.oldDebtUsd || "0");
    const rows = entriesWithBalance.map((e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${e.date}<br/><small>${e.time}</small></td>
        <td>${getTypeText(e.type)}</td>
        <td>${e.description}</td>
        <td class="debit">${e.debitUsd > 0 ? dollarFmt(e.debitUsd) : "-"}</td>
        <td class="credit">${e.creditUsd > 0 ? dollarFmt(e.creditUsd) : "-"}</td>
        <td class="balance">${dollarFmt(e.balanceUsd)}</td>
        <td>${e.note || "-"}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("Supplier Statement - USD")} - ${statement.supplier.name}</title>
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
          <h1>${t("Supplier Statement - USD")}</h1>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
        <div class="supplier-bar">${statement.supplier.name}</div>
        <div class="summary-cards">
          <div class="summary-card"><div class="label">${t("Old Debt USD")}</div><div class="value red">${dollarFmt(oldDebt)}</div></div>
          <div class="summary-card"><div class="label">${t("Total Payments USD")}</div><div class="value green">${dollarFmt(totalCreditUsd)}</div></div>
          <div class="summary-card"><div class="label">${t("Final Balance USD")}</div><div class="value blue">${dollarFmt(finalBalance)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Date")}</th>
              <th>${t("Type")}</th>
              <th>${t("Description")}</th>
              <th>${t("Debit USD")}</th>
              <th>${t("Credit USD")}</th>
              <th>${t("Balance USD")}</th>
              <th>${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-row">
              <td>-</td><td>-</td><td colspan="2">${t("Opening Balance (Old Debt)")}</td>
              <td>-</td><td>-</td><td class="balance red">${dollarFmt(oldDebt)}</td><td></td>
            </tr>
            ${rows}
            <tr class="total-row">
              <td>-</td><td>-</td><td colspan="2">${t("Total")}</td>
              <td class="debit">${dollarFmt(totalDebitUsd)}</td>
              <td class="credit">${dollarFmt(totalCreditUsd)}</td>
              <td class="balance blue">${dollarFmt(finalBalance)}</td>
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

    const oldDebt = parseFloat(statement.supplier.oldDebtUsd || "0");
    const rows = entriesWithBalance.map((e, idx) => `
      <tr style="background:${idx % 2 === 0 ? "white" : "#f9f9f9"}">
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.date}<br/><small style="color:#999;font-size:7pt">${e.time}</small></td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${getTypeText(e.type)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.description}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;color:#dc2626">${e.debitUsd > 0 ? dollarFmt(e.debitUsd) : "-"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;color:#16a34a">${e.creditUsd > 0 ? dollarFmt(e.creditUsd) : "-"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt;font-weight:600">${dollarFmt(e.balanceUsd)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-size:9pt">${e.note || "-"}</td>
      </tr>
    `).join("");

    tempDiv.innerHTML = `
      ${companyProfile?.cliche ? `<div style="text-align:center;margin-bottom:8px"><img src="${companyProfile.cliche}" style="width:100%;height:150px;object-fit:cover" /></div>` : ""}
      <div style="text-align:center;margin-bottom:10px;border-bottom:2px solid ${fieldColor};padding-bottom:8px">
        <h1 style="font-size:14pt;margin-bottom:2px">${t("Supplier Statement - USD")}</h1>
        <p style="font-size:10pt;color:#666">${new Date().toLocaleDateString()}</p>
      </div>
      <div style="background:${fieldColor};color:${textColor};text-align:center;padding:5px;border-radius:3px;margin-bottom:8px;font-weight:600;font-size:11pt">${statement.supplier.name}</div>
      <div style="display:flex;gap:10px;margin-bottom:10px">
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Old Debt USD")}</div><div style="font-size:12pt;font-weight:700;color:#dc2626">${dollarFmt(oldDebt)}</div></div>
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Total Payments USD")}</div><div style="font-size:12pt;font-weight:700;color:#16a34a">${dollarFmt(totalCreditUsd)}</div></div>
        <div style="flex:1;border:1px solid #ddd;border-radius:4px;padding:6px 8px;text-align:center"><div style="font-size:8pt;color:#666">${t("Final Balance USD")}</div><div style="font-size:12pt;font-weight:700;color:#2563eb">${dollarFmt(finalBalance)}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:9pt">
        <thead><tr>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">#</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Date")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Type")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Description")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Debit USD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Credit USD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Balance USD")}</th>
          <th style="background:${fieldColor};color:${textColor};padding:4px 3px;text-align:center;font-size:9pt">${t("Note")}</th>
        </tr></thead>
        <tbody>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td colspan="2" style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:500">${t("Opening Balance (Old Debt)")}</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:700;color:#dc2626">${dollarFmt(oldDebt)}</td><td style="border:1px solid #ddd;padding:3px"></td></tr>
          ${rows}
          <tr style="background:#f0f0f0;font-weight:700;border-top:2px solid #333"><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td style="border:1px solid #ddd;padding:3px;text-align:center">-</td><td colspan="2" style="border:1px solid #ddd;padding:3px;text-align:center">${t("Total")}</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#dc2626">${dollarFmt(totalDebitUsd)}</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#16a34a">${dollarFmt(totalCreditUsd)}</td><td style="border:1px solid #ddd;padding:3px;text-align:center;color:#2563eb">${dollarFmt(finalBalance)}</td><td style="border:1px solid #ddd;padding:3px"></td></tr>
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
      const fileName = `${t("Supplier Statement - USD")}_${statement.supplier.name}.pdf`;
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
        const text = encodeURIComponent(`${t("Supplier Statement - USD")}\n${statement.supplier.name}\n${t("Final Balance USD")}: ${dollarFmt(finalBalance)}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-4 w-4" />
          {t("Supplier Management")}
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-supplier-statement-usd-title">
          <DollarSign className="h-8 w-8 text-blue-600" />
          {t("Supplier Statement - USD")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("View supplier account statement in US Dollar")}</p>
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
                <SelectTrigger data-testid="select-supplier-statement-usd" className="w-full">
                  <SelectValue placeholder={t("Select supplier...")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} data-testid={`select-supplier-usd-${s.id}`}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">{t("From Date")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">{t("To Date")}</Label>
              <Input
                type="date"
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

      {selectedSupplierId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSupplierId && statement && !statementLoading && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={sendingWhatsApp} className="bg-green-600 hover:bg-green-700 text-white border-green-600" data-testid="button-whatsapp-statement-usd">
              {sendingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageCircle className="w-4 h-4 mr-1" />}
              {t("WhatsApp")}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-statement-usd">
              <Printer className="w-4 h-4 mr-1" />
              {t("Print")}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Old Debt USD")}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{usd(parseFloat(statement.supplier.oldDebtUsd || "0"))}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Total Payments USD")}</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{usd(totalCreditUsd)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Final Balance USD")}</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{usd(finalBalance)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("Account Statement")} - {statement.supplier.name} (USD)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
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
                        <TableHead className="text-center bg-red-50 dark:bg-red-950/20">{t("Debit USD")}</TableHead>
                        <TableHead className="text-center bg-green-50 dark:bg-green-950/20">{t("Credit USD")}</TableHead>
                        <TableHead className="text-center bg-blue-50 dark:bg-blue-950/20">{t("Balance USD")}</TableHead>
                        <TableHead>{t("Note")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell colSpan={2}>{t("Opening Balance (Old Debt)")}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center font-bold text-red-600 dark:text-red-400">{usd(parseFloat(statement.supplier.oldDebtUsd || "0"))}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {entriesWithBalance.map((entry, idx) => (
                        <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-statement-usd-${idx}`}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap">{entry.date}<br /><span className="text-xs text-muted-foreground">{entry.time}</span></TableCell>
                          <TableCell>{getTypeBadge(entry.type)}</TableCell>
                          <TableCell className="text-sm">{entry.description}</TableCell>
                          <TableCell className="text-center">
                            {entry.debitUsd > 0 ? <span className="text-red-600 dark:text-red-400 font-medium">{usd(entry.debitUsd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.creditUsd > 0 ? <span className="text-green-600 dark:text-green-400 font-medium">{usd(entry.creditUsd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <span className={entry.balanceUsd >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                              {usd(entry.balanceUsd)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{entry.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell colSpan={2}>{t("Total")}</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400">{usd(totalDebitUsd)}</TableCell>
                        <TableCell className="text-center text-green-600 dark:text-green-400">{usd(totalCreditUsd)}</TableCell>
                        <TableCell className="text-center text-blue-600 dark:text-blue-400">
                          {usd(finalBalance)}
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
    </div>
  );
}
