import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { Representative } from "@shared/schema";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign } from "lucide-react";

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

export default function AgentStatementUsdPage() {
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const { data: agentsList } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"],
  });

  const agents = agentsList || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/agent-statement", selectedAgentId],
    queryFn: async () => {
      const res = await fetch(`/api/agent-statement/${selectedAgentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedAgentId,
  });

  const usdEntries = statement?.entries?.filter(e => e.currency === "USD") || [];

  let runningBalance = 0;
  const entriesWithBalance = usdEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  const totalDebit = usdEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = usdEntries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = totalDebit - totalCredit;
  const currentDebt = parseFloat(statement?.agent?.debtUsd || "0");

  const typeBadge = (type: string) => {
    if (type === "sales_invoice") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Sales Invoice')}</Badge>;
    if (type === "sales_return") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('Sales Return')}</Badge>;
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Payment')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          {t('Agent Statement USD')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('Agent account ledger in USD')}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Select Agent')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger data-testid="select-agent-statement" className="max-w-md">
              <SelectValue placeholder={t('Select agent...')} />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={String(a.id)} data-testid={`select-agent-${a.id}`}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  ${totalDebit.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('Total Credit')}</p>
                <p className="font-mono font-bold text-green-800 dark:text-green-300" data-testid="text-total-credit">
                  ${totalCredit.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">{t('Final Balance')}</p>
                <p className="font-mono font-bold text-blue-800 dark:text-blue-300" data-testid="text-final-balance">
                  ${finalBalance.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{t('Current Debt USD')}</p>
                <p className="font-mono font-bold text-amber-800 dark:text-amber-300" data-testid="text-current-debt">
                  ${currentDebt.toFixed(2)}
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
                    <TableHead className="text-red-700 dark:text-red-400">{t('Debit')} ($)</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400">{t('Credit')} ($)</TableHead>
                    <TableHead className="text-blue-700 dark:text-blue-400">{t('Balance')} ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-agent-statement-${entry.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.date}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.time}</TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.reference || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-green-600">
                        {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        ${entry.balance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {usdEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No transactions found')}
                      </TableCell>
                    </TableRow>
                  )}
                  {usdEntries.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6} className="text-end">{t('Total')}</TableCell>
                      <TableCell className="font-mono text-red-700">${totalDebit.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-green-700">${totalCredit.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-blue-700">${finalBalance.toFixed(2)}</TableCell>
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
