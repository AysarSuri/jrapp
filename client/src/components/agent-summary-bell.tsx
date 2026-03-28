import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ShoppingCart, RotateCcw, Wallet, CreditCard, Percent } from "lucide-react";
import { usd, fmtIqd } from "@/lib/format-utils";

interface AgentSummary {
  agentName: string;
  salesUsd: number;
  salesIqd: number;
  salesCount: number;
  returnsUsd: number;
  returnsIqd: number;
  returnsCount: number;
  receiptsUsd: number;
  receiptsIqd: number;
  receiptsCount: number;
  paymentsUsd: number;
  paymentsIqd: number;
  paymentsCount: number;
  discountsUsd: number;
  discountsIqd: number;
}

interface SummaryResponse {
  date: string;
  summaries: AgentSummary[];
}

export default function AgentSummaryBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading, isError } = useQuery<SummaryResponse>({
    queryKey: ["/api/agent-daily-summary", today],
    queryFn: async () => {
      const res = await fetch(`/api/agent-daily-summary?date=${today}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const summaries = data?.summaries || [];
  const totalAgents = summaries.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative" data-testid="button-agent-summary">
          <Users className="w-5 h-5" />
          {totalAgents > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold" data-testid="text-agent-summary-count">
              {totalAgents}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] max-h-[500px] overflow-y-auto p-0">
        <div className="sticky top-0 bg-background border-b px-4 py-3 z-10">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t("Agent Daily Summary")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{today}</p>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            {t("Loading")}...
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-red-500">
            {t("Error loading data")}
          </div>
        ) : summaries.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t("No agent activity today")}
          </div>
        ) : (
          <div className="divide-y">
            {summaries.map((agent) => (
              <div key={agent.agentName} className="p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-bold">{agent.agentName}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {agent.salesCount > 0 && (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{t("Sales")}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-auto">{agent.salesCount}</Badge>
                      <div className="flex gap-2 font-mono font-bold">
                        {agent.salesUsd > 0 && <span className="text-blue-600">{usd(agent.salesUsd)}</span>}
                        {agent.salesIqd > 0 && <span className="text-orange-600">{fmtIqd(agent.salesIqd)}</span>}
                      </div>
                    </div>
                  )}
                  {agent.returnsCount > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="font-semibold text-red-700 dark:text-red-400">{t("Returns")}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-auto">{agent.returnsCount}</Badge>
                      <div className="flex gap-2 font-mono font-bold">
                        {agent.returnsUsd > 0 && <span className="text-blue-600">{usd(agent.returnsUsd)}</span>}
                        {agent.returnsIqd > 0 && <span className="text-orange-600">{fmtIqd(agent.returnsIqd)}</span>}
                      </div>
                    </div>
                  )}
                  {agent.receiptsCount > 0 && (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded px-2 py-1.5">
                      <Wallet className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <span className="font-semibold text-green-700 dark:text-green-400">{t("Receipts")}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-auto">{agent.receiptsCount}</Badge>
                      <div className="flex gap-2 font-mono font-bold">
                        {agent.receiptsUsd > 0 && <span className="text-blue-600">{usd(agent.receiptsUsd)}</span>}
                        {agent.receiptsIqd > 0 && <span className="text-orange-600">{fmtIqd(agent.receiptsIqd)}</span>}
                      </div>
                    </div>
                  )}
                  {agent.paymentsCount > 0 && (
                    <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30 rounded px-2 py-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span className="font-semibold text-violet-700 dark:text-violet-400">{t("Payments")}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-auto">{agent.paymentsCount}</Badge>
                      <div className="flex gap-2 font-mono font-bold">
                        {agent.paymentsUsd > 0 && <span className="text-blue-600">{usd(agent.paymentsUsd)}</span>}
                        {agent.paymentsIqd > 0 && <span className="text-orange-600">{fmtIqd(agent.paymentsIqd)}</span>}
                      </div>
                    </div>
                  )}
                  {(agent.discountsUsd > 0 || agent.discountsIqd > 0) && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{t("Discounts")}</span>
                      <div className="flex gap-2 font-mono font-bold ml-auto">
                        {agent.discountsUsd > 0 && <span className="text-blue-600">{usd(agent.discountsUsd)}</span>}
                        {agent.discountsIqd > 0 && <span className="text-orange-600">{fmtIqd(agent.discountsIqd)}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
