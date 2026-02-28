import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client } from "@shared/routes";
import { z } from "zod";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { useAddresses } from "@/hooks/use-addresses";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/format-utils";

const customerSchema = insertClientSchema.extend({
  type: z.literal("customer").default("customer"),
});

export default function CustomersPage() {
  const { t } = useTranslation();
  const { data: allClients, isLoading } = useClients();
  const { data: dbAddresses } = useAddresses();
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutate: deleteClient } = useDeleteClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", type: "customer", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0" },
  });

  const openCreateDialog = () => {
    setEditingClient(null);
    form.reset({ name: "", type: "customer", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0" });
    setOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      type: "customer",
      contact: client.contact || "",
      address: client.address || "",
      oldDebtUsd: client.oldDebtUsd || "0",
      oldDebtIqd: client.oldDebtIqd || "0",
    });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof customerSchema>) => {
    if (editingClient) {
      updateClient({ id: editingClient.id, data: { ...values, type: "customer" } }, {
        onSuccess: () => {
          setOpen(false);
          setEditingClient(null);
          form.reset();
          toast({ title: t("Customer updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update customer"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createClient({ ...values, type: "customer" }, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Customer created successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to create customer"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteClient(id, {
      onSuccess: () => {
        toast({ title: t("Customer deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete customer"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const customers = allClients?.filter(c => c.type === "customer") || [];
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOldDebtUsd = customers.reduce((sum, c) => sum + Number(c.oldDebtUsd || 0), 0);
  const totalOldDebtIqd = customers.reduce((sum, c) => sum + Number(c.oldDebtIqd || 0), 0);

  const addresses = dbAddresses || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Customers')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage your customers')}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingClient(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Customer')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? t('Edit Customer') : t('Add New Customer')}</DialogTitle>
              <DialogDescription>{t('Fill in the customer details below.')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Name')}</FormLabel>
                    <FormControl><Input data-testid="input-customer-name" placeholder={t('Customer Name')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Contact')}</FormLabel>
                    <FormControl><Input data-testid="input-customer-contact" placeholder="0770-000-0000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Address')}</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer-address">
                          <SelectValue placeholder={t('Select address...')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {addresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.name}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {addr.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="oldDebtUsd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Opening Balance (USD)')}</FormLabel>
                      <FormControl><Input data-testid="input-customer-old-debt-usd" type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="oldDebtIqd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Opening Balance (IQD)')}</FormLabel>
                      <FormControl><Input data-testid="input-customer-old-debt-iqd" type="number" step="1" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditingClient(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-customer">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Customers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Opening Balances (USD)')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usd(totalOldDebtUsd)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Opening Balances (IQD)')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOldDebtIqd.toLocaleString()} IQD</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search customers...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-customers" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><Users className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No customers found')}</h3>
              <p>{t('Add a new customer to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Address')}</TableHead>
                    <TableHead>{t('Contact')}</TableHead>
                    <TableHead className="text-right">{t('Opening Balance (USD)')}</TableHead>
                    <TableHead className="text-right">{t('Opening Balance (IQD)')}</TableHead>
                    <TableHead className="text-right">{t('Balance')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.id} data-testid={`row-customer-${client.id}`}>
                      <TableCell className="font-mono text-xs">{client.id}</TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        {client.address ? (
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {client.address}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{client.contact || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{usd(client.oldDebtUsd || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(client.oldDebtIqd || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{Number(client.balance).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(client)} data-testid={`button-edit-customer-${client.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-customer-${client.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Customer')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this customer?')} ({client.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(client.id)} data-testid={`button-confirm-delete-customer-${client.id}`}>
                                  {t('Delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
