import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierAddressSchema } from "@shared/schema";
import { z } from "zod";
import { useSupplierAddresses, useCreateSupplierAddress, useUpdateSupplierAddress, useDeleteSupplierAddress } from "@/hooks/use-supplier-addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconAddress } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SupplierAddress = { id: number; name: string };

export default function SupplierAddressesPage() {
  const { t } = useTranslation();
  const { data: addresses, isLoading } = useSupplierAddresses();
  const { mutate: createAddress, isPending: isCreating } = useCreateSupplierAddress();
  const { mutate: updateAddress, isPending: isUpdating } = useUpdateSupplierAddress();
  const { mutate: deleteAddress } = useDeleteSupplierAddress();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SupplierAddress | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertSupplierAddressSchema>>({
    resolver: zodResolver(insertSupplierAddressSchema),
    defaultValues: { name: "" },
  });

  const openCreateDialog = () => {
    setEditingAddress(null);
    form.reset({ name: "" });
    setOpen(true);
  };

  const openEditDialog = (addr: SupplierAddress) => {
    setEditingAddress(addr);
    form.reset({ name: addr.name });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertSupplierAddressSchema>) => {
    if (editingAddress) {
      updateAddress({ id: editingAddress.id, data: values }, {
        onSuccess: () => {
          setOpen(false);
          setEditingAddress(null);
          form.reset();
          toast({ title: t("Supplier address updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update supplier address"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createAddress(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Supplier address added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add supplier address"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteAddress(id, {
      onSuccess: () => {
        toast({ title: t("Supplier address deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete supplier address"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = addresses?.filter((a: SupplierAddress) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Supplier Addresses')}</h1>
          <p className="text-muted-foreground text-sm">{t('Manage addresses for suppliers')}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingAddress(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-supplier-address" onClick={openCreateDialog}>
              <Plus className="w-5 h-5 mr-2" />
              {t('Add Address')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{editingAddress ? t('Edit Address') : t('Add New Address')}</DialogTitle>
              <DialogDescription>{t('Enter the address name (city, neighborhood, etc.)')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Address Name')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-address-name" placeholder={t('e.g. Baghdad, Karrada')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditingAddress(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-supplier-address">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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
            <CardTitle className="text-sm font-medium">{t('Total Addresses')}</CardTitle>
            <IconAddress className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addresses?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <SearchInput placeholder={t('Search supplier addresses...')} containerClassName="max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm("")} data-testid="input-search-supplier-addresses" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconAddress className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No supplier addresses found')}</h3>
              <p>{t('Add a new address to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Address Name')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((addr: SupplierAddress) => (
                    <TableRow key={addr.id} data-testid={`row-supplier-address-${addr.id}`}>
                      <TableCell className="font-mono text-xs">{addr.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <IconAddress className="h-3 w-3" />
                          {addr.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(addr)} data-testid={`button-edit-supplier-address-${addr.id}`}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-supplier-address-${addr.id}`}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Address')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this address?')} ({addr.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(addr.id)} data-testid={`button-confirm-delete-supplier-address-${addr.id}`}>
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
