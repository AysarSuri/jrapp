import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { warehouses } from "@shared/schema";
type Warehouse = typeof warehouses.$inferSelect;
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchSelect } from "@/components/search-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Printer } from "lucide-react";
import { IconReport } from "@/components/erp-icons";
import { useUnits } from "@/hooks/use-units";
import { getProductNameByLang, resolveUnitName } from "@/lib/language-utils";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

interface ReportRow {
  productId: number;
  productCode: string;
  productName: string;
  productNameEn?: string | null;
  category: string;
  bigUnit: string;
  smallUnit: string;
  conversionFactor: number;
  netSmallUnits: number;
  bigQty: number;
  smallQty: number;
  minStock: number;
}

function formatUnit(big: number, remainder: number, bigUnitDisplay: string, smallUnitDisplay: string) {
  const parts: string[] = [];
  if (big > 0) parts.push(`${big} ${bigUnitDisplay}`);
  if (remainder > 0) parts.push(`${remainder} ${smallUnitDisplay}`);
  if (parts.length === 0) return "0";
  return parts.join(" + ");
}

export default function MaxStockReportPage() {
  const { t } = useTranslation();
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "over" | "under" | "zero">("all");
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const { data: warehousesList } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];

  const queryParam = warehouseId !== "all" ? `?warehouseId=${warehouseId}` : "";
  const { data: report, isLoading } = useQuery<ReportRow[]>({
    queryKey: [`/api/max-stock-report${queryParam}`],
  });

  const whs = warehousesList || [];
  const rows = report || [];

  const filtered = rows.filter(row => {
    if (filter === "all") return true;
    if (filter === "over") return row.minStock > 0 && row.netSmallUnits > row.minStock;
    if (filter === "under") return row.minStock > 0 && row.netSmallUnits < row.minStock && row.netSmallUnits > 0;
    if (filter === "zero") return row.netSmallUnits <= 0;
    return true;
  });

  const overCount = rows.filter(r => r.minStock > 0 && r.netSmallUnits > r.minStock).length;
  const underCount = rows.filter(r => r.minStock > 0 && r.netSmallUnits < r.minStock && r.netSmallUnits > 0).length;
  const zeroCount = rows.filter(r => r.netSmallUnits <= 0).length;

  const isRtl = ["ar", "ku"].includes(i18n.language);

  function getStatusBadge(row: ReportRow) {
    if (row.netSmallUnits <= 0) {
      return <Badge variant="destructive" className="font-bold" data-testid={`badge-status-${row.productId}`}>{t("Out of Stock")}</Badge>;
    }
    if (row.minStock > 0 && row.netSmallUnits < row.minStock) {
      return <Badge className="bg-orange-500 text-white font-bold" data-testid={`badge-status-${row.productId}`}>{t("Below Minimum")}</Badge>;
    }
    if (row.minStock > 0 && row.netSmallUnits > row.minStock) {
      return <Badge className="bg-green-600 text-white font-bold" data-testid={`badge-status-${row.productId}`}>{t("Above Minimum")}</Badge>;
    }
    return <Badge variant="secondary" className="font-bold" data-testid={`badge-status-${row.productId}`}>{t("OK")}</Badge>;
  }

  function handlePrint() {
    const printW = window.open("", "_blank");
    if (!printW) return;
    const dir = isRtl ? "rtl" : "ltr";
    const tableRows = filtered.map((row, i) => {
      const bigU = resolveUnitName(row.bigUnit, unitsList);
      const smallU = resolveUnitName(row.smallUnit, unitsList);
      const stock = formatUnit(row.bigQty, row.smallQty, bigU, smallU);
      const statusText = row.netSmallUnits <= 0 ? t("Out of Stock") : row.minStock > 0 && row.netSmallUnits < row.minStock ? t("Below Minimum") : row.minStock > 0 && row.netSmallUnits > row.minStock ? t("Above Minimum") : t("OK");
      const statusColor = row.netSmallUnits <= 0 ? "#dc2626" : row.minStock > 0 && row.netSmallUnits < row.minStock ? "#ea580c" : "#16a34a";
      return `<tr>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${i + 1}</td>
        <td style="padding:4px 8px;font-size:10pt;">${row.productCode}</td>
        <td style="padding:4px 8px;font-size:10pt;font-weight:600;">${getProductNameByLang(row.productName, row.productNameEn)}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${row.minStock}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:700;">${stock}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;color:${statusColor};font-weight:700;">${statusText}</td>
      </tr>`;
    }).join("");

    printW.document.write(`<!DOCTYPE html><html dir="${dir}"><head>
      ${PRINT_FONT_LINKS}
      <title>${t("Max Stock Report")}</title>
      <style>${getModernPrintStyles(dir)}
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head><body>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;justify-content:center;flex-direction:column;">
        ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
        <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
        <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Max Stock Report")}</h1>
        <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Total")}: ${filtered.length}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;" border="1">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Product Code")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Product Name")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Min Stock")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Current Stock")}</th>
          <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Status")}</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("Max Stock Report")}</h1>
        </div>
        <Button onClick={handlePrint} className="bg-primary text-white" data-testid="button-print">
          <Printer className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
          {t("Print Report")}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`cursor-pointer border-2 transition-all ${filter === "all" ? "border-primary bg-primary/5" : "border-transparent"}`} onClick={() => setFilter("all")} data-testid="filter-all">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{rows.length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase">{t("All")}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer border-2 transition-all ${filter === "over" ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-transparent"}`} onClick={() => setFilter("over")} data-testid="filter-over">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{overCount}</p>
            <p className="text-xs font-bold text-green-600 uppercase">{t("Above Minimum")}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer border-2 transition-all ${filter === "under" ? "border-orange-500 bg-orange-50 dark:bg-orange-950" : "border-transparent"}`} onClick={() => setFilter("under")} data-testid="filter-under">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{underCount}</p>
            <p className="text-xs font-bold text-orange-600 uppercase">{t("Below Minimum")}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer border-2 transition-all ${filter === "zero" ? "border-red-600 bg-red-50 dark:bg-red-950" : "border-transparent"}`} onClick={() => setFilter("zero")} data-testid="filter-zero">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{zeroCount}</p>
            <p className="text-xs font-bold text-red-600 uppercase">{t("Out of Stock")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('Filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[220px]">
              <Label className="text-base font-bold">{t('Warehouse')}</Label>
              <SearchSelect
                items={whs.map(wh => ({ id: wh.id, name: wh.name }))}
                value={warehouseId}
                onValueChange={(v) => setWarehouseId(v || "all")}
                placeholder={t('All (Total)')}
                data-testid="select-warehouse"
                showAllOption
                allOptionLabel={t('All (Total)')}
              />
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
            <div className="text-center py-12 text-muted-foreground">{t('No data found')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Product Code')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Product Name')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Category')}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t('Min Stock')}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t('Current Stock')}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t('Status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={row.productId} data-testid={`row-product-${row.productId}`}>
                      <TableCell className="font-mono text-xs text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{row.productCode}</TableCell>
                      <TableCell className="text-sm font-semibold">{getProductNameByLang(row.productName, row.productNameEn)}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        <Badge variant="outline" className="text-xs">{row.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold">{row.minStock}</TableCell>
                      <TableCell className="text-center text-sm font-bold">
                        {formatUnit(row.bigQty, row.smallQty, resolveUnitName(row.bigUnit, unitsList), resolveUnitName(row.smallUnit, unitsList))}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(row)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
