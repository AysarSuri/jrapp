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
import { Loader2, Printer, Gift, Percent } from "lucide-react";
import { IconReport } from "@/components/erp-icons";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

interface GiftItem {
  productCode: string;
  productName: string;
  quantity: number;
  gift: number;
  unit: string;
  price: number;
  giftValue: number;
}

interface ReportRow {
  invoiceId: number;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  currency: string;
  subtotal: number;
  discount: number;
  giftItems: GiftItem[];
  totalGiftValue: number;
}

type FilterMode = "all" | "discounts" | "gifts";

export default function SupplierDiscountsGiftsReportPage() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "USD" | "IQD">("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const params = new URLSearchParams();
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const { data: report, isLoading } = useQuery<ReportRow[]>({
    queryKey: ["/api/supplier-discounts-gifts-report", dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/supplier-discounts-gifts-report${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const rows = report || [];

  const applyFilters = (data: ReportRow[]) => {
    let result = data;
    if (currencyFilter !== "all") result = result.filter(r => r.currency === currencyFilter);
    if (filterMode === "discounts") result = result.filter(r => r.discount > 0);
    if (filterMode === "gifts") result = result.filter(r => r.totalGiftValue > 0);
    return result;
  };

  const filtered = applyFilters(rows);

  const totalDiscountUsd = rows.filter(r => r.currency === "USD").reduce((s, r) => s + r.discount, 0);
  const totalDiscountIqd = rows.filter(r => r.currency === "IQD").reduce((s, r) => s + r.discount, 0);
  const totalGiftUsd = rows.filter(r => r.currency === "USD").reduce((s, r) => s + r.totalGiftValue, 0);
  const totalGiftIqd = rows.filter(r => r.currency === "IQD").reduce((s, r) => s + r.totalGiftValue, 0);
  const invoicesWithDiscount = rows.filter(r => r.discount > 0).length;
  const invoicesWithGifts = rows.filter(r => r.totalGiftValue > 0).length;

  const isRtl = ["ar", "ku"].includes(i18n.language);
  const fmt = (val: number, currency: string) => currency === "USD" ? usd(val) : fmtIqd(val);

  function handlePrint() {
    const printW = window.open("", "_blank");
    if (!printW) return;
    const dir = isRtl ? "rtl" : "ltr";
    const tableRows = filtered.map((row, i) => {
      const giftNames = row.giftItems.map(g => `${g.productName} (${g.gift} ${g.unit})`).join(", ");
      return `<tr>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${i + 1}</td>
        <td style="padding:4px 8px;font-size:10pt;">${row.invoiceNumber}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${formatDate(row.date)}</td>
        <td style="padding:4px 8px;font-size:10pt;">${row.supplierName}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${row.currency}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;">${fmt(row.subtotal, row.currency)}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;color:#16a34a;">${row.discount > 0 ? fmt(row.discount, row.currency) : "-"}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;color:#7c3aed;">${row.totalGiftValue > 0 ? fmt(row.totalGiftValue, row.currency) : "-"}</td>
        <td style="padding:4px 8px;font-size:9pt;">${giftNames || "-"}</td>
      </tr>`;
    }).join("");

    const summaryHtml = `<div style="margin-top:16px;display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
      ${totalDiscountUsd > 0 ? `<div style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;text-align:center;">
        <div style="font-size:9pt;color:#64748b;font-weight:600;">${t("Total Discounts")} (USD)</div>
        <div style="font-size:13pt;font-weight:800;color:#16a34a;">${usd(totalDiscountUsd)}</div>
      </div>` : ""}
      ${totalDiscountIqd > 0 ? `<div style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;text-align:center;">
        <div style="font-size:9pt;color:#64748b;font-weight:600;">${t("Total Discounts")} (IQD)</div>
        <div style="font-size:13pt;font-weight:800;color:#16a34a;">${fmtIqd(totalDiscountIqd)}</div>
      </div>` : ""}
      ${totalGiftUsd > 0 ? `<div style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;text-align:center;">
        <div style="font-size:9pt;color:#64748b;font-weight:600;">${t("Total Gifts Value")} (USD)</div>
        <div style="font-size:13pt;font-weight:800;color:#7c3aed;">${usd(totalGiftUsd)}</div>
      </div>` : ""}
      ${totalGiftIqd > 0 ? `<div style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;text-align:center;">
        <div style="font-size:9pt;color:#64748b;font-weight:600;">${t("Total Gifts Value")} (IQD)</div>
        <div style="font-size:13pt;font-weight:800;color:#7c3aed;">${fmtIqd(totalGiftIqd)}</div>
      </div>` : ""}
    </div>`;

    printW.document.write(`<!DOCTYPE html><html dir="${dir}"><head>
      ${PRINT_FONT_LINKS}
      <title>${t("Supplier Discounts & Gifts Report")}</title>
      <style>${getModernPrintStyles(dir)}
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head><body>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;justify-content:center;flex-direction:column;">
        ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
        <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
        <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Supplier Discounts & Gifts Report")}</h1>
        ${dateFrom || dateTo ? `<p style="font-size:9pt;color:#475569;margin:4px 0 0;">${dateFrom ? formatDate(dateFrom) : ""} ${dateFrom && dateTo ? " - " : ""} ${dateTo ? formatDate(dateTo) : ""}</p>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;" border="1">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Invoice Number")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Date")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Supplier")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Currency")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Subtotal")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Discount")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Gifts Value")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Gift Details")}</th>
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
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <IconReport className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("Supplier Discounts & Gifts Report")}</h1>
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
              <Percent className="w-5 h-5 text-green-600" />
              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">{t("Total Discounts")}</p>
            </div>
            {totalDiscountUsd > 0 && <p className="text-2xl font-bold text-green-600" data-testid="text-discount-usd">{usd(totalDiscountUsd)}</p>}
            {totalDiscountIqd > 0 && <p className="text-2xl font-bold text-green-600" data-testid="text-discount-iqd">{fmtIqd(totalDiscountIqd)}</p>}
            {totalDiscountUsd === 0 && totalDiscountIqd === 0 && <p className="text-2xl font-bold text-muted-foreground">-</p>}
            <p className="text-xs text-muted-foreground text-sm">{invoicesWithDiscount} {t("Invoices")}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-5 h-5 text-violet-600" />
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase">{t("Total Gifts Value")}</p>
            </div>
            {totalGiftUsd > 0 && <p className="text-2xl font-bold text-violet-600" data-testid="text-gift-usd">{usd(totalGiftUsd)}</p>}
            {totalGiftIqd > 0 && <p className="text-2xl font-bold text-violet-600" data-testid="text-gift-iqd">{fmtIqd(totalGiftIqd)}</p>}
            {totalGiftUsd === 0 && totalGiftIqd === 0 && <p className="text-2xl font-bold text-muted-foreground">-</p>}
            <p className="text-xs text-muted-foreground text-sm">{invoicesWithGifts} {t("Invoices")}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-5 h-5 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">{t("Total Savings")}</p>
            </div>
            {(totalDiscountUsd + totalGiftUsd) > 0 && <p className="text-xl font-bold text-emerald-600">{usd(totalDiscountUsd + totalGiftUsd)} <span className="text-xs">USD</span></p>}
            {(totalDiscountIqd + totalGiftIqd) > 0 && <p className="text-xl font-bold text-emerald-600">{fmtIqd(totalDiscountIqd + totalGiftIqd)} <span className="text-xs">IQD</span></p>}
            {(totalDiscountUsd + totalGiftUsd + totalDiscountIqd + totalGiftIqd) === 0 && <p className="text-2xl font-bold text-muted-foreground">-</p>}
            <p className="text-xs text-muted-foreground text-sm">{t("Discounts")} + {t("Gifts")}</p>
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
              <Button variant={currencyFilter === "all" ? "default" : "outline"} onClick={() => setCurrencyFilter("all")} className={currencyFilter === "all" ? "bg-primary text-white" : ""} data-testid="filter-currency-all">{t("All")}</Button>
              <Button variant={currencyFilter === "USD" ? "default" : "outline"} onClick={() => setCurrencyFilter("USD")} className={currencyFilter === "USD" ? "bg-primary text-white" : ""} data-testid="filter-currency-usd">USD</Button>
              <Button variant={currencyFilter === "IQD" ? "default" : "outline"} onClick={() => setCurrencyFilter("IQD")} className={currencyFilter === "IQD" ? "bg-primary text-white" : ""} data-testid="filter-currency-iqd">IQD</Button>
            </div>
            <div className="flex gap-2">
              <Button variant={filterMode === "all" ? "default" : "outline"} onClick={() => setFilterMode("all")} className={filterMode === "all" ? "bg-primary text-white" : ""} data-testid="filter-mode-all">{t("All")}</Button>
              <Button variant={filterMode === "discounts" ? "default" : "outline"} onClick={() => setFilterMode("discounts")} className={filterMode === "discounts" ? "bg-green-600 text-white" : ""} data-testid="filter-mode-discounts">
                <Percent className="w-4 h-4 ltr:mr-1 rtl:ml-1" />{t("Discounts")}
              </Button>
              <Button variant={filterMode === "gifts" ? "default" : "outline"} onClick={() => setFilterMode("gifts")} className={filterMode === "gifts" ? "bg-violet-600 text-white" : ""} data-testid="filter-mode-gifts">
                <Gift className="w-4 h-4 ltr:mr-1 rtl:ml-1" />{t("Gifts")}
              </Button>
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
                    <TableHead className="text-sm font-bold">{t("Supplier")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Currency")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Subtotal")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Discount")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Gifts Value")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Gift Details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={row.invoiceId} data-testid={`row-invoice-${row.invoiceId}`}>
                      <TableCell className="text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="text-sm font-semibold font-mono">{row.invoiceNumber}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{row.supplierName}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{row.currency}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">{fmt(row.subtotal, row.currency)}</TableCell>
                      <TableCell className="text-sm font-bold text-center text-green-600">
                        {row.discount > 0 ? fmt(row.discount, row.currency) : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-center text-violet-600">
                        {row.totalGiftValue > 0 ? fmt(row.totalGiftValue, row.currency) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px]">
                        {row.giftItems.length > 0
                          ? row.giftItems.map((g, gi) => (
                              <span key={gi} className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded px-1.5 py-0.5 ltr:mr-1 rtl:ml-1 mb-1 text-xs font-semibold">
                                <Gift className="w-3 h-3" />
                                {g.productName} ({g.gift} {g.unit})
                              </span>
                            ))
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 border-t-2">
                    <TableCell colSpan={5} className="text-sm font-bold text-end">{t("Grand Total")}</TableCell>
                    <TableCell className="text-sm font-bold text-center">-</TableCell>
                    <TableCell className="text-sm font-bold text-center text-green-600">
                      {currencyFilter !== "IQD" && totalDiscountUsd > 0 && <div>{usd(totalDiscountUsd)}</div>}
                      {currencyFilter !== "USD" && totalDiscountIqd > 0 && <div>{fmtIqd(totalDiscountIqd)}</div>}
                      {((currencyFilter === "all" && totalDiscountUsd === 0 && totalDiscountIqd === 0) ||
                        (currencyFilter === "USD" && totalDiscountUsd === 0) ||
                        (currencyFilter === "IQD" && totalDiscountIqd === 0)) && "-"}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-center text-violet-600">
                      {currencyFilter !== "IQD" && totalGiftUsd > 0 && <div>{usd(totalGiftUsd)}</div>}
                      {currencyFilter !== "USD" && totalGiftIqd > 0 && <div>{fmtIqd(totalGiftIqd)}</div>}
                      {((currencyFilter === "all" && totalGiftUsd === 0 && totalGiftIqd === 0) ||
                        (currencyFilter === "USD" && totalGiftUsd === 0) ||
                        (currencyFilter === "IQD" && totalGiftIqd === 0)) && "-"}
                    </TableCell>
                    <TableCell />
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
