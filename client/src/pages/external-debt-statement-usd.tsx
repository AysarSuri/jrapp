import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { ExternalDebt } from "@shared/schema";
import { usd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles } from "@/lib/print-styles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Printer } from "lucide-react";
import i18n from "@/lib/i18n";

type CompanyProfileData = {
  id: number;
  name: string;
  logo: string | null;
  cliche: string | null;
  primaryColor: string;
  secondaryColor: string;
};

interface StatementEntry {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string | null;
  reference: string | null;
  debitUsd: number;
  debitIqd: number;
  creditUsd: number;
  creditIqd: number;
}

interface StatementResponse {
  debt: ExternalDebt;
  entries: StatementEntry[];
}

export default function ExternalDebtStatementUsdPage() {
  const { t } = useTranslation();
  const [selectedDebtId, setSelectedDebtId] = useState<string>("");
  const [debtSearch, setDebtSearch] = useState("");
  const [showDebtSuggestions, setShowDebtSuggestions] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: debtsList } = useQuery<ExternalDebt[]>({
    queryKey: ["/api/external-debts"],
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const debts = debtsList || [];

  const debtSuggestions = useMemo(() => {
    if (!debtSearch.trim() || !debts.length) return debts.slice(0, 8);
    const q = debtSearch.toLowerCase();
    return debts.filter((d: ExternalDebt) => d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [debtSearch, debts]);

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/external-debt-statement", selectedDebtId],
    queryFn: async () => {
      const res = await fetch(`/api/external-debt-statement/${selectedDebtId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedDebtId,
  });

  const filteredEntries = useMemo(() => {
    const entries = statement?.entries || [];
    return entries.filter(e => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    });
  }, [statement, fromDate, toDate]);

  let runningUsd = parseFloat(statement?.debt?.oldDebtUsd || "0");
  const entriesWithBalance = filteredEntries.map((entry) => {
    runningUsd += entry.debitUsd - entry.creditUsd;
    return { ...entry, balanceUsd: runningUsd };
  });

  const totalDebitUsd = filteredEntries.reduce((s, e) => s + e.debitUsd, 0);
  const totalCreditUsd = filteredEntries.reduce((s, e) => s + e.creditUsd, 0);
  const finalBalanceUsd = parseFloat(statement?.debt?.oldDebtUsd || "0") + totalDebitUsd - totalCreditUsd;

  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const fieldColor = companyProfile?.primaryColor || "#2563eb";
  const textColor = companyProfile?.secondaryColor || "#ffffff";

  const typeBadge = (type: string) => {
    if (type === "receipt") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Receipt')}</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Payment')}</Badge>;
  };

  const handlePrintReport = () => {
    if (!statement) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const debtName = statement.debt.name;
    const dateRangeText = fromDate && toDate
      ? `${formatDate(fromDate)} - ${formatDate(toDate)}`
      : fromDate ? `${formatDate(fromDate)} - ${t("Now")}`
      : toDate ? `${t("Beginning")} - ${formatDate(toDate)}`
      : formatDate(new Date());

    const openingUsd = parseFloat(statement.debt.oldDebtUsd || "0");

    const rows = entriesWithBalance.map((entry, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDate(entry.date)}</td>
        <td>${entry.time || "-"}</td>
        <td><span class="${entry.type === 'receipt' ? 'badge-green' : 'badge-red'}">${entry.type === 'receipt' ? t('Receipt') : t('Payment')}</span></td>
        <td>${entry.description || "-"}</td>
        <td>${entry.reference || "-"}</td>
        <td class="debit">${entry.debitUsd > 0 ? usd(entry.debitUsd) : ""}</td>
        <td class="credit">${entry.creditUsd > 0 ? usd(entry.creditUsd) : ""}</td>
        <td class="balance">${usd(entry.balanceUsd)}</td>
      </tr>
    `).join("");

    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        <meta charset="UTF-8" />
        <title>${t("External Debt Statement USD")} - ${debtName}</title>
        <style>
          ${printStyles}
          .badge-green { background: #dcfce7; color: #15803d; padding: 2px 10px; border-radius: 6px; font-size: 10pt; font-weight: 600; }
          .badge-red { background: #fee2e2; color: #b91c1c; padding: 2px 10px; border-radius: 6px; font-size: 10pt; font-weight: 600; }
          .balance { color: #2563eb; font-weight: 700; }
          .opening-row { background: #fffbeb; }
          .opening-row td { color: #b45309; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="report-banner">
          <div class="banner-right">
            <h1>${t("External Debt Statement USD")}</h1>
            <div class="supplier-name">${debtName}</div>
            <div class="date-range">${dateRangeText}</div>
          </div>
          <div class="banner-left" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:10px;" />` : ""}
            ${companyProfile?.name ? `<div style="font-size:11pt;font-weight:700;color:${fieldColor};">${companyProfile.name}</div>` : ""}
          </div>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-amber"><div class="label">${t("Opening Balance (Opening Balance)")}</div><div class="value" style="color:#b45309;">${usd(openingUsd)}</div></div>
          <div class="summary-card accent-green"><div class="label">${t("Total Receipts")}</div><div class="value green">${usd(totalDebitUsd)}</div></div>
          <div class="summary-card accent-red"><div class="label">${t("Total Payments")}</div><div class="value red">${usd(totalCreditUsd)}</div></div>
          <div class="summary-card accent-blue"><div class="label">${t("Final Balance")}</div><div class="value blue">${usd(finalBalanceUsd)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Date")}</th>
              <th>${t("Time")}</th>
              <th>${t("Type")}</th>
              <th>${t("Description")}</th>
              <th>${t("Reference")}</th>
              <th>${t("Debit USD")}</th>
              <th>${t("Credit USD")}</th>
              <th>${t("Balance USD")}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-row">
              <td colspan="6">${t("Opening Balance (Opening Balance)")}</td>
              <td colspan="2"></td>
              <td class="balance">${usd(openingUsd)}</td>
            </tr>
            ${rows}
            ${filteredEntries.length > 0 ? `
            <tr class="total-row">
              <td colspan="6"><strong>${t("Total")}</strong></td>
              <td class="debit"><strong>${usd(totalDebitUsd)}</strong></td>
              <td class="credit"><strong>${usd(totalCreditUsd)}</strong></td>
              <td class="balance"><strong>${usd(finalBalanceUsd)}</strong></td>
            </tr>` : ""}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          {t('External Debt Statement USD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('Ledger for external debts in USD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2 w-64 relative">
              <Label>{t('External Debt')}</Label>
              <Input
                value={debtSearch}
                onChange={(e) => {
                  setDebtSearch(e.target.value);
                  setShowDebtSuggestions(true);
                  if (!e.target.value.trim()) { setSelectedDebtId(""); }
                }}
                onFocus={() => setShowDebtSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDebtSuggestions(false), 200)}
                placeholder={t('Select external debt...')}
                data-testid="input-search-debt-statement-usd"
                autoComplete="off"
              />
              {showDebtSuggestions && debtSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {debtSuggestions.map((item: ExternalDebt) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedDebtId(String(item.id));
                        setDebtSearch(item.name);
                        setShowDebtSuggestions(false);
                      }}
                      data-testid={`suggestion-debt-statement-usd-${item.id}`}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('From Date')}</Label>
              <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" data-testid="input-debt-statement-usd-from-date" />
            </div>
            <div className="space-y-2">
              <Label>{t('To Date')}</Label>
              <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" data-testid="input-debt-statement-usd-to-date" />
            </div>
            {selectedDebtId && statement && !statementLoading && (
              <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-2 h-9" data-testid="button-print-debt-statement-usd">
                <Printer className="h-4 w-4" />
                {t('Print Report')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDebtId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedDebtId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{t('Opening Balance (Opening Balance)')}</p>
                <p className="font-mono font-bold text-amber-800 dark:text-amber-300">{usd(statement.debt.oldDebtUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('Total Receipts')}</p>
                <p className="font-mono font-bold text-green-800 dark:text-green-300">{usd(totalDebitUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-red-700 dark:text-red-400 mb-1">{t('Total Payments')}</p>
                <p className="font-mono font-bold text-red-800 dark:text-red-300">{usd(totalCreditUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">{t('Final Balance')}</p>
                <p className="font-mono font-bold text-blue-800 dark:text-blue-300">{usd(finalBalanceUsd)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400">{t('Debit USD')}</TableHead>
                    <TableHead className="text-red-700 dark:text-red-400">{t('Credit USD')}</TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance USD')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-amber-50/50 dark:bg-amber-950/20 font-medium">
                    <TableCell colSpan={6} className="text-amber-700 dark:text-amber-400">
                      {t('Opening Balance (Opening Balance)')}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="font-mono text-blue-600">{usd(statement.debt.oldDebtUsd)}</TableCell>
                  </TableRow>
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-ext-debt-stmt-usd-${entry.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.date}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.time}</TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.reference || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {entry.debitUsd > 0 ? usd(entry.debitUsd) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {entry.creditUsd > 0 ? usd(entry.creditUsd) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {usd(entry.balanceUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No transactions found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredEntries.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6} className="text-end">{t('Total')}</TableCell>
                      <TableCell className="font-mono text-green-700">{usd(totalDebitUsd)}</TableCell>
                      <TableCell className="font-mono text-red-700">{usd(totalCreditUsd)}</TableCell>
                      <TableCell className="font-mono text-blue-700">{usd(finalBalanceUsd)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
