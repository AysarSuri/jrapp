import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/routes";
import { z } from "zod";
import { useTransactions, useCreateTransaction } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowRightLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { data: transactions, isLoading } = useTransactions();
  const { data: accounts } = useAccounts();
  const { mutate: createTransaction, isPending } = useCreateTransaction();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof insertTransactionSchema>>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: { fromAccountId: null, toAccountId: null, amount: "0", currency: "USD", type: "deposit", reference: "" },
  });

  const onSubmit = (values: z.infer<typeof insertTransactionSchema>) => {
    const payload = {
      ...values,
      fromAccountId: values.fromAccountId ? Number(values.fromAccountId) : null,
      toAccountId: values.toAccountId ? Number(values.toAccountId) : null,
    };
    createTransaction(payload, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: t("Transaction created successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to create transaction"), description: err.message, variant: "destructive" });
      },
    });
  };

  const getAccountName = (id: number | null) => {
    if (!id) return '-';
    return accounts?.find(a => a.id === id)?.name || `#${id}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': case 'receipt': return 'default';
      case 'withdrawal': case 'payment': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Transactions')}</h1>
          <p className="text-muted-foreground mt-1">{t('Track financial movements')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-transaction">
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Transaction')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('Create Transaction')}</DialogTitle>
              <DialogDescription>{t('Fill in the transaction details.')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Type')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-tx-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="deposit">{t('Deposit')}</SelectItem>
                        <SelectItem value="withdrawal">{t('Withdrawal')}</SelectItem>
                        <SelectItem value="transfer">{t('Transfer')}</SelectItem>
                        <SelectItem value="payment">{t('Payment')}</SelectItem>
                        <SelectItem value="receipt">{t('Receipt')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fromAccountId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('From Account')}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value ? String(field.value) : "none"}>
                        <FormControl><SelectTrigger data-testid="select-tx-from"><SelectValue placeholder={t('None')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('None')}</SelectItem>
                          {accounts?.map(a => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="toAccountId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('To Account')}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value ? String(field.value) : "none"}>
                        <FormControl><SelectTrigger data-testid="select-tx-to"><SelectValue placeholder={t('None')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('None')}</SelectItem>
                          {accounts?.map(a => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Amount')}</FormLabel>
                      <FormControl><Input data-testid="input-tx-amount" type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Currency')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-tx-currency"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="IQD">IQD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Reference')}</FormLabel>
                    <FormControl><Input data-testid="input-tx-reference" placeholder="REF-001" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isPending} data-testid="button-save-transaction">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : transactions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><ArrowRightLeft className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No transactions found')}</h3>
              <p>{t('Create a new transaction to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('From')}</TableHead>
                    <TableHead>{t('To')}</TableHead>
                    <TableHead className="text-right">{t('Amount')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeColor(tx.type) as any}>{t(tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}</Badge>
                      </TableCell>
                      <TableCell>{getAccountName(tx.fromAccountId)}</TableCell>
                      <TableCell>{getAccountName(tx.toAccountId)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.currency === 'USD' ? '$' : ''}{Number(tx.amount).toLocaleString()}{tx.currency === 'IQD' ? ' IQD' : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{tx.reference || '-'}</TableCell>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
