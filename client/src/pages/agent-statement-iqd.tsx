import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchSelect } from "@/components/search-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { IconDinar } from "@/components/erp-icons";
import { formatDate } from "@/lib/format-utils";
import { DateInput } from "@/components/ui/date-input";

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

interface CustomerData {
  id: number;
  name: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
}

interface StatementResponse {
  customer: CustomerData;
  entries: StatementEntry[];
}

export default function AgentStatementIqdPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const { data: clientsList } = useQuery<CustomerData[]>({
    queryKey: ["/api/clients"],
  });

  const customers = (clientsList || []).filter((c: any) => c.type === "customer");

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: ["/api/customer-statement", selectedCustomerId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/customer-statement/${selectedCustomerId}?fromDate=${fromDate}&toDate=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedCustomerId,
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

  const typeBadge = (type: string) => {
    if (type === "sales_invoice") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Sales Invoice')}</Badge>;
    if (type === "sales_return") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('Sales Return')}</Badge>;
    if (type === "customer_receipt") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Receipt')}</Badge>;
    if (type === "discount") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('Discount')}</Badge>;
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
          <CardTitle className="text-lg">{t('Select Customer')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Label className="text-base font-bold mb-1 block">{t('Customer Name')}</Label>
              <SearchSelect
                items={customers.map((c: any) => ({ id: c.id, name: c.name }))}
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                placeholder={t('Select customer...')}
                data-testid="select-customer-statement"
                className="h-11 text-base font-semibold"
              />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t('From Date')}</Label>
              <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 text-base font-semibold w-40" data-testid="input-statement-from-date" />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t('To Date')}</Label>
              <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 text-base font-semibold w-40" data-testid="input-statement-to-date" />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCustomerId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedCustomerId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className={`text-xs mb-1 ${finalBalance > 0 ? 'text-red-700 dark:text-red-400' : finalBalance < 0 ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>{t('Remaining with')} {finalBalance > 0 ? (statement?.customer?.name || "") : (companyProfile?.name || "")}</p>
                <p className={`font-mono font-bold ${finalBalance > 0 ? 'text-red-800 dark:text-red-300' : finalBalance < 0 ? 'text-green-800 dark:text-green-300' : 'text-blue-800 dark:text-blue-300'}`} data-testid="text-final-balance">
                  {formatIQD(Math.abs(finalBalance))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Date')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Time')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Type')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Description')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Reference')}</TableHead>
                    <TableHead className="text-sm font-bold text-red-700 dark:text-red-400">{t('Debit')} (IQD)</TableHead>
                    <TableHead className="text-sm font-bold text-green-700 dark:text-green-400">{t('Credit')} (IQD)</TableHead>
                    <TableHead className="text-sm font-bold text-blue-700 dark:text-blue-400">{t('Balance')} (IQD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesWithBalance.map((entry, i) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-customer-statement-${entry.id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{entry.time}</TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell className="text-sm font-semibold max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                      <TableCell className="text-sm font-semibold text-muted-foreground">{entry.reference || "-"}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-red-600">
                        {entry.debit > 0 ? formatIQD(entry.debit) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-green-600">
                        {entry.credit > 0 ? formatIQD(entry.credit) : ""}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-blue-600">
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
                      <TableCell colSpan={6} className="text-end text-sm font-bold">{t('Total')}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-red-700">{formatIQD(totalDebit)}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-green-700">{formatIQD(totalCredit)}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-blue-700">{formatIQD(finalBalance)}</TableCell>
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
