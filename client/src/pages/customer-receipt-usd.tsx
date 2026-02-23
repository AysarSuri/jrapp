import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCustomerReceipts, useCreateCustomerReceipt } from "@/hooks/use-customer-receipts";
import { useQuery } from "@tanstack/react-query";
import type { Client, Bank, TransferOffice } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, DollarSign, RotateCcw, ListOrdered, Building, Landmark, Percent,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usd } from "@/lib/format-utils";

export default function CustomerReceiptUsdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: receipts, isLoading: receiptsLoading } = useCustomerReceipts();
  const { mutate: createReceipt, isPending: isSaving } = useCreateCustomerReceipt();

  const { data: customers } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    select: (data: Client[]) => data.filter(c => c.type === "customer"),
  });

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyOpen, setHistoryOpen] = useState(false);

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const usdReceipts = receipts?.filter(r => r.currency === "USD") || [];

  const selectCustomer = useCallback((id: string) => {
    setCustomerId(id);
    const customer = customers?.find(c => c.id === parseInt(id));
    if (customer) {
      setCustomerName(customer.name);
    }
  }, [customers]);

  const selectPaymentSource = useCallback((val: string) => {
    setPaymentSource(val);
    const [type, id] = val.split(":");
    if (type === "bank") {
      const bank = banksList?.find(b => b.id === parseInt(id));
      if (bank) setPaymentSourceName(`${t("Bank")} - ${bank.name}`);
    } else {
      const office = transferOfficesList?.find(o => o.id === parseInt(id));
      if (office) setPaymentSourceName(`${t("Transfer Office")} - ${office.name}`);
    }
  }, [banksList, transferOfficesList, t]);

  const selectedCustomer = customers?.find(c => c.id === parseInt(customerId));

  const resetForm = () => {
    setCustomerId("");
    setCustomerName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setAmount("");
    setDiscount("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!customerId) {
      toast({ title: t("Please select a customer"), variant: "destructive" });
      return;
    }
    if (!paymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const amountVal = parseFloat(amount || "0");
    const discountVal = parseFloat(discount || "0");
    if (amountVal <= 0 && discountVal <= 0) {
      toast({ title: t("Please enter an amount or discount"), variant: "destructive" });
      return;
    }

    createReceipt({
      customerId: parseInt(customerId),
      customerName,
      paymentSource: paymentSource.split(":")[0],
      paymentSourceName,
      amount: amount || "0",
      discount: discount || "0",
      currency: "USD",
      note: note || null,
      reference: reference || null,
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
  };

  const totalDeducted = parseFloat(amount || "0") + parseFloat(discount || "0");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            {t('Customer Receipt USD')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Receive payments from customers in USD')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-receipt-history">
                <ListOrdered className="h-4 w-4" />
                {t('Receipt History')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('Receipt History')} - USD</DialogTitle>
              </DialogHeader>
              {receiptsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Customer')}</TableHead>
                      <TableHead>{t('Source')}</TableHead>
                      <TableHead>{t('Amount')}</TableHead>
                      <TableHead>{t('Discount')}</TableHead>
                      <TableHead>{t('Opening Balance')}</TableHead>
                      <TableHead>{t('Remaining')}</TableHead>
                      <TableHead>{t('Reference')}</TableHead>
                      <TableHead>{t('Notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usdReceipts.map((r, i) => (
                      <TableRow key={r.id} data-testid={`row-receipt-${r.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{r.date}</TableCell>
                        <TableCell className="font-mono text-sm">{r.time || "-"}</TableCell>
                        <TableCell className="font-medium">{r.customerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.paymentSourceName}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-blue-600">
                          {parseFloat(r.amount) > 0 ? usd(r.amount) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-green-600">
                          {parseFloat(r.discount) > 0 ? usd(r.discount) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {usd(r.oldDebt)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-emerald-600">
                          {usd(r.remaining)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.reference || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {usdReceipts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          {t('No receipts yet')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-receipt">
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Receipt Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Customer')}</Label>
                <Select value={customerId} onValueChange={selectCustomer}>
                  <SelectTrigger data-testid="select-receipt-customer">
                    <SelectValue placeholder={t('Select customer...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-receipt-date"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  data-testid="input-receipt-time"
                />
              </div>
            </div>

            {selectedCustomer && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Customer')}</p>
                      <p className="font-bold">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Debt USD')}</p>
                      <p className="font-mono font-bold text-red-600">{usd(selectedCustomer.oldDebtUsd)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>{t('Amount Received At')}</Label>
              <Select value={paymentSource} onValueChange={selectPaymentSource}>
                <SelectTrigger data-testid="select-receipt-source">
                  <SelectValue placeholder={t('Select account where amount was received...')} />
                </SelectTrigger>
                <SelectContent>
                  {banks.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Landmark className="h-3 w-3" /> {t('Banks')}
                      </div>
                      {banks.map(b => (
                        <SelectItem key={`bank:${b.id}`} value={`bank:${b.id}`}>{b.name}</SelectItem>
                      ))}
                    </>
                  )}
                  {transferOffices.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Building className="h-3 w-3" /> {t('Transfer Offices')}
                      </div>
                      {transferOffices.map(o => (
                        <SelectItem key={`transfer_office:${o.id}`} value={`transfer_office:${o.id}`}>{o.name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
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
                    data-testid="input-receipt-amount"
                  />
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Percent className="h-4 w-4 text-green-600" />
                    {t('Discount')} (USD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-receipt-discount"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input
                  placeholder={t('Reference number...')}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="input-receipt-reference"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Textarea
                  placeholder={t('Notes...')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none h-10"
                  data-testid="input-receipt-note"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Receipt Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Customer')}</p>
                    <p className="font-bold text-lg">{selectedCustomer.name}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-receipt-amount-total">
                    {usd(amount || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-600">{t('Discount')}</span>
                  <span className="font-mono font-bold text-lg text-green-600" data-testid="text-receipt-discount-total">
                    {usd(discount || "0")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('Total Deducted')}</span>
                  <span className="font-mono font-bold text-lg" data-testid="text-receipt-total-deducted">
                    {usd(totalDeducted)}
                  </span>
                </div>
              </div>

              {paymentSource && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Received at')}</p>
                    <p className="font-medium text-sm">{paymentSourceName}</p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={isSaving || !customerId || !paymentSource}
                className="w-full h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-receipt"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Receipt')}
              </Button>
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{t('Current Debt USD')}</p>
                  <p className="font-mono text-2xl font-bold text-red-600">
                    {usd(selectedCustomer.oldDebtUsd)}
                  </p>
                  {totalDeducted > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">{t('After Receipt')}</p>
                      <p className="font-mono text-xl font-bold text-emerald-600">
                        {usd((parseFloat(selectedCustomer.oldDebtUsd) - totalDeducted))}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
