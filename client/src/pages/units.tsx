import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUnitSchema, type Unit } from "@shared/routes";
import { z } from "zod";
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from "@/hooks/use-units";
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
import { Plus, Search, Ruler, Loader2, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function UnitsPage() {
  const { t } = useTranslation();
  const { data: unitsList, isLoading } = useUnits();
  const { mutate: createUnit, isPending: isCreating } = useCreateUnit();
  const { mutate: updateUnit, isPending: isUpdating } = useUpdateUnit();
  const { mutate: deleteUnit } = useDeleteUnit();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertUnitSchema>>({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: { name: "" },
  });

  const openCreateDialog = () => {
    setEditingUnit(null);
    form.reset({ name: "" });
    setOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    form.reset({ name: unit.name });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertUnitSchema>) => {
    if (editingUnit) {
      updateUnit({ id: editingUnit.id, data: values }, {
        onSuccess: () => {
          setOpen(false);
          setEditingUnit(null);
          form.reset();
          toast({ title: t("Unit updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update unit"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createUnit(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Unit added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add unit"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteUnit(id, {
      onSuccess: () => {
        toast({ title: t("Unit deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete unit"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = unitsList?.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Units')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage measurement units for products')}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingUnit(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-unit" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Unit')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{editingUnit ? t('Edit Unit') : t('Add New Unit')}</DialogTitle>
              <DialogDescription>{t('Enter the unit name (e.g. Piece, Box, Carton)')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Unit Name')}</FormLabel>
                    <FormControl><Input data-testid="input-unit-name" placeholder={t('e.g. Piece, Box, Kg')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditingUnit(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-unit">
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
            <CardTitle className="text-sm font-medium">{t('Total Units')}</CardTitle>
            <Ruler className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitsList?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search units...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-units" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><Ruler className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No units found')}</h3>
              <p>{t('Add a new unit to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Unit Name')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((unit) => (
                    <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
                      <TableCell className="font-mono text-xs">{unit.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Ruler className="h-3 w-3" />
                          {unit.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(unit)} data-testid={`button-edit-unit-${unit.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-unit-${unit.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Unit')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this unit?')} ({unit.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(unit.id)} data-testid={`button-confirm-delete-unit-${unit.id}`}>
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
