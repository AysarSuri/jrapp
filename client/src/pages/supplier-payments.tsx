import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSupplierPayments, useCreateSupplierPayment } from "@/hooks/use-supplier-payments";
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
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, Building, Landmark,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SupplierPaymentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: payments, isLoading: paymentsLoading } = useSupplierPayments();
  const { mutate: createPayment, isPending: isSaving } = useCreateSupplierPayment();

  const { data: suppliers } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    select: (data: Client[]) => data.filter(c => c.type === "supplier"),
  });

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [commissionUsd, setCommissionUsd] = useState("");
  const [commissionIqd, setCommissionIqd] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyOpen, setHistoryOpen] = useState(false);

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const selectSupplier = useCallback((id: string) => {
    setSupplierId(id);
    const supplier = suppliers?.find(s => s.id === parseInt(id));
    if (supplier) {
      setSupplierName(supplier.name);
    }
  }, [suppliers]);

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

  const selectedSupplier = suppliers?.find(s => s.id === parseInt(supplierId));

  const resetForm = () => {
    setSupplierId("");
    setSupplierName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setAmountUsd("");
    setAmountIqd("");
    setCommissionUsd("");
    setCommissionIqd("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!supplierId) {
      toast({ title: t("Please select a supplier"), variant: "destructive" });
      return;
    }
    if (!paymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one payment amount"), variant: "destructive" });
      return;
    }

    createPayment({
      supplierId: parseInt(supplierId),
      supplierName,
      paymentSource: paymentSource.split(":")[0],
      paymentSourceName,
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      commissionUsd: commissionUsd || "0",
      commissionIqd: commissionIqd || "0",
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

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Banknote className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            {t('Supplier Payments')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Transfer or pay to supplier from bank or transfer office')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-payment-history">
                <ListOrdered className="h-4 w-4" />
                {t('Payment History')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('Payment History')}</DialogTitle>
              </DialogHeader>
              {paymentsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Supplier')}</TableHead>
                      <TableHead>{t('Source')}</TableHead>
                      <TableHead>{t('USD Amount')}</TableHead>
                      <TableHead>{t('IQD Amount')}</TableHead>
                      <TableHead>{t('Commission USD')}</TableHead>
                      <TableHead>{t('Commission IQD')}</TableHead>
                      <TableHead>{t('Old Debt USD')}</TableHead>
                      <TableHead>{t('Old Debt IQD')}</TableHead>
                      <TableHead>{t('Remaining USD')}</TableHead>
                      <TableHead>{t('Remaining IQD')}</TableHead>
                      <TableHead>{t('Reference')}</TableHead>
                      <TableHead>{t('Notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.map((p, i) => (
                      <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{p.date}</TableCell>
                        <TableCell className="font-mono text-sm">{p.time || "-"}</TableCell>
                        <TableCell className="font-medium">{p.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.paymentSourceName}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {parseFloat(p.amountUsd) > 0 ? `$${parseFloat(p.amountUsd).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {parseFloat(p.amountIqd) > 0 ? formatIQD(parseFloat(p.amountIqd)) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {parseFloat(p.commissionUsd) > 0 ? `$${parseFloat(p.commissionUsd).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {parseFloat(p.commissionIqd) > 0 ? formatIQD(parseFloat(p.commissionIqd)) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {parseFloat(p.oldDebtUsd) !== 0 ? `$${parseFloat(p.oldDebtUsd).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {parseFloat(p.oldDebtIqd) !== 0 ? formatIQD(parseFloat(p.oldDebtIqd)) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-emerald-600">
                          {parseFloat(p.remainingUsd) !== 0 ? `$${parseFloat(p.remainingUsd).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-emerald-600">
                          {parseFloat(p.remainingIqd) !== 0 ? formatIQD(parseFloat(p.remainingIqd)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(!payments || payments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                          {t('No payments yet')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-payment">
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
                <Label>{t('Supplier')}</Label>
                <Select value={supplierId} onValueChange={selectSupplier}>
                  <SelectTrigger data-testid="select-payment-supplier">
                    <SelectValue placeholder={t('Select supplier...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
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
                  data-testid="input-payment-date"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  data-testid="input-payment-time"
                />
              </div>
            </div>

            {selectedSupplier && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Supplier')}</p>
                      <p className="font-bold">{selectedSupplier.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Debt USD')}</p>
                      <p className="font-mono font-bold text-red-600">${parseFloat(selectedSupplier.oldDebtUsd).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Debt IQD')}</p>
                      <p className="font-mono font-bold text-red-600">{formatIQD(parseFloat(selectedSupplier.oldDebtIqd))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>{t('Payment Source')}</Label>
              <Select value={paymentSource} onValueChange={selectPaymentSource}>
                <SelectTrigger data-testid="select-payment-source">
                  <SelectValue placeholder={t('Select bank or transfer office...')} />
                </SelectTrigger>
                <SelectContent>
                  {banks.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Landmark className="h-3 w-3" /> {t('Banks')}
                      </div>
                      {banks.map(b => (
                        <SelectItem key={`bank:${b.id}`} value={`bank:${b.id}`}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {transferOffices.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Building className="h-3 w-3" /> {t('Transfer Offices')}
                      </div>
                      {transferOffices.map(o => (
                        <SelectItem key={`transfer_office:${o.id}`} value={`transfer_office:${o.id}`}>
                          {o.name}
                        </SelectItem>
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
                    {t('USD Payment')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-payment-usd"
                  />
                </CardContent>
              </Card>

              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-orange-600" />
                    {t('IQD Payment')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="250"
                    min="0"
                    placeholder="0"
                    value={amountIqd}
                    onChange={(e) => setAmountIqd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-payment-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-100 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-950/20">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    {t('Commission USD')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={commissionUsd}
                    onChange={(e) => setCommissionUsd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-commission-usd"
                  />
                </CardContent>
              </Card>

              <Card className="border-orange-100 dark:border-orange-950 bg-orange-50/30 dark:bg-orange-950/20">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-orange-500" />
                    {t('Commission IQD')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="250"
                    min="0"
                    placeholder="0"
                    value={commissionIqd}
                    onChange={(e) => setCommissionIqd(e.target.value)}
                    className="text-lg font-mono text-center h-12"
                    data-testid="input-commission-iqd"
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
                  data-testid="input-payment-reference"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Textarea
                  placeholder={t('Notes...')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none h-10"
                  data-testid="input-payment-note"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-emerald-200 dark:border-emerald-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSupplier && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Supplier')}</p>
                    <p className="font-bold text-lg">{selectedSupplier.name}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-payment-usd-total">
                    ${parseFloat(amountUsd || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-payment-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
                {(parseFloat(commissionUsd || "0") > 0 || parseFloat(commissionIqd || "0") > 0) && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('Commission USD')}</span>
                      <span className="font-mono text-sm" data-testid="text-commission-usd-total">
                        ${parseFloat(commissionUsd || "0").toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('Commission IQD')}</span>
                      <span className="font-mono text-sm" data-testid="text-commission-iqd-total">
                        {formatIQD(parseFloat(commissionIqd || "0"))}
                      </span>
                    </div>
                  </>
                )}
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
                disabled={isSaving || !supplierId || !paymentSource}
                className="w-full h-12 text-base gap-2 bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-save-payment"
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

          {selectedSupplier && (
            <Card className="border-red-200 dark:border-red-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-600">{t('Current Supplier Debt')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('Debt USD')}</span>
                  <span className="font-mono font-bold text-red-600">${parseFloat(selectedSupplier.oldDebtUsd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('Debt IQD')}</span>
                  <span className="font-mono font-bold text-red-600">{formatIQD(parseFloat(selectedSupplier.oldDebtIqd))}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('After Payment USD')}</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ${(parseFloat(selectedSupplier.oldDebtUsd) - parseFloat(amountUsd || "0")).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('After Payment IQD')}</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatIQD(parseFloat(selectedSupplier.oldDebtIqd) - parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
