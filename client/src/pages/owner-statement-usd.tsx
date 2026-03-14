import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { Owner } from "@shared/schema";
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
import { Loader2, Printer } from "lucide-react";
import { IconDollar } from "@/components/erp-icons";
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
  owner: Owner;
  entries: StatementEntry[];
}

export default function OwnerStatementUsdPage() {
  const { t } = useTranslation();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: ownersList } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const owners = ownersList || [];

  const ownerSuggestions = useMemo(() => {
    if (!ownerSearch.trim() || !owners.length) return owners.slice(0, 8);
    const q = ownerSearch.toLowerCase();
    return owners.filter((o: Owner) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [ownerSearch, owners]);

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/owner-statement", selectedOwnerId],
    queryFn: async () => {
      const res = await fetch(`/api/owner-statement/${selectedOwnerId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedOwnerId,
  });

  const filteredEntries = useMemo(() => {
    const entries = statement?.entries || [];
    return entries.filter(e => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    });
  }, [statement, fromDate, toDate]);

  let runningUsd = parseFloat(statement?.owner?.oldDebtUsd || "0");
  const entriesWithBalance = filteredEntries.map((entry) => {
    runningUsd += entry.debitUsd - entry.creditUsd;
    return { ...entry, balanceUsd: runningUsd };
  });

  const totalDebitUsd = filteredEntries.reduce((s, e) => s + e.debitUsd, 0);
  const totalCreditUsd = filteredEntries.reduce((s, e) => s + e.creditUsd, 0);
  const finalBalanceUsd = parseFloat(statement?.owner?.oldDebtUsd || "0") + totalDebitUsd - totalCreditUsd;

  const finalBalanceLabel = finalBalanceUsd >= 0
    ? `${t('Withdrawals of')} ${statement?.owner?.name || ""}`
    : `${t('Remaining at')} ${companyProfile?.name || t('Company')}`;

  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const fieldColor = companyProfile?.primaryColor || "#2563eb";
  const textColor = companyProfile?.secondaryColor || "#ffffff";

  const typeBadge = (type: string) => {
    if (type === "withdrawal") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Withdrawal')}</Badge>;
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Return')}</Badge>;
  };

  const handlePrintReport = () => {
    if (!statement) return;
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const ownerName = statement.owner.name;
    const dateRangeText = fromDate && toDate
      ? `${formatDate(fromDate)} - ${formatDate(toDate)}`
      : fromDate ? `${formatDate(fromDate)} - ${t("Now")}`
      : toDate ? `${t("Beginning")} - ${formatDate(toDate)}`
      : formatDate(new Date());

    const openingUsd = parseFloat(statement.owner.oldDebtUsd || "0");

    const rows = entriesWithBalance.map((entry, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDate(entry.date)}</td>
        <td>${entry.time || "-"}</td>
        <td><span class="${entry.type === 'withdrawal' ? 'badge-red' : 'badge-green'}">${entry.type === 'withdrawal' ? t('Withdrawal') : t('Return')}</span></td>
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
        <title>${t("Owner Statement USD")} - ${ownerName}</title>
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
            <h1>${t("Owner Statement USD")}</h1>
            <div class="supplier-name">${ownerName}</div>
            <div class="date-range">${dateRangeText}</div>
          </div>
          <div class="banner-left" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:10px;" />` : ""}
            ${companyProfile?.name ? `<div style="font-size:11pt;font-weight:700;color:${fieldColor};">${companyProfile.name}</div>` : ""}
          </div>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-amber"><div class="label">${t("Opening Balance (Opening Balance)")}</div><div class="value" style="color:#b45309;">${usd(openingUsd)}</div></div>
          <div class="summary-card accent-red"><div class="label">${t("Total Withdrawals")}</div><div class="value red">${usd(totalDebitUsd)}</div></div>
          <div class="summary-card accent-green"><div class="label">${t("Total Returns")}</div><div class="value green">${usd(totalCreditUsd)}</div></div>
          <div class="summary-card ${finalBalanceUsd >= 0 ? 'accent-red' : 'accent-green'}"><div class="label">${finalBalanceLabel}</div><div class="value ${finalBalanceUsd >= 0 ? 'red' : 'green'}">${finalBalanceUsd >= 0 ? '' : '-'}${usd(Math.abs(finalBalanceUsd))}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Date")}</th>
              <th>${t("Time")}</th>
              <th>${t("Type")}</th>
              <th>${t("Note")}</th>
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
    const doPrintFn = () => printWindow.print(); if (printWindow.document.fonts?.ready) { printWindow.document.fonts.ready.then(() => setTimeout(doPrintFn, 200)); } else { setTimeout(doPrintFn, 800); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <IconDollar className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          {t('Owner Statement USD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('Ledger for owner withdrawals and returns in USD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2 w-64 relative">
              <Label>{t('Owner Name')}</Label>
              <Input
                value={ownerSearch}
                onChange={(e) => {
                  setOwnerSearch(e.target.value);
                  setShowOwnerSuggestions(true);
                  if (!e.target.value.trim()) { setSelectedOwnerId(""); }
                }}
                onFocus={() => setShowOwnerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowOwnerSuggestions(false), 200)}
                placeholder={t('Select owner...')}
                data-testid="input-search-owner-statement-usd"
                autoComplete="off"
              />
              {showOwnerSuggestions && ownerSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {ownerSuggestions.map((item: Owner) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedOwnerId(String(item.id));
                        setOwnerSearch(item.name);
                        setShowOwnerSuggestions(false);
                      }}
                      data-testid={`suggestion-owner-statement-usd-${item.id}`}
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
              <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" data-testid="input-owner-statement-usd-from-date" />
            </div>
            <div className="space-y-2">
              <Label>{t('To Date')}</Label>
              <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" data-testid="input-owner-statement-usd-to-date" />
            </div>
            {selectedOwnerId && statement && !statementLoading && (
              <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-2 h-9" data-testid="button-print-owner-statement-usd">
                <Printer className="h-5 w-5" />
                {t('Print Report')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOwnerId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedOwnerId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{t('Opening Balance (Opening Balance)')}</p>
                <p className="font-mono font-bold text-amber-800 dark:text-amber-300" data-testid="text-owner-stmt-usd-opening">{usd(statement.owner.oldDebtUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-red-700 dark:text-red-400 mb-1">{t('Total Withdrawals')}</p>
                <p className="font-mono font-bold text-red-800 dark:text-red-300" data-testid="text-owner-stmt-usd-withdrawals">{usd(totalDebitUsd)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('Total Returns')}</p>
                <p className="font-mono font-bold text-green-800 dark:text-green-300" data-testid="text-owner-stmt-usd-returns">{usd(totalCreditUsd)}</p>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${finalBalanceUsd >= 0 ? 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800' : 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800'}`}>
              <CardContent className="pt-4 pb-3">
                <p className={`text-xs mb-1 ${finalBalanceUsd >= 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>{finalBalanceLabel}</p>
                <p className={`font-mono font-bold ${finalBalanceUsd >= 0 ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`} data-testid="text-owner-stmt-usd-final">{usd(Math.abs(finalBalanceUsd))}</p>
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
                    <TableHead className="text-red-700 dark:text-red-400">{t('Debit USD')}</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400">{t('Credit USD')}</TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance USD')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-amber-50/50 dark:bg-amber-950/20 font-medium">
                    <TableCell colSpan={6} className="text-amber-700 dark:text-amber-400">
                      {t('Opening Balance (Opening Balance)')}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="font-mono text-blue-600">{usd(statement.owner.oldDebtUsd)}</TableCell>
                  </TableRow>
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-owner-stmt-usd-${entry.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.time}</TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.reference || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {entry.debitUsd > 0 ? usd(entry.debitUsd) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
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
                      <TableCell className="font-mono text-red-700">{usd(totalDebitUsd)}</TableCell>
                      <TableCell className="font-mono text-green-700">{usd(totalCreditUsd)}</TableCell>
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
