import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema } from "@shared/routes";
import { usd, formatDate } from "@/lib/format-utils";
import { z } from "zod";
import { useInvoices, useCreateInvoice } from "@/hooks/use-invoices";
import { useClients } from "@/hooks/use-clients";
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
import { SearchSelect } from "@/components/search-select";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { data: invoices, isLoading } = useInvoices();
  const { data: clients } = useClients();
  const { mutate: createInvoice, isPending } = useCreateInvoice();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof insertInvoiceSchema>>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: { clientId: 0, type: "sale", total: "0", currency: "USD", status: "draft" },
  });

  const onSubmit = (values: z.infer<typeof insertInvoiceSchema>) => {
    const payload = { ...values, clientId: Number(values.clientId) };
    createInvoice(payload, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: t("Invoice created successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to create invoice"), description: err.message, variant: "destructive" });
      },
    });
  };

  const sales = invoices?.filter(i => i.type === 'sale') || [];
  const purchases = invoices?.filter(i => i.type === 'purchase') || [];

  const getClientName = (id: number) => clients?.find(c => c.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Invoices')}</h1>
          <p className="text-muted-foreground text-sm">{t('Manage sales and purchase invoices')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-invoice">
              <Plus className="w-5 h-5 mr-2" />
              {t('Add Invoice')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('Create Invoice')}</DialogTitle>
              <DialogDescription>{t('Fill in the invoice details.')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Client')}</FormLabel>
                    <FormControl>
                      <SearchSelect
                        items={(clients || []).map(c => ({ id: c.id, name: c.name }))}
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        placeholder={t('Select client')}
                        data-testid="select-invoice-client"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-invoice-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="sale">{t('Sale')}</SelectItem>
                          <SelectItem value="purchase">{t('Purchase')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Currency')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-invoice-currency"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="IQD">IQD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="total" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Total')}</FormLabel>
                    <FormControl><Input data-testid="input-invoice-total" type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Status')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-invoice-status"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                        <SelectItem value="approved">{t('Approved')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isPending} data-testid="button-save-invoice">
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Sales Invoices')}</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{sales.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Purchase Invoices')}</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{purchases.length}</div></CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : invoices?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><FileText className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No invoices found')}</h3>
              <p>{t('Create a new invoice to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Client')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead className="text-right">{t('Total')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((inv) => (
                    <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                      <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                      <TableCell className="font-medium">{getClientName(inv.clientId)}</TableCell>
                      <TableCell>
                        <Badge variant={inv.type === 'sale' ? 'default' : 'secondary'}>
                          {t(inv.type === 'sale' ? 'Sale' : 'Purchase')}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {inv.currency === 'USD' ? usd(inv.total) : `${Number(inv.total).toLocaleString()} IQD`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'approved' ? 'default' : 'secondary'}>
                          {t(inv.status === 'approved' ? 'Approved' : 'Draft')}
                        </Badge>
                      </TableCell>
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
