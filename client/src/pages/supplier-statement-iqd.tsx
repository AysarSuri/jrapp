import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Loader2, Receipt, Banknote, ArrowDownToLine, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Client = {
  id: number;
  name: string;
  type: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
};

type StatementEntry = {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string;
  debitUsd: number;
  debitIqd: number;
  creditUsd: number;
  creditIqd: number;
  note: string | null;
};

type StatementResponse = {
  supplier: Client;
  entries: StatementEntry[];
};

export default function SupplierStatementIqdPage() {
  const { t } = useTranslation();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const suppliers = clients?.filter((c) => c.type === "supplier") || [];

  const { data: statement, isLoading: statementLoading } = useQuery<StatementResponse>({
    queryKey: [`/api/supplier-statement/${selectedSupplierId}`],
    enabled: !!selectedSupplierId,
  });

  const entries = statement?.entries || [];
  const iqdEntries = entries.filter(e => e.debitIqd > 0 || e.creditIqd > 0);

  let runningIqd = parseFloat(statement?.supplier?.oldDebtIqd || "0");
  const entriesWithBalance = iqdEntries.map((entry) => {
    runningIqd += entry.debitIqd - entry.creditIqd;
    return { ...entry, balanceIqd: runningIqd };
  });

  const totalDebitIqd = iqdEntries.reduce((s, e) => s + e.debitIqd, 0);
  const totalCreditIqd = iqdEntries.reduce((s, e) => s + e.creditIqd, 0);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "purchase_invoice":
        return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800 gap-1"><Receipt className="w-3 h-3" />{t("Purchase Invoice")}</Badge>;
      case "payment":
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800 gap-1"><Banknote className="w-3 h-3" />{t("Payment")}</Badge>;
      case "adjustment_received":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1"><ArrowDownToLine className="w-3 h-3" />{t("Received")}</Badge>;
      case "adjustment_discount":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 gap-1"><Tag className="w-3 h-3" />{t("Discount")}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-supplier-statement-iqd-title">
          <Banknote className="h-8 w-8 text-orange-600" />
          {t("Supplier Statement - IQD")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("View supplier account statement in Iraqi Dinar")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5" />
            {t("Select Supplier")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger data-testid="select-supplier-statement-iqd" className="max-w-md">
              <SelectValue placeholder={t("Select supplier...")} />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={String(s.id)} data-testid={`select-supplier-iqd-${s.id}`}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSupplierId && statementLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSupplierId && statement && !statementLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Old Debt IQD")}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{fmt(parseFloat(statement.supplier.oldDebtIqd || "0"))} IQD</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Total Payments IQD")}</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(totalCreditIqd)} IQD</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("Final Balance IQD")}</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balanceIqd : parseFloat(statement.supplier.oldDebtIqd || "0"))} IQD</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("Account Statement")} - {statement.supplier.name} (IQD)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t("No transactions found")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-center">#</TableHead>
                        <TableHead>{t("Date")}</TableHead>
                        <TableHead>{t("Type")}</TableHead>
                        <TableHead>{t("Description")}</TableHead>
                        <TableHead className="text-center bg-red-50 dark:bg-red-950/20">{t("Debit IQD")}</TableHead>
                        <TableHead className="text-center bg-green-50 dark:bg-green-950/20">{t("Credit IQD")}</TableHead>
                        <TableHead className="text-center bg-blue-50 dark:bg-blue-950/20">{t("Balance IQD")}</TableHead>
                        <TableHead>{t("Note")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell colSpan={2}>{t("Opening Balance (Old Debt)")}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center font-bold text-red-600 dark:text-red-400">{fmt(parseFloat(statement.supplier.oldDebtIqd || "0"))} IQD</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {entriesWithBalance.map((entry, idx) => (
                        <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-statement-iqd-${idx}`}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap">{entry.date}<br /><span className="text-xs text-muted-foreground">{entry.time}</span></TableCell>
                          <TableCell>{getTypeBadge(entry.type)}</TableCell>
                          <TableCell className="text-sm">{entry.description}</TableCell>
                          <TableCell className="text-center">
                            {entry.debitIqd > 0 ? <span className="text-red-600 dark:text-red-400 font-medium">{fmt(entry.debitIqd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.creditIqd > 0 ? <span className="text-green-600 dark:text-green-400 font-medium">{fmt(entry.creditIqd)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <span className={entry.balanceIqd >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                              {fmt(entry.balanceIqd)} IQD
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{entry.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell colSpan={2}>{t("Total")}</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400">{fmt(totalDebitIqd)}</TableCell>
                        <TableCell className="text-center text-green-600 dark:text-green-400">{fmt(totalCreditIqd)}</TableCell>
                        <TableCell className="text-center text-blue-600 dark:text-blue-400">
                          {fmt(entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balanceIqd : parseFloat(statement.supplier.oldDebtIqd || "0"))} IQD
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
