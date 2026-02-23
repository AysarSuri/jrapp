import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyExchanges, useCreateCurrencyExchange, useDeleteCurrencyExchange } from "@/hooks/use-currency-exchanges";
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
import { useToast } from "@/hooks/use-toast";
import {
  Save, Loader2, ArrowRightLeft, RotateCcw, Trash2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { fmtUsd } from "@/lib/format-utils";

export default function CurrencyExchangePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: exchanges, isLoading } = useCurrencyExchanges();
  const { mutate: createExchange, isPending: isSaving } = useCreateCurrencyExchange();
  const { mutate: deleteExchange } = useDeleteCurrencyExchange();

  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("IQD");
  const [fromAmount, setFromAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));

  const toAmount = useMemo(() => {
    const amt = parseFloat(fromAmount) || 0;
    const rate = parseFloat(exchangeRate) || 0;
    return amt * rate;
  }, [fromAmount, exchangeRate]);

  const handleCurrencySwap = useCallback(() => {
    setFromCurrency(prev => prev === "USD" ? "IQD" : "USD");
    setToCurrency(prev => prev === "USD" ? "IQD" : "USD");
    setFromAmount("");
    setExchangeRate("");
  }, []);

  const handleSelectFromCurrency = useCallback((val: string) => {
    setFromCurrency(val);
    setToCurrency(val === "USD" ? "IQD" : "USD");
    setFromAmount("");
    setExchangeRate("");
  }, []);

  const resetForm = useCallback(() => {
    setFromAmount("");
    setExchangeRate("");
    setNote("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  }, []);

  const handleSubmit = useCallback(() => {
    const amt = parseFloat(fromAmount);
    const rate = parseFloat(exchangeRate);

    if (!amt || amt <= 0) {
      toast({ title: t("Error"), description: t("Amount must be greater than zero"), variant: "destructive" });
      return;
    }
    if (!rate || rate <= 0) {
      toast({ title: t("Error"), description: t("Exchange rate must be greater than zero"), variant: "destructive" });
      return;
    }

    createExchange({
      fromCurrency,
      toCurrency,
      fromAmount: String(amt),
      exchangeRate: String(rate),
      toAmount: String(amt * rate),
      note: note || null,
      date,
      time,
    }, {
      onSuccess: () => {
        toast({ title: t("Success"), description: t("Currency exchange recorded successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Error"), description: t("Failed to record exchange"), variant: "destructive" });
      },
    });
  }, [fromCurrency, toCurrency, fromAmount, exchangeRate, note, date, time, createExchange, toast, t, resetForm]);

  const handleDelete = useCallback((id: number) => {
    deleteExchange(id, {
      onSuccess: () => {
        toast({ title: t("Success"), description: t("Exchange record deleted") });
      },
    });
  }, [deleteExchange, toast, t]);

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount) || 0;
    if (currency === "USD") return `$${fmtUsd(num)}`;
    return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQD`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowRightLeft className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Currency Exchange')}</h1>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            {t('New Exchange')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('Date')}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-date"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="input-time"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-2">
              <Label>{t('From Currency')}</Label>
              <Select value={fromCurrency} onValueChange={handleSelectFromCurrency}>
                <SelectTrigger data-testid="select-from-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="IQD">IQD (د.ع)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Amount')}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={fromCurrency === "USD" ? "$0.00" : "0 IQD"}
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                data-testid="input-from-amount"
                className="font-mono"
              />
            </div>

            <div className="flex justify-center pb-2">
              <Button variant="outline" size="icon" onClick={handleCurrencySwap} data-testid="button-swap">
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t('Exchange Rate')}</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.00"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                data-testid="input-exchange-rate"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('To Currency')} ({toCurrency})</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 font-mono font-bold text-lg" data-testid="text-to-amount">
                {formatAmount(String(toAmount), toCurrency)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Note')}</Label>
            <Textarea
              placeholder={t('Note') + "..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-note"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2" data-testid="button-save">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('Save')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
              {t('Reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Exchange History')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !exchanges?.length ? (
            <div className="text-center py-12 text-muted-foreground">{t('No records found')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>#</TableHead>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Time')}</TableHead>
                  <TableHead>{t('From')}</TableHead>
                  <TableHead>{t('Amount')}</TableHead>
                  <TableHead>{t('Rate')}</TableHead>
                  <TableHead>{t('To')}</TableHead>
                  <TableHead>{t('Result')}</TableHead>
                  <TableHead>{t('Note')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.map((ex, i) => (
                  <TableRow key={ex.id} data-testid={`row-exchange-${ex.id}`}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{ex.date}</TableCell>
                    <TableCell className="font-mono text-sm">{ex.time}</TableCell>
                    <TableCell>
                      <Badge variant={ex.fromCurrency === "USD" ? "default" : "secondary"}>
                        {ex.fromCurrency}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {formatAmount(ex.fromAmount, ex.fromCurrency)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {parseFloat(ex.exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ex.toCurrency === "USD" ? "default" : "secondary"}>
                        {ex.toCurrency}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">
                      {formatAmount(ex.toAmount, ex.toCurrency)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">
                      {ex.note || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ex.id)}
                        data-testid={`button-delete-${ex.id}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
