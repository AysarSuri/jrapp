import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import type { ExpenseType, Expense } from "@shared/schema";
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
  Save, Loader2, DollarSign, Banknote, RotateCcw, ListOrdered, Receipt,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtUsd } from "@/lib/format-utils";

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: allExpenses, isLoading: expensesLoading } = useExpenses();
  const { mutate: createExpense, isPending: isSaving } = useCreateExpense();
  const { data: expenseTypesList } = useExpenseTypes();

  const [expenseTypeId, setExpenseTypeId] = useState<string>("");
  const [expenseTypeName, setExpenseTypeName] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountIqd, setAmountIqd] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [historyOpen, setHistoryOpen] = useState(false);

  const types: ExpenseType[] = expenseTypesList || [];

  const selectType = useCallback((id: string) => {
    setExpenseTypeId(id);
    const et = types.find(t => t.id === parseInt(id));
    if (et) setExpenseTypeName(et.name);
  }, [types]);

  const resetForm = () => {
    setExpenseTypeId("");
    setExpenseTypeName("");
    setAmountUsd("");
    setAmountIqd("");
    setDescription("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!expenseTypeId) {
      toast({ title: t("Please select an expense type"), variant: "destructive" });
      return;
    }
    const usdVal = parseFloat(amountUsd || "0");
    const iqdVal = parseFloat(amountIqd || "0");
    if (usdVal <= 0 && iqdVal <= 0) {
      toast({ title: t("Please enter at least one amount"), variant: "destructive" });
      return;
    }

    createExpense({
      expenseTypeId: parseInt(expenseTypeId),
      expenseTypeName,
      amountUsd: amountUsd || "0",
      amountIqd: amountIqd || "0",
      description: description || null,
      reference: reference || null,
      date,
      time,
    }, {
      onSuccess: () => {
        toast({ title: t("Expense saved successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Failed to save expense"), variant: "destructive" });
      },
    });
  };

  const expensesList = allExpenses || [];
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  const totalUsd = expensesList.reduce((sum: number, e: Expense) => sum + parseFloat(e.amountUsd || "0"), 0);
  const totalIqd = expensesList.reduce((sum: number, e: Expense) => sum + parseFloat(e.amountIqd || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Receipt className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            {t('Expenses')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Record expenses in USD and IQD')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-expense-history">
                <ListOrdered className="h-4 w-4" />
                {t('Expense History')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('Expense History')}</DialogTitle>
              </DialogHeader>
              {expensesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Expense Type')}</TableHead>
                      <TableHead>{t('USD Amount')}</TableHead>
                      <TableHead>{t('IQD Amount')}</TableHead>
                      <TableHead>{t('Description')}</TableHead>
                      <TableHead>{t('Reference')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesList.map((e: Expense, i: number) => (
                      <TableRow key={e.id} data-testid={`row-expense-${e.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{e.date}</TableCell>
                        <TableCell className="font-mono text-sm">{e.time || "-"}</TableCell>
                        <TableCell className="font-medium">{e.expenseTypeName}</TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {parseFloat(e.amountUsd) > 0 ? `$${fmtUsd(e.amountUsd)}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {parseFloat(e.amountIqd) > 0 ? formatIQD(parseFloat(e.amountIqd)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{e.description || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {expensesList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {t('No expenses yet')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-expense">
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('Expense Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Expense Type')}</Label>
                <Select value={expenseTypeId} onValueChange={selectType}>
                  <SelectTrigger data-testid="select-expense-type">
                    <SelectValue placeholder={t('Select expense type...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(et => (
                      <SelectItem key={et.id} value={String(et.id)}>{et.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-expense-date" />
              </div>
              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-expense-time" />
              </div>
            </div>

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
                    data-testid="input-expense-usd"
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
                    data-testid="input-expense-iqd"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input placeholder={t('Reference number...')} value={reference} onChange={(e) => setReference(e.target.value)} data-testid="input-expense-reference" />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea placeholder={t('Description...')} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none h-10" data-testid="input-expense-description" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-red-200 dark:border-red-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Expense Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {expenseTypeName && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Expense Type')}</p>
                  <p className="font-bold text-lg">{expenseTypeName}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">{t('USD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-blue-600" data-testid="text-expense-usd-total">
                    ${fmtUsd(amountUsd || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('IQD Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-expense-iqd-total">
                    {formatIQD(parseFloat(amountIqd || "0"))}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !expenseTypeId}
                className="w-full h-12 text-base gap-2 bg-red-600 hover:bg-red-700"
                data-testid="button-save-expense"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('Save Expense')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('Total Expenses')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('Total USD')}</span>
                <span className="font-mono font-bold text-red-600" data-testid="text-total-expenses-usd">
                  ${fmtUsd(totalUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{t('Total IQD')}</span>
                <span className="font-mono font-bold text-red-600" data-testid="text-total-expenses-iqd">
                  {formatIQD(totalIqd)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-muted-foreground">{t('Total Records')}</span>
                <span className="font-mono font-bold">{expensesList.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
