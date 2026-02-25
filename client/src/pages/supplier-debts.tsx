import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";

type SupplierDebt = {
  id: number;
  name: string;
  remainingUsd: number;
  remainingIqd: number;
  lastInvoiceAmount: number | null;
  lastInvoiceCurrency: string | null;
  lastInvoiceDate: string | null;
  lastPaymentAmountUsd: number | null;
  lastPaymentAmountIqd: number | null;
  lastPaymentDate: string | null;
};

function iqd(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num) || num === 0) return "-";
  return `${fmtIqd(num)} IQD`;
}

function formatCurrency(amount: number | null, currency: string | null): string {
  if (amount === null || amount === 0) return "-";
  if (currency === "IQD") return `${fmtIqd(amount)} IQD`;
  return usd(amount);
}

export default function SupplierDebtsPage() {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: debts, isLoading } = useQuery<SupplierDebt[]>({
    queryKey: ["/api/supplier-debts"],
  });

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${t("Supplier Debts List")}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; direction: rtl; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 8px 12px; text-align: center; font-size: 13px; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .totals-row { font-weight: bold; background-color: #f9f9f9; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const totalRemainingUsd = debts?.reduce((sum, d) => sum + d.remainingUsd, 0) || 0;
  const totalRemainingIqd = debts?.reduce((sum, d) => sum + d.remainingIqd, 0) || 0;

  const suppliersWithDebt = debts?.filter(d => d.remainingUsd !== 0 || d.remainingIqd !== 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/supplier-management">
          <Button variant="ghost" size="icon" data-testid="button-back-supplier-management">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">{t("Supplier Debts List")}</h1>
          <p className="text-muted-foreground text-sm">{t("View remaining balances for all suppliers")}</p>
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
            <h2 style={{ textAlign: "center", marginBottom: 16 }}>{t("Supplier Debts List")}</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center w-12">#</TableHead>
                        <TableHead className="text-center">{t("Supplier Name")}</TableHead>
                        <TableHead className="text-center">{t("Remaining Balance")} ($)</TableHead>
                        <TableHead className="text-center">{t("Remaining Balance")} (IQD)</TableHead>
                        <TableHead className="text-center">{t("Last Invoice Amount & Date")}</TableHead>
                        <TableHead className="text-center">{t("Last Payment Amount & Date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliersWithDebt.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t("No suppliers with outstanding debts")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {suppliersWithDebt.map((supplier, index) => (
                            <TableRow key={supplier.id} data-testid={`row-supplier-debt-${supplier.id}`}>
                              <TableCell className="text-center font-medium">{index + 1}</TableCell>
                              <TableCell className="text-center font-medium">{supplier.name}</TableCell>
                              <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                {supplier.remainingUsd !== 0 ? usd(supplier.remainingUsd) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-bold text-orange-600 dark:text-orange-400">
                                {supplier.remainingIqd !== 0 ? `${fmtIqd(supplier.remainingIqd)} IQD` : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {supplier.lastInvoiceAmount !== null ? (
                                  <div>
                                    <div className="font-medium">{formatCurrency(supplier.lastInvoiceAmount, supplier.lastInvoiceCurrency)}</div>
                                    <div className="text-muted-foreground text-xs">{formatDate(supplier.lastInvoiceDate)}</div>
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {supplier.lastPaymentDate ? (
                                  <div>
                                    <div className="font-medium">
                                      {(supplier.lastPaymentAmountUsd || 0) > 0 && usd(supplier.lastPaymentAmountUsd!)}
                                      {(supplier.lastPaymentAmountUsd || 0) > 0 && (supplier.lastPaymentAmountIqd || 0) > 0 && " + "}
                                      {(supplier.lastPaymentAmountIqd || 0) > 0 && `${fmtIqd(supplier.lastPaymentAmountIqd!)} IQD`}
                                    </div>
                                    <div className="text-muted-foreground text-xs">{formatDate(supplier.lastPaymentDate)}</div>
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
