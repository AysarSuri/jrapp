import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAddressSchema } from "@shared/routes";
import { z } from "zod";
import { useAddresses, useCreateAddress, useDeleteAddress } from "@/hooks/use-addresses";
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
import { Plus, Search, MapPin, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AddressesPage() {
  const { t } = useTranslation();
  const { data: addresses, isLoading } = useAddresses();
  const { mutate: createAddress, isPending } = useCreateAddress();
  const { mutate: deleteAddress, isPending: isDeleting } = useDeleteAddress();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertAddressSchema>>({
    resolver: zodResolver(insertAddressSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: z.infer<typeof insertAddressSchema>) => {
    createAddress(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: t("Address added successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to add address"), description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteAddress(id, {
      onSuccess: () => {
        toast({ title: t("Address deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete address"), description: err.message, variant: "destructive" });
      },
    });
  };

  const filtered = addresses?.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Addresses')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage addresses for customers and suppliers')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-address">
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Address')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{t('Add New Address')}</DialogTitle>
              <DialogDescription>{t('Enter the address name (city, neighborhood, etc.)')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Address Name')}</FormLabel>
                    <FormControl><Input data-testid="input-address-name" placeholder={t('e.g. Baghdad, Karrada')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isPending} data-testid="button-save-address">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Addresses')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addresses?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search addresses...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-addresses" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><MapPin className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No addresses found')}</h3>
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
                  {filtered.map((addr) => (
                    <TableRow key={addr.id} data-testid={`row-address-${addr.id}`}>
                      <TableCell className="font-mono text-xs">{addr.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {addr.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-address-${addr.id}`}>
                              <Trash2 className="h-4 w-4" />
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
                              <AlertDialogAction onClick={() => handleDelete(addr.id)} data-testid={`button-confirm-delete-${addr.id}`}>
                                {t('Delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
