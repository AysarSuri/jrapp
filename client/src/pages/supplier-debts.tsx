import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

type SupplierDebt = {
  id: number;
  name: string;
  remainingUsd: number;
  remainingIqd: number;
  lastInvoiceAmountUsd: number | null;
  lastInvoiceDateUsd: string | null;
  lastInvoiceAmountIqd: number | null;
  lastInvoiceDateIqd: string | null;
  lastPaymentAmountUsd: number | null;
  lastPaymentDateUsd: string | null;
  lastPaymentAmountIqd: number | null;
  lastPaymentDateIqd: string | null;
};

export default function SupplierDebtsPage() {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: debts, isLoading } = useQuery<SupplierDebt[]>({
    queryKey: ["/api/supplier-debts"],
    staleTime: 0,
    refetchInterval: 5000,
  });

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; address: string | null; phone: string | null; primaryColor: string | null; secondaryColor: string | null }>({
    queryKey: ["/api/company-profile"],
  });

  const handlePrint = () => {
    if (!debts) return;
    const dir = i18n.language === "en" ? "ltr" : "rtl";
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const rows = suppliersWithDebt.map((s, i) => {
      const invParts: string[] = [];
      if (s.lastInvoiceAmountUsd !== null) invParts.push(`<div><span class="green" style="font-weight:600">${usd(s.lastInvoiceAmountUsd)}</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(s.lastInvoiceDateUsd)}</div></div>`);
      if (s.lastInvoiceAmountIqd !== null) invParts.push(`<div><span class="orange" style="font-weight:600">${fmtIqd(s.lastInvoiceAmountIqd)} IQD</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(s.lastInvoiceDateIqd)}</div></div>`);
      const payParts: string[] = [];
      if ((s.lastPaymentAmountUsd || 0) > 0) payParts.push(`<div><span class="green" style="font-weight:600">${usd(s.lastPaymentAmountUsd!)}</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(s.lastPaymentDateUsd)}</div></div>`);
      if ((s.lastPaymentAmountIqd || 0) > 0) payParts.push(`<div><span class="orange" style="font-weight:600">${fmtIqd(s.lastPaymentAmountIqd!)} IQD</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(s.lastPaymentDateIqd)}</div></div>`);
      return `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:600">${s.name}</td>
        <td class="debit">${s.remainingUsd !== 0 ? usd(s.remainingUsd) : "-"}</td>
        <td style="font-weight:700;color:#d97706">${s.remainingIqd !== 0 ? fmtIqd(s.remainingIqd) + " IQD" : "-"}</td>
        <td>${invParts.length > 0 ? invParts.join("") : "-"}</td>
        <td>${payParts.length > 0 ? payParts.join("") : "-"}</td>
      </tr>`;
    }).join("");

    const accentColor = companyProfile?.primaryColor || "#991b1b";
    const accentText = companyProfile?.secondaryColor || "#ffffff";
    const currentTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const logoHtml = companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:8px" />` : "";
    const companyNameHtml = companyProfile?.name ? `<div style="font-size:14pt;font-weight:800;color:${accentColor}">${companyProfile.name}</div>` : "";
    const companyAddressHtml = companyProfile?.address ? `<div style="font-size:9pt;color:#64748b">${companyProfile.address}</div>` : "";

    printWindow.document.write(`<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}<meta charset="UTF-8" />
        <title>${t("Supplier Debts List")}</title>
        <style>${getModernPrintStyles({ direction: dir as "rtl" | "ltr", accentColor, accentTextColor: accentText })}</style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;direction:ltr">
          <div style="display:flex;align-items:center;gap:12px">
            ${logoHtml}
            <div>
              ${companyNameHtml}
              ${companyAddressHtml}
            </div>
          </div>
          <div style="text-align:right">
            <h1 style="font-size:16pt;font-weight:800;color:${accentColor};margin:0">${t("Supplier Debts List")}</h1>
            <p style="margin:4px 0 0;font-size:11pt;font-weight:700;color:#333">${formatDate(new Date())} &nbsp;|&nbsp; ${currentTime}</p>
          </div>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-green"><div class="label">${t("Total Remaining USD")}</div><div class="value green">${usd(totalRemainingUsd)}</div></div>
          <div class="summary-card accent-orange"><div class="label">${t("Total Remaining IQD")}</div><div class="value orange">${totalRemainingIqd !== 0 ? fmtIqd(totalRemainingIqd) + " IQD" : "-"}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${t("Supplier Name")}</th>
            <th>${t("Remaining Balance")} ($)</th>
            <th>${t("Remaining Balance")} (IQD)</th>
            <th>${t("Last Invoice Amount & Date")}</th>
            <th>${t("Last Payment Amount & Date")}</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="2" style="font-weight:800">${t("Total")}</td>
              <td class="debit">${usd(totalRemainingUsd)}</td>
              <td style="font-weight:800;color:#d97706">${totalRemainingIqd !== 0 ? fmtIqd(totalRemainingIqd) + " IQD" : "-"}</td>
              <td>-</td><td>-</td>
            </tr>
          </tbody>
        </table>
      </body></html>`);
    printWindow.document.close();
    const doPrint = () => printWindow.print();
    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(() => setTimeout(doPrint, 200));
    } else {
      setTimeout(doPrint, 800);
    }
  };

  const totalRemainingUsd = debts?.reduce((sum, d) => sum + d.remainingUsd, 0) || 0;
  const totalRemainingIqd = debts?.reduce((sum, d) => sum + d.remainingIqd, 0) || 0;

  const suppliersWithDebt = debts?.filter(d => d.remainingUsd !== 0 || d.remainingIqd !== 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/supplier-management">
          <Button variant="ghost" size="icon" data-testid="button-back-supplier-management">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">{t("Supplier Debts List")}</h1>
          <p className="text-muted-foreground text-sm">{t("View remaining balances for all suppliers")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">{t("Total Remaining USD")}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-remaining-usd">{usd(totalRemainingUsd)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">{t("Total Remaining IQD")}</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-total-remaining-iqd">{totalRemainingIqd !== 0 ? `${fmtIqd(totalRemainingIqd)} IQD` : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={handlePrint} variant="outline" size="sm" data-testid="button-print-debts">
              <Printer className="w-5 h-5 me-2" />
              {t("Print")}
            </Button>
          </div>

          <div ref={printRef}>
            <h2 style={{ textAlign: "center", marginBottom: 16 }}>{t("Supplier Debts List")}</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center w-12">#</TableHead>
                        <TableHead className="text-center">{t("Supplier Name")}</TableHead>
                        <TableHead className="text-center">{t("Remaining Balance")} ($)</TableHead>
                        <TableHead className="text-center">{t("Remaining Balance")} (IQD)</TableHead>
                        <TableHead className="text-center">{t("Last Invoice Amount & Date")}</TableHead>
                        <TableHead className="text-center">{t("Last Payment Amount & Date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliersWithDebt.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t("No suppliers with outstanding debts")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {suppliersWithDebt.map((supplier, index) => (
                            <TableRow key={supplier.id} data-testid={`row-supplier-debt-${supplier.id}`}>
                              <TableCell className="text-center font-medium">{index + 1}</TableCell>
                              <TableCell className="text-center font-medium">{supplier.name}</TableCell>
                              <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                {supplier.remainingUsd !== 0 ? usd(supplier.remainingUsd) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-bold text-orange-600 dark:text-orange-400">
                                {supplier.remainingIqd !== 0 ? `${fmtIqd(supplier.remainingIqd)} IQD` : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {supplier.lastInvoiceAmountUsd !== null || supplier.lastInvoiceAmountIqd !== null ? (
                                  <div className="space-y-1">
                                    {supplier.lastInvoiceAmountUsd !== null && (
                                      <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">{usd(supplier.lastInvoiceAmountUsd)}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(supplier.lastInvoiceDateUsd)}</div>
                                      </div>
                                    )}
                                    {supplier.lastInvoiceAmountIqd !== null && (
                                      <div>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{`${fmtIqd(supplier.lastInvoiceAmountIqd)} IQD`}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(supplier.lastInvoiceDateIqd)}</div>
                                      </div>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {supplier.lastPaymentAmountUsd !== null || supplier.lastPaymentAmountIqd !== null ? (
                                  <div className="space-y-1">
                                    {supplier.lastPaymentAmountUsd !== null && (supplier.lastPaymentAmountUsd || 0) > 0 && (
                                      <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">{usd(supplier.lastPaymentAmountUsd)}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(supplier.lastPaymentDateUsd)}</div>
                                      </div>
                                    )}
                                    {supplier.lastPaymentAmountIqd !== null && (supplier.lastPaymentAmountIqd || 0) > 0 && (
                                      <div>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{`${fmtIqd(supplier.lastPaymentAmountIqd)} IQD`}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(supplier.lastPaymentDateIqd)}</div>
                                      </div>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell className="text-center" colSpan={2}>{t("Total")}</TableCell>
                            <TableCell className="text-center text-green-600 dark:text-green-400">{usd(totalRemainingUsd)}</TableCell>
                            <TableCell className="text-center text-orange-600 dark:text-orange-400">{totalRemainingIqd !== 0 ? `${fmtIqd(totalRemainingIqd)} IQD` : "-"}</TableCell>
                            <TableCell className="text-center">-</TableCell>
                            <TableCell className="text-center">-</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
