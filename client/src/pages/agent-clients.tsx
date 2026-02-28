import { useState, useCallback } from "react";
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
  Save, Loader2, Users, UserCheck, Trash2, RotateCcw, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function AgentClientsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: agentsList } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/agents"],
  });
  const { data: customersList } = useQuery<{ id: number; name: string; type: string }[]>({
    queryKey: ["/api/clients"],
  });
  const { data: allAssignments, isLoading } = useQuery<AgentClient[]>({
    queryKey: ["/api/agent-clients"],
  });

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const agents = agentsList || [];
  const customers = (customersList || []).filter(c => c.type === "customer");
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
    onError: () => {
      toast({ title: t("Failed to assign clients"), variant: "destructive" });
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

  useState(() => {
    if (agentAssignments) {
      setSelectedClientIds(agentAssignments.map(a => a.clientId));
    }
  });

  const toggleClient = (clientId: number) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    setSelectedClientIds(customers.map(c => c.id));
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
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAssignments = filteredAssignments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const assignedToAgent = agentAssignments || [];

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
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{t('Clients')}</Label>
                  <div className="flex gap-2">
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
                      {customers.map((c, i) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleClient(c.id)}
                          data-testid={`row-client-${c.id}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedClientIds.includes(c.id)}
                              onCheckedChange={() => toggleClient(c.id)}
                              data-testid={`checkbox-client-${c.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                        </TableRow>
                      ))}
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
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssignments.map((a, i) => (
                    <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-medium text-violet-600">{a.agentName}</TableCell>
                      <TableCell className="font-medium">{a.clientName}</TableCell>
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
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
