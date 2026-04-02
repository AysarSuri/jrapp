import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useExpenses } from "@/hooks/use-expenses";
import { SearchSelect } from "@/components/search-select";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Printer, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { IconExpense } from "@/components/erp-icons";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

interface CompanyProfileData {
  id: number;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function AgentExpenseStatementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";

  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: allExpenses, isLoading } = useExpenses();
  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const agentItems = useMemo(() => {
    const all = allExpenses || [];
    const names = new Set<string>();
    all.forEach((e: any) => { if (e.agentName) names.add(e.agentName); });
    return Array.from(names).sort().map(n => ({ id: n, name: n }));
  }, [allExpenses]);

  const filteredExpenses = useMemo(() => {
    const all = allExpenses || [];
    return all.filter((e: any) => {
      if (selectedAgent && selectedAgent !== "all" && e.agentName !== selectedAgent) return false;
      if (!e.agentName) return false;
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    });
  }, [allExpenses, selectedAgent, fromDate, toDate]);

  const totalUsd = filteredExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amountUsd || "0"), 0);
  const totalIqd = filteredExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amountIqd || "0"), 0);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = filteredExpenses.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedAgentLabel = selectedAgent && selectedAgent !== "all"
    ? selectedAgent
    : t("All Agents");

  const fieldColor = companyProfile?.primaryColor || "#dc2626";
  const textColor = companyProfile?.secondaryColor || "#ffffff";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor });

    const rows = filteredExpenses.map((e: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${e.invoiceNumber || "-"}</td>
        <td>${e.agentName || "-"}</td>
        <td>${e.expenseTypeName || "-"}</td>
        <td class="debit">${parseFloat(e.amountUsd || "0") > 0 ? "$" + parseFloat(e.amountUsd).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}</td>
        <td class="credit">${parseFloat(e.amountIqd || "0") > 0 ? parseFloat(e.amountIqd).toLocaleString() + " IQD" : "-"}</td>
        <td>${formatDate(e.date)}</td>
        <td>${e.description || "-"}</td>
      </tr>
    `).join("");

    const dateRangeText = `${formatDate(fromDate)} - ${formatDate(toDate)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Agent Expense Statement")}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="report-banner">
          <div class="banner-right">
            <h1>${t("Agent Expense Statement")}</h1>
            <div class="supplier-name">${selectedAgentLabel}</div>
            <div class="date-range">${dateRangeText}</div>
          </div>
          <div class="banner-left" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:10px;" />` : ""}
            ${companyProfile?.name ? `<div style="font-size:11pt;font-weight:700;color:${fieldColor};">${companyProfile.name}</div>` : ""}
          </div>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-blue"><div class="label">${t("Total USD")}</div><div class="value blue">${usd(totalUsd)}</div></div>
          <div class="summary-card accent-red"><div class="label">${t("Total IQD")}</div><div class="value red">${totalIqd.toLocaleString()} IQD</div></div>
          <div class="summary-card accent-green"><div class="label">${t("Total Records")}</div><div class="value green">${filteredExpenses.length}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Invoice #")}</th>
              <th>${t("Agent Name")}</th>
              <th>${t("Expense Type")}</th>
              <th>${t("USD Amount")}</th>
              <th>${t("IQD Amount")}</th>
              <th>${t("Date")}</th>
              <th>${t("Note")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="4"><strong>${t("Total")}</strong></td>
              <td class="debit"><strong>${totalUsd > 0 ? usd(totalUsd) : "-"}</strong></td>
              <td class="credit"><strong>${totalIqd > 0 ? totalIqd.toLocaleString() + " IQD" : "-"}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(() => setTimeout(() => printWindow.print(), 200));
    } else {
      setTimeout(() => printWindow.print(), 800);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <IconExpense className="h-7 w-7 text-primary" />
          {t("Agent Expense Statement")}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t("View expenses by agent")}</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("Filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-56">
              <Label className="text-sm font-bold mb-1 block">{t("Agent Name")}</Label>
              <SearchSelect
                items={agentItems}
                value={selectedAgent}
                onValueChange={(id) => { setSelectedAgent(id); setCurrentPage(1); }}
                placeholder={t("All Agents")}
                showAllOption
                allOptionLabel={t("All Agents")}
                data-testid="select-filter-agent"
              />
            </div>
            <div>
              <Label className="text-sm font-bold mb-1 block">{t("From Date")}</Label>
              <DateInput value={fromDate} onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-from-date" />
            </div>
            <div>
              <Label className="text-sm font-bold mb-1 block">{t("To Date")}</Label>
              <DateInput value={toDate} onChange={e => { setToDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-to-date" />
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 h-9" data-testid="button-print-statement">
              <Printer className="h-5 w-5" />
              {t("Print Report")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("Total USD")}</p>
            <p className="text-xl font-bold text-blue-600 font-mono" data-testid="text-total-usd">{usd(totalUsd)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-900">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("Total IQD")}</p>
            <p className="text-xl font-bold text-orange-600 font-mono" data-testid="text-total-iqd">{fmtIqd(totalIqd)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("Total Records")}</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-records">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("Expenses")}
              <Badge variant="secondary" className="ml-2">{filteredExpenses.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-sm font-bold">#</TableHead>
                  <TableHead className="text-sm font-bold">{t("Invoice #")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("Agent Name")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("Expense Type")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("USD Amount")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("IQD Amount")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("Note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t("Loading...")}</TableCell>
                  </TableRow>
                ) : paginatedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t("No expenses found")}</TableCell>
                  </TableRow>
                ) : paginatedExpenses.map((e: any, i: number) => (
                  <TableRow key={e.id} data-testid={`row-expense-${e.id}`}>
                    <TableCell className="font-mono text-sm font-semibold">{(safePage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold">{e.invoiceNumber || "-"}</TableCell>
                    <TableCell className="text-sm font-semibold">{e.agentName || "-"}</TableCell>
                    <TableCell className="text-sm font-semibold">{e.expenseTypeName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-blue-600">
                      {parseFloat(e.amountUsd || "0") > 0 ? usd(parseFloat(e.amountUsd)) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-orange-600">
                      {parseFloat(e.amountIqd || "0") > 0 ? fmtIqd(parseFloat(e.amountIqd)) : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{formatDate(e.date)}</TableCell>
                    <TableCell className="text-sm font-semibold max-w-[200px] truncate">{e.description || "-"}</TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length > 0 && (
                  <TableRow className="bg-muted/60 font-bold border-t-2">
                    <TableCell colSpan={4} className="text-sm font-bold">{t("Total")}</TableCell>
                    <TableCell className="font-mono text-sm font-bold text-blue-600">{totalUsd > 0 ? usd(totalUsd) : "-"}</TableCell>
                    <TableCell className="font-mono text-sm font-bold text-orange-600">{totalIqd > 0 ? fmtIqd(totalIqd) : "-"}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t("Page")} {safePage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} data-testid="button-prev-page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} data-testid="button-next-page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
