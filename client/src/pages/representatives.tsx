import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRepresentativeSchema, type Representative } from "@shared/schema";
import { z } from "zod";
import { useRepresentatives, useCreateRepresentative, useUpdateRepresentative, useDeleteRepresentative } from "@/hooks/use-representatives";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Loader2, Trash2, Pencil, Phone, EyeOff } from "lucide-react";
import { IconAgent } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RepresentativesPage() {
  const { t } = useTranslation();
  const { data: reps, isLoading } = useRepresentatives();
  const { mutate: createRep, isPending: isCreating } = useCreateRepresentative();
  const { mutate: updateRep, isPending: isUpdating } = useUpdateRepresentative();
  const { mutate: deleteRep } = useDeleteRepresentative();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Representative | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertRepresentativeSchema>>({
    resolver: zodResolver(insertRepresentativeSchema),
    defaultValues: { name: "", mobile: "", agreementType: "commission", hidden: 0 },
  });

  const openCreateDialog = () => {
    setEditing(null);
    form.reset({ name: "", mobile: "", agreementType: "commission", hidden: 0 });
    setOpen(true);
  };

  const openEditDialog = (item: Representative) => {
    setEditing(item);
    form.reset({ name: item.name, mobile: item.mobile || "", agreementType: item.agreementType || "commission", hidden: item.hidden || 0 });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertRepresentativeSchema>) => {
    if (editing) {
      updateRep({ id: editing.id, data: values }, {
        onSuccess: () => {
          setOpen(false);
          setEditing(null);
          form.reset();
          toast({ title: t("Representative updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update representative"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createRep(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Representative added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add representative"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteRep(id, {
      onSuccess: () => {
        toast({ title: t("Representative deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete representative"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = reps?.filter((a: Representative) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Representatives')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage sales representatives')}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-representative" onClick={openCreateDialog}>
              <Plus className="w-5 h-5 mr-2" />
              {t('Add Representative')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editing ? t('Edit Representative') : t('Add New Representative')}</DialogTitle>
              <DialogDescription>{t('Enter representative details')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Representative Name')}</FormLabel>
                    <FormControl><Input data-testid="input-representative-name" placeholder={t('e.g. Ahmed Ali')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Mobile')}</FormLabel>
                    <FormControl><Input data-testid="input-representative-mobile" placeholder={t('Mobile number...')} {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="agreementType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Agreement Type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue="commission">
                      <FormControl>
                        <SelectTrigger data-testid="select-agreement-type">
                          <SelectValue placeholder={t('Select agreement type')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="commission">{t('Commission')}</SelectItem>
                        <SelectItem value="monthly_salary">{t('Monthly Salary')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="hidden" render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        data-testid="checkbox-representative-hidden"
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      />
                    </FormControl>
                    <FormLabel className="text-base font-bold cursor-pointer">{t('Hide')}</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditing(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-representative">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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
            <CardTitle className="text-sm font-medium">{t('Total Representatives')}</CardTitle>
            <IconAgent className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reps?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search representatives...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-representatives" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconAgent className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No representatives found')}</h3>
              <p>{t('Add a new representative to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Representative Name')}</TableHead>
                    <TableHead>{t('Mobile')}</TableHead>
                    <TableHead>{t('Agreement Type')}</TableHead>
                    <TableHead>{t('Hide')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: Representative) => (
                    <TableRow key={item.id} data-testid={`row-representative-${item.id}`}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <IconAgent className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.mobile ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {item.mobile}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.agreementType === 'monthly_salary' ? 'default' : 'secondary'}>
                          {item.agreementType === 'monthly_salary' ? t('Monthly Salary') : t('Commission')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.hidden === 1 ? (
                          <Badge variant="destructive" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            {t('Hidden')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-representative-${item.id}`}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-representative-${item.id}`}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Representative')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this representative?')} ({item.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} data-testid={`button-confirm-delete-representative-${item.id}`}>
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
