import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Printer, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { IconReport } from "@/components/erp-icons";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { getProductNameByLang } from "@/lib/language-utils";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

interface ProfitRow {
  invoiceId: number;
  invoiceNumber: string;
  date: string;
  customerName: string;
  currency: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  items: {
    productCode: string;
    productName: string;
    productNameEn?: string | null;
    quantity: number;
    unit: string;
    price: number;
    costPrice: number;
    amount: number;
    profit: number;
  }[];
}

export default function ProfitsReportPage() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "USD" | "IQD">("all");
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const params = new URLSearchParams();
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const { data: report, isLoading } = useQuery<ProfitRow[]>({
    queryKey: ["/api/profits-report", dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/profits-report${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const rows = report || [];
  const filtered = currencyFilter === "all" ? rows : rows.filter(r => r.currency === currencyFilter);

  const totalSalesUsd = rows.filter(r => r.currency === "USD").reduce((s, r) => s + r.totalSales, 0);
  const totalCostUsd = rows.filter(r => r.currency === "USD").reduce((s, r) => s + r.totalCost, 0);
  const totalProfitUsd = rows.filter(r => r.currency === "USD").reduce((s, r) => s + r.profit, 0);
  const totalSalesIqd = rows.filter(r => r.currency === "IQD").reduce((s, r) => s + r.totalSales, 0);
  const totalCostIqd = rows.filter(r => r.currency === "IQD").reduce((s, r) => s + r.totalCost, 0);
  const totalProfitIqd = rows.filter(r => r.currency === "IQD").reduce((s, r) => s + r.profit, 0);

  const isRtl = ["ar", "ku"].includes(i18n.language);

  const fmt = (val: number, currency: string) => currency === "USD" ? usd(val) : fmtIqd(val);

  function handlePrint() {
    const printW = window.open("", "_blank");
    if (!printW) return;
    const dir = isRtl ? "rtl" : "ltr";
    const tableRows = filtered.map((row, i) => {
      const profitColor = row.profit >= 0 ? "#16a34a" : "#dc2626";
      return `<tr>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${i + 1}</td>
        <td style="padding:4px 8px;font-size:10pt;">${row.invoiceNumber}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${formatDate(row.date)}</td>
        <td style="padding:4px 8px;font-size:10pt;">${row.customerName}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${row.currency}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;">${fmt(row.totalSales, row.currency)}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;">${fmt(row.totalCost, row.currency)}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:700;color:${profitColor};">${fmt(row.profit, row.currency)}</td>
      </tr>`;
    }).join("");

    const summaryHtml = `<div style="margin-top:16px;display:flex;gap:24px;justify-content:center;">
      ${totalProfitUsd !== 0 ? `<div style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;text-align:center;">
        <div style="font-size:9pt;color:#64748b;font-weight:600;">${t("Total Profit")} (USD)</div>
        <div style="font-size:13pt;font-weight:800;color:${totalProfitUsd >= 0 ? '#16a34a' : '#dc2626'};">${usd(totalProfitUsd)}</div>
      </div>` : ""}
      ${totalProfitIqd !== 0 ? `<div style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;text-align:center;">
        <div style="font-size:9pt;color:#64748b;font-weight:600;">${t("Total Profit")} (IQD)</div>
        <div style="font-size:13pt;font-weight:800;color:${totalProfitIqd >= 0 ? '#16a34a' : '#dc2626'};">${fmtIqd(totalProfitIqd)}</div>
      </div>` : ""}
    </div>`;

    printW.document.write(`<!DOCTYPE html><html dir="${dir}"><head>
      ${PRINT_FONT_LINKS}
      <title>${t("Profits Report")}</title>
      <style>${getModernPrintStyles(dir)}
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head><body>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;justify-content:center;flex-direction:column;">
        ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
        <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
        <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Profits Report")}</h1>
        ${dateFrom || dateTo ? `<p style="font-size:9pt;color:#475569;margin:4px 0 0;">${dateFrom ? formatDate(dateFrom) : ""} ${dateFrom && dateTo ? " - " : ""} ${dateTo ? formatDate(dateTo) : ""}</p>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;" border="1">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Invoice Number")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Customer")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Currency")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Total Sales")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Total Cost")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Profit")}</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      ${summaryHtml}
    </body></html>`);
    printW.document.close();
    printW.onafterprint = () => printW.close();
    setTimeout(() => { document.fonts.ready.then(() => printW.print()); }, 600);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <IconReport className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("Profits Report")}</h1>
        </div>
        <Button onClick={handlePrint} className="bg-primary text-white" data-testid="button-print">
          <Printer className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
          {t("Print Report")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">{t("Total Profit")} (USD)</p>
            </div>
            <p className={`text-2xl font-bold ${totalProfitUsd >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-profit-usd">{usd(totalProfitUsd)}</p>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t("Sales")}: {usd(totalSalesUsd)}</span>
              <span>{t("Cost")}: {usd(totalCostUsd)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">{t("Total Profit")} (IQD)</p>
            </div>
            <p className={`text-2xl font-bold ${totalProfitIqd >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-profit-iqd">{fmtIqd(totalProfitIqd)}</p>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t("Sales")}: {fmtIqd(totalSalesIqd)}</span>
              <span>{t("Cost")}: {fmtIqd(totalCostIqd)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">{t("Invoices")}</p>
            </div>
            <p className="text-2xl font-bold text-blue-600" data-testid="text-invoices-count">{rows.length}</p>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>USD: {rows.filter(r => r.currency === "USD").length}</span>
              <span>IQD: {rows.filter(r => r.currency === "IQD").length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("Filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-base font-bold">{t("From Date")}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 text-base font-semibold w-[180px]" data-testid="input-date-from" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold">{t("To Date")}</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 text-base font-semibold w-[180px]" data-testid="input-date-to" />
            </div>
            <div className="flex gap-2">
              <Button variant={currencyFilter === "all" ? "default" : "outline"} onClick={() => setCurrencyFilter("all")} className={currencyFilter === "all" ? "bg-primary text-white" : ""} data-testid="filter-all">{t("All")}</Button>
              <Button variant={currencyFilter === "USD" ? "default" : "outline"} onClick={() => setCurrencyFilter("USD")} className={currencyFilter === "USD" ? "bg-primary text-white" : ""} data-testid="filter-usd">USD</Button>
              <Button variant={currencyFilter === "IQD" ? "default" : "outline"} onClick={() => setCurrencyFilter("IQD")} className={currencyFilter === "IQD" ? "bg-primary text-white" : ""} data-testid="filter-iqd">IQD</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("No data found")}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t("Invoice Number")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Date")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Customer")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Currency")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Total Sales")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Total Cost")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Profit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={row.invoiceId} data-testid={`row-invoice-${row.invoiceId}`}>
                      <TableCell className="text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="text-sm font-semibold font-mono">{row.invoiceNumber}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{row.customerName}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{row.currency}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{fmt(row.totalSales, row.currency)}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{fmt(row.totalCost, row.currency)}</TableCell>
                      <TableCell className={`text-sm font-bold text-center ${row.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600"}`}>
                        {row.profit >= 0 ? <TrendingUp className="w-4 h-4 inline ltr:mr-1 rtl:ml-1" /> : <TrendingDown className="w-4 h-4 inline ltr:mr-1 rtl:ml-1" />}
                        {fmt(row.profit, row.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 border-t-2">
                    <TableCell colSpan={5} className="text-sm font-bold text-end">{t("Grand Total")}</TableCell>
                    <TableCell className="text-sm font-bold text-center">
                      {currencyFilter !== "IQD" && <div>{usd(totalSalesUsd)}</div>}
                      {currencyFilter !== "USD" && <div>{fmtIqd(totalSalesIqd)}</div>}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-center">
                      {currencyFilter !== "IQD" && <div>{usd(totalCostUsd)}</div>}
                      {currencyFilter !== "USD" && <div>{fmtIqd(totalCostIqd)}</div>}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-center">
                      {currencyFilter !== "IQD" && <div className={totalProfitUsd >= 0 ? "text-green-600" : "text-red-600"}>{usd(totalProfitUsd)}</div>}
                      {currencyFilter !== "USD" && <div className={totalProfitIqd >= 0 ? "text-green-600" : "text-red-600"}>{fmtIqd(totalProfitIqd)}</div>}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
