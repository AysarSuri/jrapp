import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { TransferOffice } from "@shared/schema";
import { usd, formatDate } from "@/lib/format-utils";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";

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
  office: TransferOffice;
  entries: StatementEntry[];
}

export default function OfficeStatementUsdPage() {
  const { t } = useTranslation();
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");

  const { data: officesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const offices = officesList || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: [`/api/office-statement/${selectedOfficeId}`],
    enabled: !!selectedOfficeId,
  });

  const entries = statement?.entries || [];

  let runningUsd = parseFloat(statement?.office?.oldDebtUsd || "0");
  const entriesWithBalance = entries.map((entry) => {
    runningUsd += entry.debitUsd - entry.creditUsd;
    return { ...entry, balanceUsd: runningUsd };
  });

  const totalDebitUsd = entries.reduce((s, e) => s + e.debitUsd, 0);
  const totalCreditUsd = entries.reduce((s, e) => s + e.creditUsd, 0);
  const finalBalanceUsd = parseFloat(statement?.office?.oldDebtUsd || "0") + totalDebitUsd - totalCreditUsd;

  const typeBadge = (type: string) => {
    if (type === "receipt") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Receipt')}</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Payment')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          {t('Office Account Statement USD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('General ledger for transfer office accounts in USD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Office')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchSelect items={offices} value={selectedOfficeId} onValueChange={setSelectedOfficeId} placeholder={t('Select office...')} data-testid="select-office-statement-usd" />
        </CardContent>
      </Card>

      {selectedOfficeId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedOfficeId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{t('Opening Balance (Opening Balance)')}</p>
                <p className="font-mono font-bold text-amber-800 dark:text-amber-300">{usd(statement.office.oldDebtUsd)}</p>
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
                    <TableCell className="font-mono text-blue-600">{usd(statement.office.oldDebtUsd)}</TableCell>
                  </TableRow>
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-office-statement-usd-${entry.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(entry.date)}</TableCell>
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
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No transactions found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {entries.length > 0 && (
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
