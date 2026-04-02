import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Printer } from "lucide-react";
import { formatDate } from "@/lib/format-utils";
import { getProductNameByLang } from "@/lib/language-utils";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";
interface ExpiryItem {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  productCode: string;
  productName: string;
  productNameEn?: string | null;
  quantity: string;
  unit: string;
  productionDate: string | null;
  expiryDate: string;
  daysLeft: number;
  status: "expired" | "expiring_soon" | "ok";
}

export default function ExpiryReportPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "expired" | "expiring_soon" | "ok">("all");
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const { data: items, isLoading } = useQuery<ExpiryItem[]>({
    queryKey: ["/api/expiry-report"],
  });

  const filtered = items?.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  }) || [];

  const expiredCount = items?.filter(i => i.status === "expired").length || 0;
  const soonCount = items?.filter(i => i.status === "expiring_soon").length || 0;
  const okCount = items?.filter(i => i.status === "ok").length || 0;

  const isRtl = ["ar", "ku"].includes(i18n.language);

  const getStatusBadge = (status: string, daysLeft: number) => {
    if (status === "expired") {
      return <Badge variant="destructive" className="font-bold">{t("Expired")}</Badge>;
    }
    if (status === "expiring_soon") {
      return <Badge className="bg-orange-500 text-white font-bold">{t("Expiring Soon")} ({daysLeft} {t("Days Left")})</Badge>;
    }
    return <Badge className="bg-green-600 text-white font-bold">{daysLeft} {t("Days Left")}</Badge>;
  };

  const handlePrint = () => {
    if (!filtered.length) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#64748b", accentTextColor: "#ffffff" });
    const fontLink = i18n.language === "ku" ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">' : '<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">';

    const rows = filtered.map((item, i) => {
      const name = getProductNameByLang(item.productName, item.productNameEn || undefined, i18n.language);
      const statusColor = item.status === "expired" ? "#dc2626" : item.status === "expiring_soon" ? "#ea580c" : "#16a34a";
      const statusText = item.status === "expired" ? t("Expired") : item.status === "expiring_soon" ? `${t("Expiring Soon")} (${item.daysLeft})` : `${item.daysLeft} ${t("Days Left")}`;
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11pt;font-weight:700;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:11pt;font-weight:700;">${item.productCode}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11pt;font-weight:700;">${name}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${item.quantity} ${item.unit}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${item.invoiceNumber}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${item.productionDate ? formatDate(item.productionDate) : "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11pt;font-weight:700;">${formatDate(item.expiryDate)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11pt;font-weight:700;color:${statusColor};">${statusText}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        ${fontLink}
        <title>${t("Expiry Report")}</title>
        <style>
          ${printStyles}
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
          td, th, span, div, p, h1, h2, h3 { color: inherit; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;direction:ltr;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;display:block;" />` : ""}
              <h2 style="font-size:9pt;margin:0;padding:0;line-height:1;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
            </div>
            <div style="flex:1;padding:0 20px;">
              <h1 style="font-size:14pt;font-weight:800;margin:0;color:#000;text-align:center;">${t("Expiry Report")}</h1>
              <p style="text-align:center;margin:4px 0 0;font-size:10pt;color:#475569;font-weight:600;">${t("Total")}: ${filtered.length}</p>
            </div>
            <div style="width:70px;"></div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#e2e8f0;color:#000;">
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Product Code")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Product Name")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Quantity")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Invoice Number")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Production Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Expiry Date")}</th>
              <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Status")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (win.document.fonts?.ready) {
        win.document.fonts.ready.then(() => { win.print(); });
      } else {
        setTimeout(() => { win.print(); }, 500);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            {t("Expiry Report")}
          </h1>
        </div>
        <Button onClick={handlePrint} className="bg-primary text-white gap-2 h-11 font-bold" data-testid="button-print-expiry">
          <Printer className="w-5 h-5" />
          {t("Print Report")}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className={`cursor-pointer transition-all rounded-xl ${filter === "all" ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter("all")} data-testid="filter-all">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase">{t("All")}</p>
            <p className="text-2xl font-bold mt-1">{items?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all rounded-xl ${filter === "expired" ? "ring-2 ring-red-500" : ""}`} onClick={() => setFilter("expired")} data-testid="filter-expired">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-bold text-red-600 uppercase">{t("Expired")}</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{expiredCount}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all rounded-xl ${filter === "expiring_soon" ? "ring-2 ring-orange-500" : ""}`} onClick={() => setFilter("expiring_soon")} data-testid="filter-expiring-soon">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-bold text-orange-600 uppercase">{t("Expiring Soon")}</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{soonCount}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all rounded-xl ${filter === "ok" ? "ring-2 ring-green-500" : ""}`} onClick={() => setFilter("ok")} data-testid="filter-ok">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-bold text-green-600 uppercase">{t("Not Expired")}</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{okCount}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mb-2" />
          <p className="font-semibold">{t("No data found")}</p>
        </div>
      ) : (
        <Card className="rounded-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold w-12 text-center">#</TableHead>
                    <TableHead className="text-sm font-bold">{t("Product Code")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Product Name")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Quantity")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Invoice Number")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Production Date")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Expiry Date")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, i) => {
                    const name = getProductNameByLang(item.productName, item.productNameEn || undefined, i18n.language);
                    return (
                      <TableRow key={`${item.id}-${item.invoiceId}`} data-testid={`row-expiry-${item.id}`} className={item.status === "expired" ? "bg-red-50 dark:bg-red-950/20" : item.status === "expiring_soon" ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                        <TableCell className="text-sm font-semibold text-center">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold">{item.productCode}</TableCell>
                        <TableCell className="text-sm font-semibold">{name}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-center">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-center">{item.invoiceNumber}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-center">{item.productionDate ? formatDate(item.productionDate) : "-"}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-center">{formatDate(item.expiryDate)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(item.status, item.daysLeft)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
