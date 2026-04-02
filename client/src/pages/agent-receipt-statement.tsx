import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAgentReceipts } from "@/hooks/use-agent-receipts";
import type { AgentReceipt } from "@shared/schema";
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
import { IconAgent } from "@/components/erp-icons";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

interface CompanyProfileData {
  id: number;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function AgentReceiptStatementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";

  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: allReceipts, isLoading } = useAgentReceipts();
  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });
  const { data: representativesList } = useQuery<{ id: string; name: string; repId: number | null }[]>({
    queryKey: ["/api/agents"],
  });

  const agents = useMemo(() => {
    return (representativesList || []).filter((r: any) => r.repId).map((r: any) => ({
      id: String(r.repId),
      name: r.name,
    }));
  }, [representativesList]);

  const filteredReceipts = useMemo(() => {
    const all = allReceipts || [];
    return all.filter((r: AgentReceipt) => {
      if (selectedAgent && selectedAgent !== "all" && String(r.agentId) !== selectedAgent) return false;
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      return true;
    });
  }, [allReceipts, selectedAgent, fromDate, toDate]);

  const totalUsd = filteredReceipts.reduce((sum, r) => r.currency === "USD" ? sum + parseFloat(r.amount || "0") : sum, 0);
  const totalIqd = filteredReceipts.reduce((sum, r) => r.currency === "IQD" ? sum + parseFloat(r.amount || "0") : sum, 0);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReceipts = filteredReceipts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedAgentName = selectedAgent && selectedAgent !== "all"
    ? agents.find(a => a.id === selectedAgent)?.name || ""
    : t("All Agents");

  const fieldColor = companyProfile?.primaryColor || "#dc2626";
  const textColor = companyProfile?.secondaryColor || "#ffffff";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const printStyles = getModernPrintStyles({ direction: isRtl ? "rtl" : "ltr", accentColor: fieldColor, accentTextColor: textColor });

    const rows = filteredReceipts.map((r: AgentReceipt, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${r.receiptNumber}</td>
        <td>${r.agentName}</td>
        <td>${r.receivedToName}</td>
        <td class="debit">${r.currency === "USD" ? "$" + parseFloat(r.amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}</td>
        <td class="credit">${r.currency === "IQD" ? parseFloat(r.amount || "0").toLocaleString() + " IQD" : "-"}</td>
        <td>${formatDate(r.date)}</td>
        <td>${r.note || "-"}</td>
      </tr>
    `).join("");

    const dateRangeText = `${formatDate(fromDate)} - ${formatDate(toDate)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Agent Receipt Statement")}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="report-banner">
          <div class="banner-right">
            <h1>${t("Agent Receipt Statement")}</h1>
            <div class="supplier-name">${selectedAgentName}</div>
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
          <div class="summary-card accent-green"><div class="label">${t("Total Records")}</div><div class="value green">${filteredReceipts.length}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t("Receipt #")}</th>
              <th>${t("Agent")}</th>
              <th>${t("Received To")}</th>
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
          <IconAgent className="h-7 w-7 text-primary" />
          {t("Agent Receipt Statement")}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t("View amounts received from agents")}</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("Filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-56">
              <Label className="text-sm font-bold mb-1 block">{t("Agent")}</Label>
              <SearchSelect
                items={agents}
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
            <p className="text-xl font-bold font-mono" data-testid="text-total-records">{filteredReceipts.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("Receipts")}
              <Badge variant="secondary" className="ml-2">{filteredReceipts.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-sm font-bold">#</TableHead>
                  <TableHead className="text-sm font-bold">{t("Receipt #")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("Agent")}</TableHead>
                  <TableHead className="text-sm font-bold">{t("Received To")}</TableHead>
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
                ) : paginatedReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t("No receipts found")}</TableCell>
                  </TableRow>
                ) : paginatedReceipts.map((r: AgentReceipt, i: number) => (
                  <TableRow key={r.id} data-testid={`row-receipt-${r.id}`}>
                    <TableCell className="font-mono text-sm font-semibold">{(safePage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold">{r.receiptNumber}</TableCell>
                    <TableCell className="text-sm font-semibold">{r.agentName}</TableCell>
                    <TableCell className="text-sm font-semibold">{r.receivedToName}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-blue-600">
                      {r.currency === "USD" ? usd(parseFloat(r.amount || "0")) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-orange-600">
                      {r.currency === "IQD" ? fmtIqd(parseFloat(r.amount || "0")) : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{formatDate(r.date)}</TableCell>
                    <TableCell className="text-sm font-semibold max-w-[200px] truncate">{r.note || "-"}</TableCell>
                  </TableRow>
                ))}
                {filteredReceipts.length > 0 && (
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
