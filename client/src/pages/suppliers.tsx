import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Truck, Loader2, MapPin, Pencil, Trash2, ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/format-utils";
import { AddressSearchSelect } from "@/components/address-search-select";

const supplierSchema = insertClientSchema.extend({
  type: z.literal("supplier").default("supplier"),
});

const ITEMS_PER_PAGE = 10;

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { data: allClients, isLoading } = useClients();
  const { data: dbAddresses } = useAddresses();
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutate: deleteClient } = useDeleteClient();
  const { toast } = useToast();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0" },
  });

  const startEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      type: "supplier",
      contact: client.contact || "",
      address: client.address || "",
      oldDebtUsd: client.oldDebtUsd || "0",
      oldDebtIqd: client.oldDebtIqd || "0",
    });
  };

  const cancelEdit = () => {
    setEditingClient(null);
    form.reset({ name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0" });
  };

  const onSubmit = (values: z.infer<typeof supplierSchema>) => {
    const existingSuppliers = allClients?.filter(c => c.type === "supplier") || [];
    const isDuplicate = existingSuppliers.some(
      s => s.name.trim().toLowerCase() === values.name.trim().toLowerCase() &&
        (!editingClient || s.id !== editingClient.id)
    );
    if (isDuplicate) {
      toast({ title: t("Supplier name already exists"), description: t("Please use a different name"), variant: "destructive" });
      return;
    }

    if (editingClient) {
      updateClient({ id: editingClient.id, data: { ...values, type: "supplier" } }, {
        onSuccess: () => {
          setEditingClient(null);
          form.reset({ name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0" });
          toast({ title: t("Supplier updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update supplier"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createClient({ ...values, type: "supplier" }, {
        onSuccess: () => {
          form.reset({ name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0" });
          toast({ title: t("Supplier created successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to create supplier"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteClient(id, {
      onSuccess: () => {
        toast({ title: t("Supplier deleted successfully") });
        if (editingClient?.id === id) cancelEdit();
      },
      onError: (err) => {
        toast({ title: t("Failed to delete supplier"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const suppliers = allClients?.filter(c => c.type === "supplier") || [];
  const filtered = suppliers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOldDebtUsd = suppliers.reduce((sum, c) => sum + Number(c.oldDebtUsd || 0), 0);
  const totalOldDebtIqd = suppliers.reduce((sum, c) => sum + Number(c.oldDebtIqd || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const addresses = dbAddresses || [];
  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-6">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-4 w-4" />
          {t("Supplier Management")}
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Suppliers')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage your suppliers')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Suppliers')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
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

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {editingClient ? (
              <><Pencil className="h-5 w-5 text-primary" /> {t('Edit Supplier')}</>
            ) : (
              <><Plus className="h-5 w-5 text-primary" /> {t('Add New Supplier')}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Name')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-name" placeholder={t('Supplier Name')} className="h-11 text-base font-semibold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Contact')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-contact" placeholder="0770-000-0000" className="h-11 text-base font-semibold" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Address')}</FormLabel>
                    <AddressSearchSelect
                      addresses={addresses}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={t('Select address...')}
                      data-testid="select-supplier-address"
                      inputClassName="h-11 text-base font-semibold"
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="oldDebtUsd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Opening Balance (USD)')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-old-debt-usd" type="number" step="0.01" placeholder="0.00" className="h-11 text-base font-semibold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="oldDebtIqd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Opening Balance (IQD)')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-old-debt-iqd" type="number" step="1" placeholder="0" className="h-11 text-base font-semibold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={isSaving} size="lg" className="text-base font-bold h-11 flex-1" data-testid="button-save-supplier">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingClient ? t('Update') : t('Save')}
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-11" onClick={cancelEdit} data-testid="button-reset-form">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('Search suppliers...')} className="pl-9" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} data-testid="input-search-suppliers" />
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filtered.length} {t('Total Suppliers')}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><Truck className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No suppliers found')}</h3>
              <p>{t('Add a new supplier to get started.')}</p>
            </div>
          ) : (
            <>
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
                    {paginatedData.map((client) => (
                      <TableRow key={client.id} data-testid={`row-supplier-${client.id}`} className={editingClient?.id === client.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="font-mono text-xs">{client.id}</TableCell>
                        <TableCell className="font-bold">{client.name}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => startEdit(client)} data-testid={`button-edit-supplier-${client.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-supplier-${client.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Delete Supplier')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('Are you sure you want to delete this supplier?')} ({client.name})
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(client.id)} data-testid={`button-confirm-delete-supplier-${client.id}`}>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('Page')} {safePage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(safePage - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={page === safePage ? "default" : "outline"}
                        size="sm"
                        className="min-w-[36px]"
                        onClick={() => setCurrentPage(page)}
                        data-testid={`button-page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(safePage + 1)}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
