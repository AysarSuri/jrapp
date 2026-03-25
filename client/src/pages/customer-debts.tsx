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

type CustomerDebt = {
  id: number;
  name: string;
  address: string;
  mobile: string;
  remainingUsd: number;
  remainingIqd: number;
  lastInvoiceAmountUsd: number | null;
  lastInvoiceDateUsd: string | null;
  lastInvoiceAmountIqd: number | null;
  lastInvoiceDateIqd: string | null;
  lastReceiptAmountUsd: number | null;
  lastReceiptDateUsd: string | null;
  lastReceiptAmountIqd: number | null;
  lastReceiptDateIqd: string | null;
};

export default function CustomerDebtsPage() {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: debts, isLoading } = useQuery<CustomerDebt[]>({
    queryKey: ["/api/customer-debts"],
    staleTime: 0,
    refetchInterval: 5000,
  });

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; address: string | null; phone: string | null; primaryColor: string | null; secondaryColor: string | null }>({
    queryKey: ["/api/company-profile"],
  });

  const totalRemainingUsd = debts?.reduce((sum, d) => sum + d.remainingUsd, 0) || 0;
  const totalRemainingIqd = debts?.reduce((sum, d) => sum + d.remainingIqd, 0) || 0;

  const customersWithDebt = debts?.filter(d => d.remainingUsd !== 0 || d.remainingIqd !== 0) || [];

  const handlePrint = () => {
    if (!debts) return;
    const dir = i18n.language === "en" ? "ltr" : "rtl";
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const rows = customersWithDebt.map((c, i) => {
      const invParts: string[] = [];
      if (c.lastInvoiceAmountUsd !== null) invParts.push(`<div><span class="green" style="font-weight:600">${usd(c.lastInvoiceAmountUsd)}</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(c.lastInvoiceDateUsd)}</div></div>`);
      if (c.lastInvoiceAmountIqd !== null) invParts.push(`<div><span class="orange" style="font-weight:600">${fmtIqd(c.lastInvoiceAmountIqd)} IQD</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(c.lastInvoiceDateIqd)}</div></div>`);
      const recParts: string[] = [];
      if ((c.lastReceiptAmountUsd || 0) > 0) recParts.push(`<div><span class="green" style="font-weight:600">${usd(c.lastReceiptAmountUsd!)}</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(c.lastReceiptDateUsd)}</div></div>`);
      if ((c.lastReceiptAmountIqd || 0) > 0) recParts.push(`<div><span class="orange" style="font-weight:600">${fmtIqd(c.lastReceiptAmountIqd!)} IQD</span><div style="font-size:7.5pt;color:#94a3b8">${formatDate(c.lastReceiptDateIqd)}</div></div>`);
      return `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:600">${c.name}</td>
        <td>${c.address || "-"}</td>
        <td>${c.mobile || "-"}</td>
        <td class="debit">${c.remainingUsd !== 0 ? usd(c.remainingUsd) : "-"}</td>
        <td style="font-weight:700;color:#d97706">${c.remainingIqd !== 0 ? fmtIqd(c.remainingIqd) + " IQD" : "-"}</td>
        <td>${invParts.length > 0 ? invParts.join("") : "-"}</td>
        <td>${recParts.length > 0 ? recParts.join("") : "-"}</td>
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
        <title>${t("Customer Debts List")}</title>
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
            <h1 style="font-size:16pt;font-weight:800;color:${accentColor};margin:0">${t("Customer Debts List")}</h1>
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
            <th>${t("Customer Name")}</th>
            <th>${t("Address")}</th>
            <th>${t("Mobile")}</th>
            <th>${t("Remaining Balance")} ($)</th>
            <th>${t("Remaining Balance")} (IQD)</th>
            <th>${t("Last Invoice Amount & Date")}</th>
            <th>${t("Last Receipt Amount & Date")}</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="4" style="font-weight:800">${t("Total")}</td>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales-management">
          <Button variant="ghost" size="icon" data-testid="button-back-sales-management">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">{t("Customer Debts List")}</h1>
          <p className="text-muted-foreground text-sm">{t("View remaining balances for all customers")}</p>
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
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center text-sm font-bold w-12">#</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Customer Name")}</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Address")}</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Mobile")}</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Remaining Balance")} ($)</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Remaining Balance")} (IQD)</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Last Invoice Amount & Date")}</TableHead>
                        <TableHead className="text-center text-sm font-bold">{t("Last Receipt Amount & Date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersWithDebt.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {t("No customers with outstanding debts")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {customersWithDebt.map((customer, index) => (
                            <TableRow key={customer.id} data-testid={`row-customer-debt-${customer.id}`}>
                              <TableCell className="text-center text-sm font-semibold">{index + 1}</TableCell>
                              <TableCell className="text-center text-sm font-semibold">{customer.name}</TableCell>
                              <TableCell className="text-center text-sm font-semibold">{customer.address || "-"}</TableCell>
                              <TableCell className="text-center text-sm font-semibold">{customer.mobile || "-"}</TableCell>
                              <TableCell className="text-center text-sm font-bold text-green-600 dark:text-green-400">
                                {customer.remainingUsd !== 0 ? usd(customer.remainingUsd) : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm font-bold text-orange-600 dark:text-orange-400">
                                {customer.remainingIqd !== 0 ? `${fmtIqd(customer.remainingIqd)} IQD` : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {customer.lastInvoiceAmountUsd !== null || customer.lastInvoiceAmountIqd !== null ? (
                                  <div className="space-y-1">
                                    {customer.lastInvoiceAmountUsd !== null && (
                                      <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">{usd(customer.lastInvoiceAmountUsd)}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(customer.lastInvoiceDateUsd)}</div>
                                      </div>
                                    )}
                                    {customer.lastInvoiceAmountIqd !== null && (
                                      <div>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{`${fmtIqd(customer.lastInvoiceAmountIqd)} IQD`}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(customer.lastInvoiceDateIqd)}</div>
                                      </div>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {customer.lastReceiptAmountUsd !== null || customer.lastReceiptAmountIqd !== null ? (
                                  <div className="space-y-1">
                                    {customer.lastReceiptAmountUsd !== null && (customer.lastReceiptAmountUsd || 0) > 0 && (
                                      <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">{usd(customer.lastReceiptAmountUsd)}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(customer.lastReceiptDateUsd)}</div>
                                      </div>
                                    )}
                                    {customer.lastReceiptAmountIqd !== null && (customer.lastReceiptAmountIqd || 0) > 0 && (
                                      <div>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{`${fmtIqd(customer.lastReceiptAmountIqd)} IQD`}</span>
                                        <div className="text-muted-foreground text-xs">{formatDate(customer.lastReceiptDateIqd)}</div>
                                      </div>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell className="text-center" colSpan={4}>{t("Total")}</TableCell>
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
