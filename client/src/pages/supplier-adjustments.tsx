import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSupplierAdjustments, useCreateSupplierAdjustment } from "@/hooks/use-supplier-adjustments";
import { useQuery } from "@tanstack/react-query";
import type { Client, SupplierAdjustment, Bank, TransferOffice } from "@shared/schema";
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
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, ArrowDownToLine, Percent, HandCoins, Landmark, Building,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtUsd } from "@/lib/format-utils";

export default function SupplierAdjustmentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: adjustments, isLoading: adjustmentsLoading } = useSupplierAdjustments();
  const { mutate: createAdjustment, isPending: isSaving } = useCreateSupplierAdjustment();

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
  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<string>("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [note, setNote] = useState("");
  const [payTo, setPayTo] = useState<string>("");
  const [payToName, setPayToName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectSupplier = useCallback((id: string) => {
    setSupplierId(id);
    const supplier = suppliers?.find(s => s.id === parseInt(id));
    if (supplier) {
      setSupplierName(supplier.name);
    }
  }, [suppliers]);

  const selectPayTo = useCallback((val: string) => {
    setPayTo(val);
    if (val === "byhand:0") {
      setPayToName(t("By Hand"));
    } else {
      const [type, id] = val.split(":");
      if (type === "bank") {
        const bank = banksList?.find(b => b.id === parseInt(id));
        if (bank) setPayToName(`${t("Bank")} - ${bank.name}`);
      } else {
        const office = transferOfficesList?.find(o => o.id === parseInt(id));
        if (office) setPayToName(`${t("Transfer Office")} - ${office.name}`);
      }
    }
  }, [banksList, transferOfficesList, t]);

  const selectedSupplier = suppliers?.find(s => s.id === parseInt(supplierId));

  const resetForm = () => {
    setSupplierId("");
    setSupplierName("");
    setAdjustmentType("");
    setAmountUsd("");
    setAmountIqd("");
    setNote("");
    setPayTo("");
    setPayToName("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!supplierId || !adjustmentType) {
      toast({ title: t("Please select supplier and type"), variant: "destructive" });
      return;
    }
    const usd = parseFloat(amountUsd) || 0;
    const iqd = parseFloat(amountIqd) || 0;
    if (usd <= 0 && iqd <= 0) {
      toast({ title: t("Enter at least one amount"), variant: "destructive" });
      return;
    }

    createAdjustment({
      supplierId: parseInt(supplierId),
      supplierName,
      type: adjustmentType,
      amountUsd: String(usd),
      amountIqd: String(iqd),
      payTo: payTo || undefined,
      payToName: payToName || undefined,
      note: note || undefined,
      date,
      time,
    }, {
      onSuccess: () => {
        toast({ title: t("Adjustment saved successfully") });
        resetForm();
      },
      onError: (err: any) => {
        toast({ title: err.message || t("Failed to save"), variant: "destructive" });
      },
    });
  };

  const supplierAdjustments = adjustments as SupplierAdjustment[] | undefined;
  const filteredHistory = supplierAdjustments?.filter(
    a => supplierId ? a.supplierId === parseInt(supplierId) : true
  ) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            {t("Supplier Adjustments")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("Record received amounts or discounts from suppliers")}
          </p>
        </div>
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-history">
              <ListOrdered className="h-4 w-4" />
              {t("History")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Adjustment History")}</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("Supplier")}</TableHead>
                  <TableHead>{t("Type")}</TableHead>
                  <TableHead>{t("Old Debt USD")}</TableHead>
                  <TableHead>{t("Old Debt IQD")}</TableHead>
                  <TableHead>{t("Amount USD")}</TableHead>
                  <TableHead>{t("Amount IQD")}</TableHead>
                  <TableHead>{t("Remaining USD")}</TableHead>
                  <TableHead>{t("Remaining IQD")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Time")}</TableHead>
                  <TableHead>{t("Note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierAdjustments?.map((adj, i) => (
                  <TableRow key={adj.id} data-testid={`row-adjustment-${adj.id}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{adj.supplierName}</TableCell>
                    <TableCell>
                      <Badge variant={adj.type === "received" ? "default" : "secondary"}>
                        {adj.type === "received" ? t("Received from Supplier") : t("Discount from Supplier")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">${fmtUsd(adj.oldDebtUsd)}</TableCell>
                    <TableCell className="text-red-600 font-medium">{parseFloat(adj.oldDebtIqd).toLocaleString()} IQD</TableCell>
                    <TableCell className="text-blue-600 font-bold">${fmtUsd(adj.amountUsd)}</TableCell>
                    <TableCell className="text-orange-600 font-bold">{parseFloat(adj.amountIqd).toLocaleString()} IQD</TableCell>
                    <TableCell className="font-medium">${fmtUsd(adj.remainingUsd)}</TableCell>
                    <TableCell className="font-medium">{parseFloat(adj.remainingIqd).toLocaleString()} IQD</TableCell>
                    <TableCell>{adj.date}</TableCell>
                    <TableCell>{adj.time}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{adj.note || "-"}</TableCell>
                  </TableRow>
                ))}
                {(!supplierAdjustments || supplierAdjustments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      {t("No adjustments recorded yet")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              {t("New Adjustment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Supplier")}</Label>
                <Select value={supplierId} onValueChange={selectSupplier}>
                  <SelectTrigger data-testid="select-supplier">
                    <SelectValue placeholder={t("Select supplier...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("Adjustment Type")}</Label>
                <Select value={adjustmentType} onValueChange={(val) => {
                    setAdjustmentType(val);
                    if (val === "discount") {
                      setPayTo("");
                      setPayToName("");
                    }
                  }}>
                  <SelectTrigger data-testid="select-adjustment-type">
                    <SelectValue placeholder={t("Select type...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">
                      <span className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-green-600" />
                        {t("Received from Supplier")}
                      </span>
                    </SelectItem>
                    <SelectItem value="discount">
                      <span className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-purple-600" />
                        {t("Discount from Supplier")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {adjustmentType !== "discount" && (
              <>
                <Separator />

                <div className="space-y-2">
                  <Label>{t('Pay To')}</Label>
                  <Select value={payTo} onValueChange={selectPayTo}>
                    <SelectTrigger data-testid="select-pay-to">
                      <SelectValue placeholder={t('Select bank or transfer office...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <HandCoins className="h-3 w-3" /> {t('By Hand')}
                      </div>
                      <SelectItem value="byhand:0">{t('By Hand')}</SelectItem>

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
              </>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Date")}</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Time")}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  data-testid="input-time"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
                    <DollarSign className="h-5 w-5" />
                    {t("Amount")} (USD)
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountUsd}
                    onChange={e => setAmountUsd(e.target.value)}
                    className="text-lg font-bold border-blue-300 dark:border-blue-700"
                    data-testid="input-amount-usd"
                  />
                </CardContent>
              </Card>

              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-semibold">
                    <Banknote className="h-5 w-5" />
                    {t("Amount")} (IQD)
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={amountIqd}
                    onChange={e => setAmountIqd(e.target.value)}
                    className="text-lg font-bold border-orange-300 dark:border-orange-700"
                    data-testid="input-amount-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("Note")}</Label>
              <Textarea
                placeholder={t("Add note...")}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                data-testid="input-note"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
                data-testid="button-save"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("Save")}
              </Button>
              <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
                <RotateCcw className="h-4 w-4" />
                {t("Reset")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedSupplier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Supplier Info")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("Name")}</p>
                  <p className="font-semibold text-lg">{selectedSupplier.name}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Debt USD")}</p>
                    <p className="text-xl font-bold text-red-600">
                      ${fmtUsd(selectedSupplier.oldDebtUsd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Debt IQD")}</p>
                    <p className="text-xl font-bold text-red-600">
                      {parseFloat(selectedSupplier.oldDebtIqd).toLocaleString()} IQD
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {supplierId && filteredHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Recent Adjustments")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredHistory.slice(0, 5).map(adj => (
                    <div key={adj.id} className="border rounded-lg p-3 space-y-1" data-testid={`card-recent-adj-${adj.id}`}>
                      <div className="flex items-center justify-between">
                        <Badge variant={adj.type === "received" ? "default" : "secondary"} className="text-xs">
                          {adj.type === "received" ? t("Received from Supplier") : t("Discount from Supplier")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{adj.date}</span>
                      </div>
                      {parseFloat(adj.amountUsd) > 0 && (
                        <p className="text-sm text-blue-600 font-medium">${fmtUsd(adj.amountUsd)}</p>
                      )}
                      {parseFloat(adj.amountIqd) > 0 && (
                        <p className="text-sm text-orange-600 font-medium">{parseFloat(adj.amountIqd).toLocaleString()} IQD</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
