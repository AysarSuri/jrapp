import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAgentPayments, useCreateAgentPayment, useDeleteAgentPayment } from "@/hooks/use-agent-payments";
import { useQuery } from "@tanstack/react-query";
import type { Client, Bank, TransferOffice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { CustomerSearchSelect } from "@/components/customer-search-select";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { IconDollar, IconOffice, IconBank, IconAgent, IconExternalDebt } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { usd, formatDate } from "@/lib/format-utils";

export default function AgentPaymentUsdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: payments, isLoading: paymentsLoading } = useAgentPayments();
  const { mutate: createPayment, isPending: isSaving } = useCreateAgentPayment();
  const { mutate: deletePayment } = useDeleteAgentPayment();

  const { data: allClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const customers = allClients?.filter(c => c.type === "customer") || [];

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const { data: nextNumber } = useQuery<{ paymentNumber: string }>({
    queryKey: ["/api/agent-payments/next-number"],
  });

  const [paymentNumber, setPaymentNumber] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [agentName, setAgentName] = useState("");
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [searchNumber, setSearchNumber] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (nextNumber?.paymentNumber && !paymentNumber) {
    setPaymentNumber(nextNumber.paymentNumber);
  }

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const usdPayments = payments?.filter(p => p.currency === "USD") || [];
  const filteredPayments = usdPayments.filter(p => {
    if (historyFilter && historyFilter !== "all" && String(p.agentId) !== historyFilter) return false;
    if (historyFromDate && p.date < historyFromDate) return false;
    if (historyToDate && p.date > historyToDate) return false;
    if (searchNumber && !(p.paymentNumber || "").toLowerCase().includes(searchNumber.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleDelete = (id: number) => {
    deletePayment(id, {
      onSuccess: () => {
        toast({ title: t("Payment deleted successfully") });
      },
      onError: (err: any) => {
        toast({ title: t("Failed to delete payment"), description: err.message, variant: "destructive" });
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
    const customer = customers?.find(c => c.id === parseInt(id));
    if (customer) {
      setAgentName(customer.name);
    }
  }, [customers]);

  const selectPaymentSource = useCallback((val: string) => {
    setPaymentSource(val);
    if (val === "hand:0") {
      setPaymentSourceName(t("By Hand"));
    } else {
      const [type, id] = val.split(":");
      if (type === "bank") {
        const bank = banksList?.find(b => b.id === parseInt(id));
        if (bank) setPaymentSourceName(`${t("Bank")} - ${bank.name}`);
      } else {
        const office = transferOfficesList?.find(o => o.id === parseInt(id));
        if (office) setPaymentSourceName(`${t("Transfer Office")} - ${office.name}`);
      }
    }
  }, [banksList, transferOfficesList, t]);

  const selectedAgent = customers?.find(c => c.id === parseInt(agentId));

  const resetForm = () => {
    setPaymentNumber("");
    setAgentId("");
    setAgentName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setAmount("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!agentId) {
      toast({ title: t("Please select a customer"), variant: "destructive" });
      return;
    }
    if (!paymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const amountVal = parseFloat(amount || "0");
    if (amountVal <= 0) {
      toast({ title: t("Please enter an amount"), variant: "destructive" });
      return;
    }

    createPayment({
      paymentNumber,
      agentId: parseInt(agentId),
      agentName,
      paymentSource: paymentSource.split(":")[0],
      paymentSourceName,
      amount: amount || "0",
      currency: "USD",
      note: note || null,
      reference: reference || null,
      date,
      time,
    }, {
      onSuccess: () => {
        toast({ title: t("Payment saved successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Failed to save payment"), variant: "destructive" });
      },
    });
  };

  const amountVal = parseFloat(amount || "0");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <IconDollar className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            {t('Customer Payment USD')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Pay customers in USD')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-agent-payment">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Payment Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Payment Number')}</Label>
                <Input
                  value={paymentNumber}
                  readOnly
                  className="bg-muted/50 font-mono font-bold text-center"
                  data-testid="input-payment-number"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Customer Name')}</Label>
                <CustomerSearchSelect
                  customers={customers || []}
                  value={agentId}
                  onValueChange={selectAgent}
                  placeholder={t('Select customer...')}
                  data-testid="select-customer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-agent-payment-date"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  data-testid="input-agent-payment-time"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Payment Source')}</Label>
                <SearchSelect
                  items={[
                    { id: "hand:0", name: t('By Hand') },
                    ...banks.map(b => ({ id: `bank:${b.id}`, name: b.name })),
                    ...transferOffices.map(o => ({ id: `transfer_office:${o.id}`, name: o.name })),
                  ]}
                  value={paymentSource}
                  onValueChange={(v) => selectPaymentSource(v || "")}
                  placeholder={t('Select bank or transfer office...')}
                  data-testid="select-agent-payment-source"
                />
              </div>
            </div>

            <Separator />

            <Card className="border-blue-200 dark:border-blue-900">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IconDollar className="h-5 w-5 text-blue-600" />
                  {t('Amount')} (USD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-mono text-center h-12"
                  data-testid="input-agent-payment-amount"
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input
                  placeholder={t('Reference number...')}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="input-agent-payment-reference"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Textarea
                  placeholder={t('Notes...')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none h-10"
                  data-testid="input-agent-payment-note"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAgent && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Customer Name')}</p>
                    <p className="font-bold text-lg">{selectedAgent.name}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-agent-payment-amount">
                    {usd(amountVal)}
                  </span>
                </div>
              </div>

              {paymentSource && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Source')}</p>
                    <p className="font-medium text-sm">{paymentSourceName}</p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={isSaving || !agentId || !paymentSource}
                className="w-full h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-agent-payment"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Payment')}
              </Button>
            </CardContent>
          </Card>

          {selectedAgent && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{t('Current Debt USD')}</p>
                  <p className="font-mono text-2xl font-bold text-red-600">
                    {usd(selectedAgent.oldDebtUsd)}
                  </p>
                  {amountVal > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">{t('After Payment')}</p>
                      <p className="font-mono text-xl font-bold text-emerald-600">
                        {usd((parseFloat(selectedAgent.oldDebtUsd) - amountVal))}
                      </p>
                    </>
                  )}
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
              <ListOrdered className="h-5 w-5 text-blue-600" />
              {t('Payment History')}
              <Badge variant="secondary" className="ml-2">{filteredPayments.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => { setSearchNumber(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-search-payment-number" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-payment-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-payment-history-to-date" />
              </div>
              <div className="w-64">
                <CustomerSearchSelect
                  customers={customers || []}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  showAllOption
                  allOptionLabel={t('All Customers')}
                  placeholder={t('All Customers')}
                  inputClassName="h-9 text-sm"
                  data-testid="select-filter-payment-history"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('Payment Number')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Customer Name')}</TableHead>
                      <TableHead>{t('Source')}</TableHead>
                      <TableHead>{t('Amount')}</TableHead>
                      <TableHead>{t('Notes')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((p, i) => (
                      <TableRow key={p.id} data-testid={`row-agent-payment-${p.id}`}>
                        <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-bold">{p.paymentNumber || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{formatDate(p.date)}</TableCell>
                        <TableCell className="font-mono text-sm">{p.time || "-"}</TableCell>
                        <TableCell className="font-medium">{p.agentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{p.paymentSourceName}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-blue-600">
                          {parseFloat(p.amount) > 0 ? usd(p.amount) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.note || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-600" data-testid={`button-delete-payment-${p.id}`}>
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('This will permanently delete this payment.')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(p.id)}>{t('Yes')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {t('No payments yet')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredPayments.length)} {t('of')} {filteredPayments.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <Button key={pg} variant={pg === safePage ? "default" : "outline"} size="icon" onClick={() => setCurrentPage(pg)}>
                        {pg}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
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
