import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAgentReceipts, useCreateAgentReceipt, useUpdateAgentReceipt, useDeleteAgentReceipt } from "@/hooks/use-agent-receipts";
import { useQuery } from "@tanstack/react-query";
import type { Bank, TransferOffice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, Trash2, ChevronLeft, ChevronRight, Search, Pencil } from "lucide-react";
import { IconAgent, IconBank, IconOffice } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import type { AgentReceipt } from "@shared/schema";

export default function AgentReceiptPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const { data: receipts, isLoading: receiptsLoading } = useAgentReceipts();
  const { mutate: createReceipt, isPending: isSaving } = useCreateAgentReceipt();
  const { mutate: deleteReceipt } = useDeleteAgentReceipt();
  const { mutate: updateReceipt, isPending: isUpdating } = useUpdateAgentReceipt();

  const [showStamp, setShowStamp] = useState(false);
  const [editReceipt, setEditReceipt] = useState<AgentReceipt | null>(null);

  const openEdit = (r: AgentReceipt) => {
    setEditReceipt(r);
    setReceiptNumber(r.receiptNumber || "");
    setAgentId(String(r.agentId));
    setAgentName(r.agentName);
    setReceivedTo(r.receivedTo === "hand" ? "hand:0" : `${r.receivedTo}:0`);
    setReceivedToName(r.receivedToName);
    setAmount(r.amount || "");
    setCurrency(r.currency as "USD" | "IQD");
    setNote(r.note || "");
    setDate(r.date);
    setTime(r.time);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: representativesList } = useQuery<{ id: string; name: string; repId: number | null }[]>({
    queryKey: ["/api/agents"],
  });

  const agents = useMemo(() => {
    return (representativesList || []).filter((r: any) => r.repId).map((r: any) => ({
      id: String(r.repId),
      name: r.name,
    }));
  }, [representativesList]);

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const { data: nextNumber } = useQuery<{ receiptNumber: string }>({
    queryKey: ["/api/agent-receipts/next-number"],
  });

  const [receiptNumber, setReceiptNumber] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [agentName, setAgentName] = useState("");
  const [receivedTo, setReceivedTo] = useState<string>("");
  const [receivedToName, setReceivedToName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "IQD">("USD");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [searchNumber, setSearchNumber] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (nextNumber?.receiptNumber && !receiptNumber && !editReceipt) {
    setReceiptNumber(nextNumber.receiptNumber);
  }

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const filteredReceipts = useMemo(() => {
    const all = receipts || [];
    return all.filter(r => {
      if (historyFilter && historyFilter !== "all" && String(r.agentId) !== historyFilter) return false;
      if (historyFromDate && r.date < historyFromDate) return false;
      if (historyToDate && r.date > historyToDate) return false;
      if (searchNumber && !(r.receiptNumber || "").toLowerCase().includes(searchNumber.toLowerCase())) return false;
      return true;
    });
  }, [receipts, historyFilter, historyFromDate, historyToDate, searchNumber]);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReceipts = filteredReceipts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleDelete = (id: number) => {
    deleteReceipt(id, {
      onSuccess: () => {
        toast({ title: t("Receipt deleted successfully") });
      },
      onError: (err: any) => {
        toast({ title: t("Failed to delete receipt"), description: err.message, variant: "destructive" });
      },
    });
  };

  const selectAgent = useCallback((id: string) => {
    if (!id) {
      setAgentId("");
      setAgentName("");
      return;
    }
    setAgentId(id);
    const agent = agents.find(a => a.id === id);
    if (agent) setAgentName(agent.name);
  }, [agents]);

  const receivedToItems = useMemo(() => {
    const items: { id: string; name: string }[] = [
      { id: "hand:0", name: t("By Hand") },
    ];
    banks.forEach(b => items.push({ id: `bank:${b.id}`, name: `${t("Bank")} - ${b.name}` }));
    transferOffices.forEach(o => items.push({ id: `office:${o.id}`, name: `${t("Transfer Office")} - ${o.name}` }));
    return items;
  }, [banks, transferOffices, t]);

  const selectReceivedTo = useCallback((val: string) => {
    setReceivedTo(val);
    if (val === "hand:0") {
      setReceivedToName(t("By Hand"));
    } else {
      const [type, id] = val.split(":");
      if (type === "bank") {
        const bank = banksList?.find(b => b.id === parseInt(id));
        if (bank) setReceivedToName(`${t("Bank")} - ${bank.name}`);
      } else {
        const office = transferOfficesList?.find(o => o.id === parseInt(id));
        if (office) setReceivedToName(`${t("Transfer Office")} - ${office.name}`);
      }
    }
  }, [banksList, transferOfficesList, t]);

  const resetForm = () => {
    setEditReceipt(null);
    setReceiptNumber("");
    setAgentId("");
    setAgentName("");
    setReceivedTo("");
    setReceivedToName("");
    setAmount("");
    setCurrency("USD");
    setNote("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!agentId) {
      toast({ title: t("Please select an agent"), variant: "destructive" });
      return;
    }
    if (!receivedTo) {
      toast({ title: t("Please select received to"), variant: "destructive" });
      return;
    }
    const amtVal = parseFloat(amount || "0");
    if (amtVal <= 0) {
      toast({ title: t("Please enter an amount"), variant: "destructive" });
      return;
    }

    if (editReceipt) {
      updateReceipt({ id: editReceipt.id, data: { note: note || null, date, time } as any }, {
        onSuccess: () => {
          toast({ title: t("Receipt updated successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to update receipt"), variant: "destructive" });
        },
      });
    } else {
      createReceipt({
        receiptNumber,
        agentId: parseInt(agentId),
        agentName,
        receivedTo: receivedTo.split(":")[0],
        receivedToName,
        amount: amount || "0",
        currency,
        note: note || null,
        date,
        time,
      }, {
        onSuccess: () => {
          toast({ title: t("Receipt saved successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to save receipt"), variant: "destructive" });
        },
      });
    }
  };

  const fmt = (val: string | number) => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return currency === "USD" ? usd(n) : fmtIqd(n);
  };

  const fmtByReceipt = (r: AgentReceipt) => {
    const n = parseFloat(r.amount || "0");
    return r.currency === "USD" ? usd(n) : fmtIqd(n);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Receipt from Agent")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("Record receipts received from agents")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-bold">{t("Show Stamp")}</Label>
          <Switch checked={showStamp} onCheckedChange={setShowStamp} data-testid="switch-show-stamp" />
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconAgent className="h-5 w-5 text-primary" />
            {editReceipt ? t("Edit Receipt") : t("New Receipt")}
            {editReceipt && <Badge variant="outline" className="text-orange-600 border-orange-300">#{editReceipt.receiptNumber}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Receipt #")}</Label>
              <Input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="h-11 text-base font-semibold" data-testid="input-receipt-number" readOnly />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Agent")}</Label>
              <SearchSelect
                items={agents}
                value={agentId}
                onValueChange={selectAgent}
                placeholder={t("Select agent...")}
                className="h-11 text-base font-semibold"
                data-testid="select-agent"
              />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Received To")}</Label>
              <SearchSelect
                items={receivedToItems}
                value={receivedTo}
                onValueChange={selectReceivedTo}
                placeholder={t("Select destination...")}
                className="h-11 text-base font-semibold"
                data-testid="select-received-to"
              />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Currency")}</Label>
              <div className="flex gap-1 h-11">
                <Button
                  variant={currency === "USD" ? "default" : "outline"}
                  onClick={() => setCurrency("USD")}
                  className={`h-11 px-5 text-base font-bold ${currency === "USD" ? "bg-primary text-white" : ""}`}
                  data-testid="button-currency-usd"
                  disabled={!!editReceipt}
                >
                  USD
                </Button>
                <Button
                  variant={currency === "IQD" ? "default" : "outline"}
                  onClick={() => setCurrency("IQD")}
                  className={`h-11 px-5 text-base font-bold ${currency === "IQD" ? "bg-primary text-white" : ""}`}
                  data-testid="button-currency-iqd"
                  disabled={!!editReceipt}
                >
                  IQD
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Amount")}</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 text-base font-semibold" data-testid="input-amount" disabled={!!editReceipt} />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Date")}</Label>
              <DateInput value={date} onChange={e => setDate(e.target.value)} className="h-11 text-base font-semibold" data-testid="input-date" />
            </div>
            <div>
              <Label className="text-base font-bold mb-1 block">{t("Time")}</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-11 text-base font-semibold" data-testid="input-time" />
            </div>
          </div>
          <div className="mt-4">
            <Label className="text-base font-bold mb-1 block">{t("Note")}</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} className="text-base font-semibold min-h-[44px] resize-none" data-testid="input-note" />
          </div>

          <Separator className="my-4" />

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSave} disabled={isSaving || isUpdating} className={editReceipt ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-primary text-white"} data-testid="button-save-receipt">
              {(isSaving || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editReceipt ? t("Update") : t("Save")}
            </Button>
            {editReceipt && (
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-edit">
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("Cancel")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <IconAgent className="h-5 w-5 text-primary" />
              {t("Receipt from Agent")}
              <Badge variant="secondary" className="ml-2">{filteredReceipts.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-48">
                <SearchSelect
                  items={[{ id: "all", name: t("All Agents") }, ...agents]}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  placeholder={t("Filter by agent...")}
                  className="h-9 text-sm"
                  data-testid="select-filter-agent"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchNumber}
                  onChange={e => { setSearchNumber(e.target.value); setCurrentPage(1); }}
                  placeholder={t("Search by receipt#...")}
                  className="h-9 text-sm pl-8 w-40"
                  data-testid="input-search-receipt"
                />
              </div>
              <DateInput value={historyFromDate} onChange={e => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="h-9 text-sm w-36" data-testid="input-filter-from" />
              <DateInput value={historyToDate} onChange={e => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="h-9 text-sm w-36" data-testid="input-filter-to" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {receiptsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-sm font-bold">#</TableHead>
                      <TableHead className="text-sm font-bold">{t("Receipt #")}</TableHead>
                      <TableHead className="text-sm font-bold">{t("Agent")}</TableHead>
                      <TableHead className="text-sm font-bold">{t("Received To")}</TableHead>
                      <TableHead className="text-sm font-bold">{t("Amount")}</TableHead>
                      <TableHead className="text-sm font-bold">{t("Currency")}</TableHead>
                      <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                      <TableHead className="text-sm font-bold">{t("Note")}</TableHead>
                      <TableHead className="text-sm font-bold text-center">{t("Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReceipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">{t("No receipts found")}</TableCell>
                      </TableRow>
                    ) : paginatedReceipts.map((r, i) => (
                      <TableRow key={r.id} data-testid={`row-receipt-${r.id}`}>
                        <TableCell className="font-mono text-sm font-semibold">{(safePage - 1) * pageSize + i + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold">{r.receiptNumber}</TableCell>
                        <TableCell className="text-sm font-semibold">{r.agentName}</TableCell>
                        <TableCell className="text-sm font-semibold">{r.receivedToName}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold">{fmtByReceipt(r)}</TableCell>
                        <TableCell>
                          <Badge variant={r.currency === "USD" ? "default" : "secondary"} className={r.currency === "USD" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}>
                            {r.currency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{formatDate(r.date)}</TableCell>
                        <TableCell className="text-sm font-semibold max-w-[200px] truncate">{r.note || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => openEdit(r)} data-testid={`button-edit-${r.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`button-delete-${r.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("Delete Receipt")}</AlertDialogTitle>
                                  <AlertDialogDescription>{t("Are you sure you want to delete this receipt?")}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-red-600 text-white hover:bg-red-700">{t("Delete")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("Page")} {safePage} / {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>
                      {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                      {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
