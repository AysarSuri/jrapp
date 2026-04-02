import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgentClient } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Trash2, RotateCcw, ChevronLeft, ChevronRight, Printer, MessageCircle } from "lucide-react";
import { IconCustomers, IconAgent } from "@/components/erp-icons";
import { SearchSelect } from "@/components/search-select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { PRINT_FONT_LINKS, openPrintWindow } from "@/lib/print-styles";
import { captureElementAsPdf } from "@/lib/pdf-utils";
import { formatDate } from "@/lib/format-utils";
import { AddressSearchSelect } from "@/components/address-search-select";

type AgentClientWithDetails = AgentClient & {
  clientAddress?: string | null;
  clientContact?: string | null;
};

export default function AgentClientsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const printRef = useRef<HTMLDivElement>(null);

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; cliche: string | null; address: string | null; mobile1: string | null; primaryColor: string | null }>({
    queryKey: ["/api/company-profile"],
  });
  const { data: agentsList } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/agents"],
  });
  const { data: customersList } = useQuery<{ id: number; name: string; type: string; address: string | null }[]>({
    queryKey: ["/api/clients"],
  });
  const { data: addressesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/addresses"],
  });
  const { data: allAssignments, isLoading } = useQuery<AgentClientWithDetails[]>({
    queryKey: ["/api/agent-clients"],
  });

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [addressFilter, setAddressFilter] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyAddressFilter, setHistoryAddressFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const agents = agentsList || [];
  const addresses = addressesList || [];
  const allCustomers = (customersList || []).filter(c => c.type === "customer");
  const customers = addressFilter && addressFilter !== "all"
    ? allCustomers.filter(c => c.address === addressFilter)
    : allCustomers;
  const assignments = allAssignments || [];

  const { data: agentAssignments } = useQuery<AgentClient[]>({
    queryKey: ["/api/agent-clients/by-agent", selectedAgentId],
    queryFn: () => fetch(`/api/agent-clients/by-agent/${selectedAgentId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedAgentId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { agentUserId: string; agentName: string; clientIds: number[] }) =>
      apiRequest("POST", "/api/agent-clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-clients/by-agent", selectedAgentId] });
      toast({ title: t("Clients assigned successfully") });
    },
    onError: async (error: any) => {
      let msg = t("Failed to assign clients");
      try {
        if (error?.message) msg = error.message;
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/agent-clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-clients/by-agent", selectedAgentId] });
      toast({ title: t("Assignment removed successfully") });
    },
    onError: () => {
      toast({ title: t("Failed to remove assignment"), variant: "destructive" });
    },
  });

  const selectAgent = useCallback((id: string) => {
    setSelectedAgentId(id);
    const agent = agents.find(a => a.id === id);
    if (agent) setSelectedAgentName(agent.name);
    setSelectedClientIds([]);
  }, [agents]);

  const loadExistingAssignments = useCallback(() => {
    if (agentAssignments) {
      setSelectedClientIds(agentAssignments.map(a => a.clientId));
    }
  }, [agentAssignments]);

  useEffect(() => {
    if (agentAssignments) {
      setSelectedClientIds(agentAssignments.map(a => a.clientId));
    }
  }, [agentAssignments]);

  const otherAgentAssignments = new Map<number, string>();
  assignments.forEach(a => {
    if (a.agentUserId !== selectedAgentId) {
      otherAgentAssignments.set(a.clientId, a.agentName);
    }
  });

  const toggleClient = (clientId: number) => {
    if (otherAgentAssignments.has(clientId)) return;
    setSelectedClientIds(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    setSelectedClientIds(customers.filter(c => !otherAgentAssignments.has(c.id)).map(c => c.id));
  };

  const deselectAllClients = () => {
    setSelectedClientIds([]);
  };

  const handleSave = () => {
    if (!selectedAgentId) {
      toast({ title: t("Please select an agent"), variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      agentUserId: selectedAgentId,
      agentName: selectedAgentName,
      clientIds: selectedClientIds,
    });
  };

  const resetForm = () => {
    setSelectedAgentId("");
    setSelectedAgentName("");
    setSelectedClientIds([]);
  };

  const filteredAssignments = assignments.filter(a => {
    if (historyFilter && historyFilter !== "all" && a.agentUserId !== historyFilter) return false;
    if (historyAddressFilter && historyAddressFilter !== "all" && a.clientAddress !== historyAddressFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAssignments = filteredAssignments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const assignedToAgent = agentAssignments || [];

  const buildReportHtml = () => {
    const dataToUse = filteredAssignments;
    const grouped: Record<string, AgentClientWithDetails[]> = {};
    dataToUse.forEach(a => {
      if (!grouped[a.agentName]) grouped[a.agentName] = [];
      grouped[a.agentName].push(a);
    });

    const dir = isRtl ? "rtl" : "ltr";
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const accent = companyProfile?.primaryColor || "#7c3aed";

    let tableRows = "";
    let globalIndex = 1;
    const agentNames = Object.keys(grouped).sort();

    agentNames.forEach(agentName => {
      const cls = grouped[agentName];
      tableRows += `<tr><td colspan="4" style="background:${accent}; color:white; font-weight:700; padding:10px 12px; font-size:12pt; border:none;">${agentName} (${cls.length})</td></tr>`;
      cls.forEach(c => {
        tableRows += `<tr>
          <td class="num">${globalIndex}</td>
          <td class="name-cell">${esc(c.clientName)}</td>
          <td>${esc(c.clientAddress || "-")}</td>
          <td style="direction:ltr;">${esc(c.clientContact || "-")}</td>
        </tr>`;
        globalIndex++;
      });
    });
    const companyName = esc(companyProfile?.name || "");
    const companyLogo = companyProfile?.logo || "";
    const companyAddress = esc(companyProfile?.address || "");
    const companyMobile = esc(companyProfile?.mobile1 || "");
    const today = formatDate(new Date());
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const title = t("Agent Client Assignments Report");

    const filterLabel = historyFilter && historyFilter !== "all"
      ? agents.find(a => a.id === historyFilter)?.name || t("All Agents")
      : t("All Agents");

    return { html: `<!DOCTYPE html>
<html dir="${dir}" lang="${i18n.language}">
<head>
  ${PRINT_FONT_LINKS}
  <meta charset="UTF-8" />
  <title>${title} — ${companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Noto Kufi Arabic', 'Inter', -apple-system, sans-serif;
      padding: 20px; font-size: 10pt; direction: ${dir}; color: #1a1a2e; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .header-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; margin-bottom: 14px;
      border: 2px solid #e2e8f0; border-radius: 14px; background: linear-gradient(135deg, #fafbfc, #f8fafc);
    }
    .header-center { display: flex; align-items: center; gap: 12px; flex: 1; justify-content: center; }
    .header-center img { width: 60px; height: 60px; object-fit: contain; border-radius: 10px; }
    .header-center .company-name { font-size: 18pt; font-weight: 800; color: ${accent}; }
    .header-right { text-align: ${dir === "rtl" ? "right" : "left"}; min-width: 180px; }
    .header-right .report-title { font-size: 16pt; font-weight: 800; color: ${accent}; margin-bottom: 2px; }
    .header-right .report-date { font-size: 9pt; color: #64748b; font-weight: 500; }
    .header-left { text-align: ${dir === "rtl" ? "left" : "right"}; min-width: 200px; display: flex; flex-direction: column; gap: 3px; font-size: 8.5pt; color: #64748b; }
    .header-left .contact-item { display: flex; align-items: center; gap: 5px; justify-content: ${dir === "rtl" ? "flex-start" : "flex-end"}; }
    .summary-row { display: flex; gap: 12px; margin-bottom: 14px; }
    .stat-card { flex: 1; border-radius: 10px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
    .stat-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .stat-card.purple { background: #faf5ff; border: 1px solid #e9d5ff; }
    .stat-label { font-size: 8.5pt; color: #64748b; font-weight: 600; }
    .stat-value { font-size: 13pt; font-weight: 800; color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    thead { background: #f1f5f9; }
    th { padding: 8px 10px; text-align: ${dir === "rtl" ? "right" : "left"}; font-weight: 700; color: #334155; border-bottom: 2px solid #e2e8f0; font-size: 9pt; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #fafbfc; }
    .num { text-align: center; color: #94a3b8; font-weight: 600; width: 35px; }
    .name-cell { font-weight: 700; }
    .footer { margin-top: 16px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print { body { padding: 10px 14px; } @page { margin: 8mm; } }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="header-right">
      <div class="report-title">${title}</div>
      <div class="report-date">${today} — ${timeStr}</div>
    </div>
    <div class="header-center">
      ${companyLogo ? `<img src="${companyLogo}" alt="logo" />` : ""}
      <span class="company-name">${companyName}</span>
    </div>
    <div class="header-left">
      ${companyAddress ? `<div class="contact-item">📍 ${companyAddress}</div>` : ""}
      ${companyMobile ? `<div class="contact-item">📞 ${companyMobile}</div>` : ""}
    </div>
  </div>
  <div class="summary-row">
    <div class="stat-card blue"><span class="stat-label">${t("Total Clients")}</span><span class="stat-value">${dataToUse.length}</span></div>
    <div class="stat-card purple"><span class="stat-label">${t("Filter")}</span><span class="stat-value">${filterLabel}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th>${t("Client Name")}</th>
        <th>${t("Address")}</th>
        <th>${t("Mobile")}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">${companyName} — ${today}</div>
</body>
</html>`, today, filterLabel, count: dataToUse.length };
  };

  const handlePrintReport = () => {
    if (filteredAssignments.length === 0) {
      toast({ title: t("No assignments to print"), variant: "destructive" });
      return;
    }
    const { html } = buildReportHtml();
    openPrintWindow(html);
  };

  const handleWhatsAppReport = async () => {
    if (filteredAssignments.length === 0) {
      toast({ title: t("No assignments to print"), variant: "destructive" });
      return;
    }
    setSendingWhatsApp(true);
    try {
      const { html, today, filterLabel, count } = buildReportHtml();
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "794px";
      container.style.fontFamily = "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Segoe UI',sans-serif";
      container.innerHTML = html.replace(/<!DOCTYPE.*?<body>/s, "").replace(/<\/body>.*<\/html>/s, "");
      document.body.appendChild(container);

      let pdfBlob: Blob | null;
      try {
        pdfBlob = await captureElementAsPdf(container);
      } finally {
        document.body.removeChild(container);
      }
      if (!pdfBlob) return;
      const fileName = `${t("Agent Client Assignments Report")}_${today}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: fileName, files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        const text = encodeURIComponent(`${t("Agent Client Assignments Report")}\n${t("Date")}: ${today}\n${t("Filter")}: ${filterLabel}\n${t("Total")}: ${count}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    } catch {
      toast({ title: t("Failed to generate PDF"), variant: "destructive" });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <IconCustomers className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            </div>
            {t('Agent Clients')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('Assign clients to agents')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-agent-clients">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Assign Clients to Agent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>{t('Agent')}</Label>
              <SearchSelect
                items={agents}
                value={selectedAgentId}
                onValueChange={(v) => { selectAgent(v); }}
                placeholder={t('Select agent...')}
                data-testid="select-agent"
              />
            </div>

            {selectedAgentId && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-base font-semibold">{t('Clients')}</Label>
                  <div className="flex gap-2 flex-wrap">
                    <div className="w-44">
                      <AddressSearchSelect
                        addresses={addresses}
                        value={addressFilter}
                        onValueChange={setAddressFilter}
                        placeholder={t('All Addresses')}
                        data-testid="select-address-filter"
                        showAllOption
                        allOptionLabel={t('All Addresses')}
                        inputClassName="h-8"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={loadExistingAssignments} data-testid="button-load-existing">
                      {t('Load Existing')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={selectAllClients} data-testid="button-select-all">
                      {t('Select All')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllClients} data-testid="button-deselect-all">
                      {t('Deselect All')}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{t('Client Name')}</TableHead>
                        <TableHead>{t('Address')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((c, i) => {
                        const assignedTo = otherAgentAssignments.get(c.id);
                        const isDisabled = !!assignedTo;
                        return (
                        <TableRow
                          key={c.id}
                          className={isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"}
                          onClick={() => toggleClient(c.id)}
                          data-testid={`row-client-${c.id}`}
                        >
                          <TableCell>
                            <Switch
                              checked={selectedClientIds.includes(c.id)}
                              onCheckedChange={() => toggleClient(c.id)}
                              disabled={isDisabled}
                              data-testid={`switch-client-${c.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <span className="font-medium">{c.name}</span>
                            {isDisabled && (
                              <Badge variant="outline" className="ml-2 text-xs text-red-600 border-red-300">
                                {t('Assigned to')}: {assignedTo}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.address || "—"}</TableCell>
                        </TableRow>
                        );
                      })}
                      {customers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {t('No clients found')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="border-violet-200 dark:border-violet-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Assignment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAgentId && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Agent')}</p>
                  <p className="font-bold text-lg">{selectedAgentName}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-violet-600">{t('Selected Clients')}</span>
                  <span className="font-mono font-bold text-lg text-violet-600" data-testid="text-selected-count">
                    {selectedClientIds.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{t('Currently Assigned')}</span>
                  <span className="font-mono font-bold text-lg text-muted-foreground" data-testid="text-assigned-count">
                    {assignedToAgent.length}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !selectedAgentId}
                className="w-full h-12 text-base gap-2 bg-violet-600 hover:bg-violet-700"
                data-testid="button-save-assignment"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Assignment')}
              </Button>
            </CardContent>
          </Card>

          {selectedAgentId && assignedToAgent.length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IconAgent className="h-5 w-5 text-violet-600" />
                  {t('Currently Assigned')}
                  <Badge variant="secondary" className="ml-1">{assignedToAgent.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {assignedToAgent.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50" data-testid={`assigned-client-${a.id}`}>
                      <span className="text-sm">{a.clientName}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <IconCustomers className="h-5 w-5 text-violet-600" />
              {t('All Assignments')}
              <Badge variant="secondary" className="ml-2">{filteredAssignments.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-48">
                <SearchSelect
                  items={agents}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  placeholder={t('All Agents')}
                  data-testid="select-filter-assignments"
                  showAllOption
                  allOptionLabel={t('All Agents')}
                  inputClassName="h-9"
                />
              </div>
              <div className="w-48">
                <AddressSearchSelect
                  addresses={addresses}
                  value={historyAddressFilter}
                  onValueChange={(v) => { setHistoryAddressFilter(v); setCurrentPage(1); }}
                  placeholder={t('All Addresses')}
                  data-testid="select-filter-assignments-address"
                  showAllOption
                  allOptionLabel={t('All Addresses')}
                  inputClassName="h-9"
                />
              </div>
              <Button variant="outline" onClick={handlePrintReport} className="gap-2 h-9" data-testid="button-print-assignments">
                <Printer className="h-5 w-5" />
                {t('Print')}
              </Button>
              <Button
                variant="outline"
                onClick={handleWhatsAppReport}
                disabled={sendingWhatsApp}
                className="gap-2 h-9 bg-green-600 hover:bg-green-700 text-white border-green-600"
                data-testid="button-whatsapp-assignments"
              >
                {sendingWhatsApp ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                {sendingWhatsApp ? t('Preparing PDF...') : t('WhatsApp')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Agent')}</TableHead>
                    <TableHead>{t('Client Name')}</TableHead>
                    <TableHead>{t('Address')}</TableHead>
                    <TableHead>{t('Mobile')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssignments.map((a, i) => (
                    <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-medium text-violet-600">{a.agentName}</TableCell>
                      <TableCell className="font-medium">{a.clientName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.clientAddress || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground" dir="ltr">{a.clientContact || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-assignment-${a.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will remove this client from the agent.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedAssignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t('No assignments yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredAssignments.length)} {t('of')} {filteredAssignments.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-assignment-prev-page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={pg === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pg)}
                      data-testid={`button-assignment-page-${pg}`}
                    >
                      {pg}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    data-testid="button-assignment-next-page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
