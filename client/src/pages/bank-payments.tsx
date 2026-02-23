import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBankTransactions, useCreateBankTransaction } from "@/hooks/use-bank-transactions";
import { useQuery } from "@tanstack/react-query";
import type { Bank } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, ArrowUpFromLine,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usd } from "@/lib/format-utils";

export default function BankPaymentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allTxns, isLoading: txnsLoading } = useBankTransactions();
  const { mutate: createTxn, isPending: isSaving } = useCreateBankTransaction();

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const [bankId, setBankId] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyOpen, setHistoryOpen] = useState(false);

  const banks = banksList || [];

  const selectBank = useCallback((id: string) => {
    setBankId(id);
    const bank = banks.find(b => b.id === parseInt(id));
    if (bank) setBankName(bank.name);
  }, [banks]);

  const selectedBank = banks.find(b => b.id === parseInt(bankId));

  const resetForm = () => {
    setBankId("");
    setBankName("");
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!bankId) {
      toast({ title: t("Please select a bank"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createTxn({
      bankId: parseInt(bankId),
      bankName,
      type: "payment",
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      description: description || null,
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

  const payments = allTxns?.filter(t => t.type === "payment") || [];
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ArrowUpFromLine className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            {t('Bank Payments')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record payments made to banks')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-bank-payment-history">
                <ListOrdered className="h-4 w-4" />
                {t('Payment History')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('Payment History')}</DialogTitle>
              </DialogHeader>
              {txnsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Bank')}</TableHead>
                      <TableHead>{t('USD Amount')}</TableHead>
                      <TableHead>{t('IQD Amount')}</TableHead>
                      <TableHead>{t('Description')}</TableHead>
                      <TableHead>{t('Reference')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={p.id} data-testid={`row-bank-payment-${p.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{p.date}</TableCell>
                        <TableCell className="font-mono text-sm">{p.time || "-"}</TableCell>
                        <TableCell className="font-medium">{p.bankName}</TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {parseFloat(p.amountUsd) > 0 ? usd(p.amountUsd) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {parseFloat(p.amountIqd) > 0 ? formatIQD(parseFloat(p.amountIqd)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.description || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {t('No payments yet')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-bank-payment">
            <RotateCcw className="h-4 w-4" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Bank')}</Label>
                <Select value={bankId} onValueChange={selectBank}>
                  <SelectTrigger data-testid="select-bank-payment-bank">
                    <SelectValue placeholder={t('Select bank...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-bank-payment-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-bank-payment-time" />
              </div>
            </div>

            {selectedBank && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Bank')}</p>
                      <p className="font-bold">{selectedBank.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance USD')}</p>
                      <p className="font-mono font-bold text-blue-600">{usd(selectedBank.oldDebtUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Opening Balance IQD')}</p>
                      <p className="font-mono font-bold text-orange-600">{formatIQD(parseFloat(selectedBank.oldDebtIqd))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    {t('USD Amount')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-bank-payment-usd"
                  />
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-orange-600" />
                    {t('IQD Amount')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number" step="250" min="0" placeholder="0"
                    value={amountIqd} onChange={(e) => setAmountIqd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-bank-payment-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-bank-payment-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-bank-payment-description" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-red-200 dark:border-red-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBank && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Bank')}</p>
                  <p className="font-bold text-lg">{selectedBank.name}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-bank-payment-usd-total">
                    {usd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-bank-payment-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !bankId}
                className="w-full h-12 text-base gap-2 bg-red-600 hover:bg-red-700"
                data-testid="button-save-bank-payment"
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
        </div>
      </div>
    </div>
  );
}
