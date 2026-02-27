import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { CustomsClearance } from "@shared/schema";
import { usd, formatDate } from "@/lib/format-utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, DollarSign, Banknote } from "lucide-react";

interface StatementEntry {
  id: number;
  date: string;
  time: string;
  type: string;
  source: string;
  description: string | null;
  reference: string | null;
  debitUsd: number;
  debitIqd: number;
  creditUsd: number;
  creditIqd: number;
}

interface StatementResponse {
  clearance: CustomsClearance;
  entries: StatementEntry[];
}

export default function ClearanceStatementPage() {
  const { t } = useTranslation();
  const [selectedClearanceId, setSelectedClearanceId] = useState<string>("");

  const { data: clearancesList } = useQuery<CustomsClearance[]>({
    queryKey: ["/api/customs-clearances"],
  });

  const clearances = clearancesList || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/clearance-statement", selectedClearanceId],
    enabled: !!selectedClearanceId,
  });

  const entries = statement?.entries || [];

  const usdEntries = entries.filter(e => e.debitUsd > 0 || e.creditUsd > 0);
  const iqdEntries = entries.filter(e => e.debitIqd > 0 || e.creditIqd > 0);

  const openingUsd = parseFloat(statement?.clearance?.oldDebtUsd || "0");
  const openingIqd = parseFloat(statement?.clearance?.oldDebtIqd || "0");

  let runUsd = openingUsd;
  const usdWithBalance = usdEntries.map((entry) => {
    runUsd += entry.debitUsd - entry.creditUsd;
    return { ...entry, balance: runUsd };
  });

  let runIqd = openingIqd;
  const iqdWithBalance = iqdEntries.map((entry) => {
    runIqd += entry.debitIqd - entry.creditIqd;
    return { ...entry, balance: runIqd };
  });

  const totalDebitUsd = usdEntries.reduce((s, e) => s + e.debitUsd, 0);
  const totalCreditUsd = usdEntries.reduce((s, e) => s + e.creditUsd, 0);
  const finalBalanceUsd = openingUsd + totalDebitUsd - totalCreditUsd;

  const totalDebitIqd = iqdEntries.reduce((s, e) => s + e.debitIqd, 0);
  const totalCreditIqd = iqdEntries.reduce((s, e) => s + e.creditIqd, 0);
  const finalBalanceIqd = openingIqd + totalDebitIqd - totalCreditIqd;

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";
  const fmtUsd = (val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const typeBadge = (type: string, source: string) => {
    if (source === "invoice") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('Customs Fee')}</Badge>;
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
          {t('Clearance Account Statement')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('General ledger for customs clearance accounts in USD and IQD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Clearance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClearanceId} onValueChange={setSelectedClearanceId}>
            <SelectTrigger data-testid="select-clearance-statement" className="max-w-md">
              <SelectValue placeholder={t('Select clearance...')} />
            </SelectTrigger>
            <SelectContent>
              {clearances.map((b) => (
                <SelectItem key={b.id} value={String(b.id)} data-testid={`select-clearance-${b.id}`}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClearanceId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedClearanceId && statement && !statementLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* USD Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">{t('USD Statement')}</h2>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-0.5">{t('Opening Balance')}</p>
                  <p className="font-mono font-bold text-sm text-amber-800 dark:text-amber-300" data-testid="text-usd-opening">{fmtUsd(openingUsd)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-green-700 dark:text-green-400 mb-0.5">{t('Total Receipts')}</p>
                  <p className="font-mono font-bold text-sm text-green-800 dark:text-green-300" data-testid="text-usd-total-debit">{fmtUsd(totalDebitUsd)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-red-700 dark:text-red-400 mb-0.5">{t('Total Payments')}</p>
                  <p className="font-mono font-bold text-sm text-red-800 dark:text-red-300" data-testid="text-usd-total-credit">{fmtUsd(totalCreditUsd)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 mb-0.5">{t('Final Balance')}</p>
                  <p className="font-mono font-bold text-sm text-blue-800 dark:text-blue-300" data-testid="text-usd-final-balance">{fmtUsd(finalBalanceUsd)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Type')}</TableHead>
                      <TableHead>{t('Description')}</TableHead>
                      <TableHead className="text-green-700 dark:text-green-400">{t('Debit')}</TableHead>
                      <TableHead className="text-red-700 dark:text-red-400">{t('Credit')}</TableHead>
                      <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-amber-50/50 dark:bg-amber-950/20 font-medium">
                      <TableCell colSpan={4} className="text-amber-700 dark:text-amber-400 text-sm">
                        {t('Opening Balance')}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="font-mono text-sm text-blue-600 font-bold">{fmtUsd(openingUsd)}</TableCell>
                    </TableRow>
                    {usdWithBalance.map((entry, i) => (
                      <TableRow key={`usd-${entry.source}-${entry.id}`} data-testid={`row-usd-statement-${entry.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{formatDate(entry.date)}</TableCell>
                        <TableCell>{typeBadge(entry.type, entry.source)}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{entry.description || "-"}</TableCell>
                        <TableCell className="font-mono text-sm text-green-600">
                          {entry.debitUsd > 0 ? fmtUsd(entry.debitUsd) : ""}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {entry.creditUsd > 0 ? fmtUsd(entry.creditUsd) : ""}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-blue-600">
                          {fmtUsd(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {usdEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">
                          {t('No transactions found')}
                        </TableCell>
                      </TableRow>
                    )}
                    {usdEntries.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4} className="text-end text-sm">{t('Total')}</TableCell>
                        <TableCell className="font-mono text-green-700 text-sm">{fmtUsd(totalDebitUsd)}</TableCell>
                        <TableCell className="font-mono text-red-700 text-sm">{fmtUsd(totalCreditUsd)}</TableCell>
                        <TableCell className="font-mono text-blue-700 text-sm">{fmtUsd(finalBalanceUsd)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* IQD Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-orange-700 dark:text-orange-400">{t('IQD Statement')}</h2>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-0.5">{t('Opening Balance')}</p>
                  <p className="font-mono font-bold text-sm text-amber-800 dark:text-amber-300" data-testid="text-iqd-opening">{formatIQD(openingIqd)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-green-700 dark:text-green-400 mb-0.5">{t('Total Receipts')}</p>
                  <p className="font-mono font-bold text-sm text-green-800 dark:text-green-300" data-testid="text-iqd-total-debit">{formatIQD(totalDebitIqd)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-red-700 dark:text-red-400 mb-0.5">{t('Total Payments')}</p>
                  <p className="font-mono font-bold text-sm text-red-800 dark:text-red-300" data-testid="text-iqd-total-credit">{formatIQD(totalCreditIqd)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-3 pb-2 px-3">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 mb-0.5">{t('Final Balance')}</p>
                  <p className="font-mono font-bold text-sm text-blue-800 dark:text-blue-300" data-testid="text-iqd-final-balance">{formatIQD(finalBalanceIqd)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-orange-200 dark:border-orange-900 shadow-sm">
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50/50 dark:bg-orange-950/20">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Type')}</TableHead>
                      <TableHead>{t('Description')}</TableHead>
                      <TableHead className="text-green-700 dark:text-green-400">{t('Debit')}</TableHead>
                      <TableHead className="text-red-700 dark:text-red-400">{t('Credit')}</TableHead>
                      <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-amber-50/50 dark:bg-amber-950/20 font-medium">
                      <TableCell colSpan={4} className="text-amber-700 dark:text-amber-400 text-sm">
                        {t('Opening Balance')}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="font-mono text-sm text-blue-600 font-bold">{formatIQD(openingIqd)}</TableCell>
                    </TableRow>
                    {iqdWithBalance.map((entry, i) => (
                      <TableRow key={`iqd-${entry.source}-${entry.id}`} data-testid={`row-iqd-statement-${entry.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{formatDate(entry.date)}</TableCell>
                        <TableCell>{typeBadge(entry.type, entry.source)}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{entry.description || "-"}</TableCell>
                        <TableCell className="font-mono text-sm text-green-600">
                          {entry.debitIqd > 0 ? formatIQD(entry.debitIqd) : ""}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {entry.creditIqd > 0 ? formatIQD(entry.creditIqd) : ""}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-blue-600">
                          {formatIQD(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {iqdEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">
                          {t('No transactions found')}
                        </TableCell>
                      </TableRow>
                    )}
                    {iqdEntries.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4} className="text-end text-sm">{t('Total')}</TableCell>
                        <TableCell className="font-mono text-green-700 text-sm">{formatIQD(totalDebitIqd)}</TableCell>
                        <TableCell className="font-mono text-red-700 text-sm">{formatIQD(totalCreditIqd)}</TableCell>
                        <TableCell className="font-mono text-blue-700 text-sm">{formatIQD(finalBalanceIqd)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
