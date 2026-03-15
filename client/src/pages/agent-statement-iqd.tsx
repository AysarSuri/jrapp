import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { Representative } from "@shared/schema";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchSelect } from "@/components/search-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { IconDinar } from "@/components/erp-icons";
import { formatDate } from "@/lib/format-utils";

interface CompanyProfileData {
  id: number;
  name: string;
}

interface StatementEntry {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string | null;
  reference: string | null;
  currency: string;
  debit: number;
  credit: number;
}

interface StatementResponse {
  agent: Representative;
  entries: StatementEntry[];
}

export default function AgentStatementIqdPage() {
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const { data: agentsList } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"],
  });

  const agents = agentsList || [];

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/agent-statement", selectedAgentId],
    queryFn: async () => {
      const res = await fetch(`/api/agent-statement/${selectedAgentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedAgentId,
  });

  const iqdEntries = statement?.entries?.filter(e => e.currency === "IQD") || [];

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  let runningBalance = 0;
  const entriesWithBalance = iqdEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  const totalDebit = iqdEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = iqdEntries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = totalDebit - totalCredit;
  const currentDebt = parseFloat(statement?.agent?.debtIqd || "0");

  const typeBadge = (type: string) => {
    if (type === "sales_invoice") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Sales Invoice')}</Badge>;
    if (type === "sales_return") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('Sales Return')}</Badge>;
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Payment')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <IconDinar className="h-7 w-7 text-orange-600 dark:text-orange-400" />
          </div>
          {t('Agent Statement IQD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('Agent account ledger in IQD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Agent')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchSelect
            items={agents.map(a => ({ id: a.id, name: a.name }))}
            value={selectedAgentId}
            onValueChange={setSelectedAgentId}
            placeholder={t('Select agent...')}
            data-testid="select-agent-statement"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {selectedAgentId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedAgentId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-red-700 dark:text-red-400 mb-1">{t('Total Debit')}</p>
                <p className="font-mono font-bold text-red-800 dark:text-red-300" data-testid="text-total-debit">
                  {formatIQD(totalDebit)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('Total Credit')}</p>
                <p className="font-mono font-bold text-green-800 dark:text-green-300" data-testid="text-total-credit">
                  {formatIQD(totalCredit)}
                </p>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${finalBalance > 0 ? 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800' : finalBalance < 0 ? 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800' : 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
              <CardContent className="pt-4 pb-3">
                <p className={`text-xs mb-1 ${finalBalance > 0 ? 'text-red-700 dark:text-red-400' : finalBalance < 0 ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>{t('Remaining with')} {finalBalance > 0 ? (statement?.agent?.name || "") : (companyProfile?.name || "")}</p>
                <p className={`font-mono font-bold ${finalBalance > 0 ? 'text-red-800 dark:text-red-300' : finalBalance < 0 ? 'text-green-800 dark:text-green-300' : 'text-blue-800 dark:text-blue-300'}`} data-testid="text-final-balance">
                  {formatIQD(Math.abs(finalBalance))}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{t('Current Debt IQD')}</p>
                <p className="font-mono font-bold text-amber-800 dark:text-amber-300" data-testid="text-current-debt">
                  {formatIQD(currentDebt)}
                </p>
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
                    <TableHead className="text-red-700 dark:text-red-400">{t('Debit')} (IQD)</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400">{t('Credit')} (IQD)</TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance')} (IQD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-agent-statement-${entry.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.time}</TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.reference || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {entry.debit > 0 ? formatIQD(entry.debit) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {entry.credit > 0 ? formatIQD(entry.credit) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {formatIQD(entry.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {iqdEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No transactions found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {iqdEntries.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6} className="text-end">{t('Total')}</TableCell>
                      <TableCell className="font-mono text-red-700">{formatIQD(totalDebit)}</TableCell>
                      <TableCell className="font-mono text-green-700">{formatIQD(totalCredit)}</TableCell>
                      <TableCell className="font-mono text-blue-700">{formatIQD(finalBalance)}</TableCell>
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
