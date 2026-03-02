import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgentClient } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, Users, UserCheck, Trash2, RotateCcw, ChevronLeft, ChevronRight, Printer, MessageCircle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getModernPrintStyles } from "@/lib/print-styles";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; cliche: string | null }>({
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
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: "#7c3aed", accentTextColor: "#ffffff" });

    let tableRows = "";
    let globalIndex = 1;
    const agentNames = Object.keys(grouped).sort();

    agentNames.forEach(agentName => {
      const cls = grouped[agentName];
      tableRows += `<tr><td colspan="5" style="background:#7c3aed; color:white; font-weight:700; padding:10px 12px; font-size:13pt; border:none;">${agentName} (${cls.length})</td></tr>`;
      cls.forEach(c => {
        tableRows += `<tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-family:monospace; font-size:10pt; text-align:center; width:40px;">${globalIndex}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-weight:600; font-size:11pt;">${c.clientName}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:10pt; color:#555;">${c.clientAddress || "-"}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:10pt; color:#555; direction:ltr;">${c.clientContact || "-"}</td>
        </tr>`;
        globalIndex++;
      });
    });

    const today = new Date().toISOString().split("T")[0];
    const clicheHtml = companyProfile?.cliche
      ? `<div style="text-align:center; margin-bottom:10px;"><img src="${companyProfile.cliche}" alt="" style="width:100%; max-height:160px; object-fit:cover; border-radius:6px;" /></div>`
      : "";

    const filterLabel = historyFilter && historyFilter !== "all"
      ? agents.find(a => a.id === historyFilter)?.name || t("All Agents")
      : t("All Agents");

    return { html: `<!DOCTYPE html>
<html dir="${dir}" lang="${i18n.language}">
<head>
<meta charset="UTF-8" />
<title>${t("Agent Client Assignments Report")}</title>
<style>${printStyles}
  body { font-family: Arial, sans-serif; padding: 15px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
${clicheHtml}
<div style="text-align:center; margin-bottom:15px; border-bottom:2px solid #333; padding-bottom:10px;">
  <h1 style="font-size:18pt; margin-bottom:3px; font-weight:700;">${t("Agent Client Assignments Report")}</h1>
  <p style="font-size:11pt; color:#666;">${t("Date")}: ${today} | ${t("Filter")}: ${filterLabel} | ${t("Total")}: ${dataToUse.length}</p>
</div>
<table style="width:100%; border-collapse:collapse; margin-top:10px;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #d1d5db; font-size:10pt; width:40px;">#</th>
      <th style="padding:10px 12px; text-align:${isRtl ? "right" : "left"}; border-bottom:2px solid #d1d5db; font-size:10pt;">${t("Client Name")}</th>
      <th style="padding:10px 12px; text-align:${isRtl ? "right" : "left"}; border-bottom:2px solid #d1d5db; font-size:10pt;">${t("Address")}</th>
      <th style="padding:10px 12px; text-align:${isRtl ? "right" : "left"}; border-bottom:2px solid #d1d5db; font-size:10pt;">${t("Mobile")}</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
</body>
</html>`, today, filterLabel, count: dataToUse.length };
  };

  const handlePrintReport = () => {
    if (filteredAssignments.length === 0) {
      toast({ title: t("No assignments to print"), variant: "destructive" });
      return;
    }
    const { html } = buildReportHtml();
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 400);
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
      container.innerHTML = html.replace(/<!DOCTYPE.*?<body>/s, "").replace(/<\/body>.*<\/html>/s, "");
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      document.body.removeChild(container);

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      if (imgHeight > 297) {
        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, -yOffset, imgWidth, imgHeight);
          yOffset += 297;
        }
      } else {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      }

      const pdfBlob = pdf.output("blob");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Users className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            </div>
            {t('Agent Clients')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Assign clients to agents')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-agent-clients">
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Assign Clients to Agent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t('Agent')}</Label>
              <Select value={selectedAgentId} onValueChange={(v) => { selectAgent(v); }}>
                <SelectTrigger data-testid="select-agent">
                  <SelectValue placeholder={t('Select agent...')} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                            <Checkbox
                              checked={selectedClientIds.includes(c.id)}
                              onCheckedChange={() => toggleClient(c.id)}
                              disabled={isDisabled}
                              data-testid={`checkbox-client-${c.id}`}
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
                        </TableRow>
                        );
                      })}
                      {customers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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

        <div className="space-y-6">
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
                  <UserCheck className="h-4 w-4 text-violet-600" />
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
              <Users className="h-5 w-5 text-violet-600" />
              {t('All Assignments')}
              <Badge variant="secondary" className="ml-2">{filteredAssignments.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-48">
                <Select value={historyFilter} onValueChange={(v) => { setHistoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-assignments" className="h-9">
                    <SelectValue placeholder={t('All Agents')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Agents')}</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Printer className="h-4 w-4" />
                {t('Print')}
              </Button>
              <Button
                variant="outline"
                onClick={handleWhatsAppReport}
                disabled={sendingWhatsApp}
                className="gap-2 h-9 bg-green-600 hover:bg-green-700 text-white border-green-600"
                data-testid="button-whatsapp-assignments"
              >
                {sendingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
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
                                <Trash2 className="h-4 w-4" />
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
                    <ChevronLeft className="h-4 w-4" />
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
                    <ChevronRight className="h-4 w-4" />
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
