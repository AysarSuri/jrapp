import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOwnerSchema, type Owner } from "@shared/routes";
import { z } from "zod";
import { useOwners, useCreateOwner, useUpdateOwner, useDeleteOwner } from "@/hooks/use-owners";
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
import { Plus, Search, UserCog, Loader2, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtUsd } from "@/lib/format-utils";

export default function OwnersPage() {
  const { t } = useTranslation();
  const { data: ownersList, isLoading } = useOwners();
  const { mutate: createOwner, isPending: isCreating } = useCreateOwner();
  const { mutate: updateOwner, isPending: isUpdating } = useUpdateOwner();
  const { mutate: deleteOwner } = useDeleteOwner();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertOwnerSchema>>({
    resolver: zodResolver(insertOwnerSchema),
    defaultValues: { name: "", oldDebtUsd: "0", oldDebtIqd: "0" },
  });

  const openCreateDialog = () => {
    setEditing(null);
    form.reset({ name: "", oldDebtUsd: "0", oldDebtIqd: "0" });
    setOpen(true);
  };

  const openEditDialog = (item: Owner) => {
    setEditing(item);
    form.reset({ name: item.name, oldDebtUsd: item.oldDebtUsd || "0", oldDebtIqd: item.oldDebtIqd || "0" });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertOwnerSchema>) => {
    if (editing) {
      updateOwner({ id: editing.id, data: values }, {
        onSuccess: () => {
          setOpen(false);
          setEditing(null);
          form.reset();
          toast({ title: t("Owner updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update owner"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createOwner(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Owner added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add owner"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteOwner(id, {
      onSuccess: () => {
        toast({ title: t("Owner deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete owner"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = ownersList?.filter((a: Owner) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Owner Names')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage owner names and balances')}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-owner" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Owner')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editing ? t('Edit Owner') : t('Add New Owner')}</DialogTitle>
              <DialogDescription>{t('Enter the owner name and balances')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Owner Name')}</FormLabel>
                    <FormControl><Input data-testid="input-owner-name" placeholder={t('e.g. Ahmed')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="oldDebtUsd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Old Debt USD')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-owner-old-debt-usd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="oldDebtIqd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Old Debt IQD')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="250" min="0" placeholder="0" data-testid="input-owner-old-debt-iqd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditing(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-owner">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
            <CardTitle className="text-sm font-medium">{t('Total Owners')}</CardTitle>
            <UserCog className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ownersList?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search owners...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-owners" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><UserCog className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No owners found')}</h3>
              <p>{t('Add a new owner to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Owner Name')}</TableHead>
                    <TableHead>{t('Old Debt USD')}</TableHead>
                    <TableHead>{t('Old Debt IQD')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: Owner) => (
                    <TableRow key={item.id} data-testid={`row-owner-${item.id}`}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <UserCog className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(item.oldDebtUsd) > 0 ? `$${fmtUsd(item.oldDebtUsd)}` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(item.oldDebtIqd) > 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-owner-${item.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-owner-${item.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Owner')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this owner?')} ({item.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} data-testid={`button-confirm-delete-owner-${item.id}`}>
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
