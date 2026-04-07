import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, ShieldAlert, ShieldCheck, Activity, AlertTriangle, LogIn, ChevronLeft, ChevronRight } from "lucide-react";

type AuditLog = {
  id: number;
  userId: string | null;
  username: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  riskLevel: string;
  flagged: boolean;
  createdAt: string;
};

type AuditStats = {
  total: number;
  today: number;
  flagged: number;
  failedLogins: number;
};

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const queryParams = new URLSearchParams();
  if (actionFilter !== "all") queryParams.set("action", actionFilter);
  if (entityFilter !== "all") queryParams.set("entity", entityFilter);
  if (riskFilter !== "all") queryParams.set("riskLevel", riskFilter);
  if (flaggedOnly) queryParams.set("flagged", "true");
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(page * pageSize));

  const { data: logsData, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["/api/audit-logs", actionFilter, entityFilter, riskFilter, flaggedOnly, page],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const { data: stats } = useQuery<AuditStats>({
    queryKey: ["/api/audit-logs/stats"],
    queryFn: async () => {
      const res = await fetch("/api/audit-logs/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const riskColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-600 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      default: return "bg-green-500 text-white";
    }
  };

  const actionColor = (action: string) => {
    if (action === "DELETE" || action.includes("FAILED") || action.includes("BLOCKED")) return "destructive";
    if (action === "CREATE" || action.includes("SUCCESS")) return "default";
    if (action === "UPDATE") return "secondary";
    return "outline";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  };

  const entityLabel = (e: string) => e.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-audit-logs-title">
            <Shield className="w-7 h-7 text-blue-600" />
            {t("Security & Audit")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("Activity audit trail")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700" data-testid="text-audit-total">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">{t("Total Logs")}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-4 text-center">
            <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-700" data-testid="text-audit-today">{stats?.today || 0}</p>
            <p className="text-xs text-muted-foreground">{t("Today's Activity")}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-orange-600" />
            <p className="text-2xl font-bold text-orange-700" data-testid="text-audit-flagged">{stats?.flagged || 0}</p>
            <p className="text-xs text-muted-foreground">{t("Flagged Events")}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-4 text-center">
            <LogIn className="w-6 h-6 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-700" data-testid="text-audit-failed-logins">{stats?.failedLogins || 0}</p>
            <p className="text-xs text-muted-foreground">{t("Failed Logins")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            {t("Audit Logs")}
          </CardTitle>
          <div className="flex flex-wrap gap-3 mt-2">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44 h-9" data-testid="select-audit-action-filter">
                <SelectValue placeholder={t("All Actions")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Actions")}</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="LOGIN_SUCCESS">LOGIN_SUCCESS</SelectItem>
                <SelectItem value="LOGIN_FAILED">LOGIN_FAILED</SelectItem>
                <SelectItem value="LOGIN_BLOCKED">LOGIN_BLOCKED</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44 h-9" data-testid="select-audit-risk-filter">
                <SelectValue placeholder={t("All Risk Levels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Risk Levels")}</SelectItem>
                <SelectItem value="low">{t("low")}</SelectItem>
                <SelectItem value="medium">{t("medium")}</SelectItem>
                <SelectItem value="high">{t("high")}</SelectItem>
                <SelectItem value="critical">{t("critical")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="flagged-filter" checked={flaggedOnly} onCheckedChange={(c) => { setFlaggedOnly(!!c); setPage(0); }} data-testid="switch-audit-flagged" />
              <Label htmlFor="flagged-filter" className="text-sm font-bold">{t("Flagged Only")}</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">{t("Date")}</TableHead>
                  <TableHead>{t("User")}</TableHead>
                  <TableHead>{t("Action")}</TableHead>
                  <TableHead>{t("Entity")}</TableHead>
                  <TableHead className="text-center">ID</TableHead>
                  <TableHead className="text-center">{t("Risk Level")}</TableHead>
                  <TableHead>{t("IP Address")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="animate-pulse">{t("Loading...")}</div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("No audit logs found")}
                    </TableCell>
                  </TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id} className={log.flagged ? "bg-red-50/50 dark:bg-red-900/10" : ""} data-testid={`row-audit-${log.id}`}>
                    <TableCell className="text-xs font-mono whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="font-bold text-sm">{log.username || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={actionColor(log.action)} className="text-xs" data-testid={`badge-action-${log.id}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{entityLabel(log.entity)}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{log.entityId || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-xs ${riskColor(log.riskLevel)}`} data-testid={`badge-risk-${log.id}`}>
                        {t(log.riskLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} / {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-audit-prev">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-audit-next">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
