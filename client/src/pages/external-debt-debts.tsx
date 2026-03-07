import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles } from "@/lib/print-styles";

type ExternalDebtDebt = {
  id: number;
  name: string;
  remainingUsd: number;
  remainingIqd: number;
  lastReceiptAmountUsd: number | null;
  lastReceiptAmountIqd: number | null;
  lastReceiptDate: string | null;
  lastPaymentAmountUsd: number | null;
  lastPaymentAmountIqd: number | null;
  lastPaymentDate: string | null;
};

export default function ExternalDebtDebtsPage() {
  const { t, i18n } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: debts, isLoading } = useQuery<ExternalDebtDebt[]>({
    queryKey: ["/api/external-debt-debts"],
  });

  const totalRemainingUsd = debts?.reduce((sum, d) => sum + d.remainingUsd, 0) || 0;
  const totalRemainingIqd = debts?.reduce((sum, d) => sum + d.remainingIqd, 0) || 0;

  const debtsWithBalance = debts?.filter(d => d.remainingUsd !== 0 || d.remainingIqd !== 0) || [];

  const handlePrint = () => {
    if (!debts) return;
    const dir = i18n.language === "en" ? "ltr" : "rtl";
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const rows = debtsWithBalance.map((d, i) => {
      const recParts: string[] = [];
      if (d.lastReceiptAmountUsd !== null) recParts.push(`<div><span class="green" style="font-weight:600">${usd(d.lastReceiptAmountUsd)}</span></div>`);
      if (d.lastReceiptAmountIqd !== null) recParts.push(`<div><span class="orange" style="font-weight:600">${fmtIqd(d.lastReceiptAmountIqd)} IQD</span></div>`);
      if (d.lastReceiptDate) recParts.push(`<div style="font-size:7.5pt;color:#94a3b8">${formatDate(d.lastReceiptDate)}</div>`);

      const payParts: string[] = [];
      if (d.lastPaymentAmountUsd !== null) payParts.push(`<div><span class="green" style="font-weight:600">${usd(d.lastPaymentAmountUsd)}</span></div>`);
      if (d.lastPaymentAmountIqd !== null) payParts.push(`<div><span class="orange" style="font-weight:600">${fmtIqd(d.lastPaymentAmountIqd)} IQD</span></div>`);
      if (d.lastPaymentDate) payParts.push(`<div style="font-size:7.5pt;color:#94a3b8">${formatDate(d.lastPaymentDate)}</div>`);

      return `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:600">${d.name}</td>
        <td class="debit">${d.remainingUsd !== 0 ? usd(d.remainingUsd) : "-"}</td>
        <td style="font-weight:700;color:#d97706">${d.remainingIqd !== 0 ? fmtIqd(d.remainingIqd) + " IQD" : "-"}</td>
        <td>${recParts.length > 0 ? recParts.join("") : "-"}</td>
        <td>${payParts.length > 0 ? payParts.join("") : "-"}</td>
      </tr>`;
    }).join("");

    printWindow.document.write(`<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head><meta charset="UTF-8" />
        <title>${t("External Debts List")}</title>
        <style>${getModernPrintStyles({ direction: dir as "rtl" | "ltr", accentColor: "#991b1b", accentTextColor: "#ffffff" })}</style>
      </head>
      <body>
        <div class="header">
          <h1>${t("External Debts List")}</h1>
          <p>${formatDate(new Date())}</p>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-green"><div class="label">${t("Total Remaining USD")}</div><div class="value green">${usd(totalRemainingUsd)}</div></div>
          <div class="summary-card accent-orange"><div class="label">${t("Total Remaining IQD")}</div><div class="value orange">${totalRemainingIqd !== 0 ? fmtIqd(totalRemainingIqd) + " IQD" : "-"}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${t("Debt Name")}</th>
            <th>${t("Remaining Balance")} ($)</th>
            <th>${t("Remaining Balance")} (IQD)</th>
            <th>${t("Last Receipt Amount & Date")}</th>
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
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/external-debt-management">
          <Button variant="ghost" size="icon" data-testid="button-back-debt-management">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">{t("External Debts List")}</h1>
          <p className="text-muted-foreground text-sm">{t("View remaining balances for all external debts")}</p>
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
              <Printer className="w-4 h-4 me-2" />
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
                        <TableHead className="text-center w-12">#</TableHead>
                        <TableHead className="text-center">{t("Debt Name")}</TableHead>
                        <TableHead className="text-center">{t("Remaining Balance")} ($)</TableHead>
                        <TableHead className="text-center">{t("Remaining Balance")} (IQD)</TableHead>
                        <TableHead className="text-center">{t("Last Receipt Amount & Date")}</TableHead>
                        <TableHead className="text-center">{t("Last Payment Amount & Date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debtsWithBalance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t("No external debts with outstanding balances")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {debtsWithBalance.map((debt, index) => (
                            <TableRow key={debt.id} data-testid={`row-external-debt-${debt.id}`}>
                              <TableCell className="text-center font-medium">{index + 1}</TableCell>
                              <TableCell className="text-center font-medium">{debt.name}</TableCell>
                              <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                {debt.remainingUsd !== 0 ? usd(debt.remainingUsd) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-bold text-orange-600 dark:text-orange-400">
                                {debt.remainingIqd !== 0 ? `${fmtIqd(debt.remainingIqd)} IQD` : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {debt.lastReceiptAmountUsd !== null || debt.lastReceiptAmountIqd !== null ? (
                                  <div className="space-y-1">
                                    {debt.lastReceiptAmountUsd !== null && (
                                      <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">{usd(debt.lastReceiptAmountUsd)}</span>
                                      </div>
                                    )}
                                    {debt.lastReceiptAmountIqd !== null && (
                                      <div>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{`${fmtIqd(debt.lastReceiptAmountIqd)} IQD`}</span>
                                      </div>
                                    )}
                                    {debt.lastReceiptDate && (
                                      <div className="text-muted-foreground text-xs">{formatDate(debt.lastReceiptDate)}</div>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {debt.lastPaymentAmountUsd !== null || debt.lastPaymentAmountIqd !== null ? (
                                  <div className="space-y-1">
                                    {debt.lastPaymentAmountUsd !== null && (
                                      <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">{usd(debt.lastPaymentAmountUsd)}</span>
                                      </div>
                                    )}
                                    {debt.lastPaymentAmountIqd !== null && (
                                      <div>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{`${fmtIqd(debt.lastPaymentAmountIqd)} IQD`}</span>
                                      </div>
                                    )}
                                    {debt.lastPaymentDate && (
                                      <div className="text-muted-foreground text-xs">{formatDate(debt.lastPaymentDate)}</div>
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
