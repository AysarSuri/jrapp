import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAccountSchema } from "@shared/routes";
import { usd } from "@/lib/format-utils";
import { z } from "zod";
import { useAccounts, useCreateAccount } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Wallet, Loader2 } from "lucide-react";
import { IconAccounts, IconBank } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AccountsPage() {
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useAccounts();
  const { mutate: createAccount, isPending } = useCreateAccount();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof insertAccountSchema>>({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: { name: "", type: "cash", currency: "USD" },
  });

  const onSubmit = (values: z.infer<typeof insertAccountSchema>) => {
    createAccount(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: t("Account created successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to create account"), description: err.message, variant: "destructive" });
      },
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank': return <IconBank className="w-5 h-5" />;
      case 'transfer_office': return <IconAccounts className="w-5 h-5" />;
      default: return <Wallet className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return t('Bank');
      case 'transfer_office': return t('Transfer Office');
      default: return t('Cash');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Accounts')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage banks, cash boxes and transfer offices')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-account">
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Account')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('Add New Account')}</DialogTitle>
              <DialogDescription>{t('Fill in the account details below.')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Name')}</FormLabel>
                    <FormControl><Input data-testid="input-account-name" placeholder="Account Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="cash">{t('Cash')}</SelectItem>
                          <SelectItem value="bank">{t('Bank')}</SelectItem>
                          <SelectItem value="transfer_office">{t('Transfer Office')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Currency')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-account-currency"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="IQD">IQD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isPending} data-testid="button-save-account">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : accounts?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="bg-muted/50 p-4 rounded-full mb-4"><Wallet className="w-10 h-10" /></div>
          <h3 className="font-semibold text-lg">{t('No accounts found')}</h3>
          <p>{t('Add a new account to get started.')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => (
            <Card key={account.id} data-testid={`card-account-${account.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {getIcon(account.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(account.type)}</p>
                  </div>
                </div>
                <Badge variant="secondary">{account.currency}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  {account.currency === 'USD' ? usd(account.balance) : `${Number(account.balance).toLocaleString()} IQD`}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
