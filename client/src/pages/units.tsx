import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUnitSchema } from "@shared/routes";
import { units } from "@shared/schema";
type Unit = typeof units.$inferSelect;
import { z } from "zod";
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from "@/hooks/use-units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Trash2, Pencil, ArrowLeft, RotateCcw, Search, X, Ruler } from "lucide-react";
import { IconUnit } from "@/components/erp-icons";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const defaultVals = { name: "", nameEn: "", nameKu: "", nameTr: "" };

const UNIT_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
  "from-fuchsia-500 to-pink-600",
];
const getUnitColor = (idx: number) => UNIT_COLORS[idx % UNIT_COLORS.length];

export default function UnitsPage() {
  const { t } = useTranslation();
  const { data: unitsList, isLoading } = useUnits();
  const { mutate: createUnit, isPending: isCreating } = useCreateUnit();
  const { mutate: updateUnit, isPending: isUpdating } = useUpdateUnit();
  const { mutate: deleteUnit } = useDeleteUnit();
  const { toast } = useToast();

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertUnitSchema>>({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: defaultVals,
  });

  const startEdit = (unit: Unit) => { setEditingUnit(unit); form.reset({ name: unit.name, nameEn: unit.nameEn || "", nameKu: "", nameTr: "" }); setFormOpen(true); };
  const cancelEdit = () => { setEditingUnit(null); form.reset(defaultVals); setFormOpen(false); };
  const openAddForm = () => { setEditingUnit(null); form.reset(defaultVals); setFormOpen(true); };

  const onSubmit = (values: z.infer<typeof insertUnitSchema>) => {
    if (editingUnit) {
      updateUnit({ id: editingUnit.id, data: values }, {
        onSuccess: () => { cancelEdit(); toast({ title: t("Unit updated successfully") }); },
        onError: (err) => toast({ title: t("Failed to update unit"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createUnit(values, {
        onSuccess: () => { form.reset(defaultVals); setFormOpen(false); toast({ title: t("Unit added successfully") }); },
        onError: (err) => toast({ title: t("Failed to add unit"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteUnit(id, {
      onSuccess: () => { toast({ title: t("Unit deleted successfully") }); if (editingUnit?.id === id) cancelEdit(); },
      onError: (err) => toast({ title: t("Failed to delete unit"), description: t(err.message), variant: "destructive" }),
    });
  };

  const allUnits = unitsList || [];
  const filtered = allUnits.filter((u) => {
    const term = searchTerm.toLowerCase();
    return !term || u.name.toLowerCase().includes(term) || (u.nameEn || "").toLowerCase().includes(term);
  });
  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-6 p-1">
      {/* Back */}
      <Link href="/material-management" data-testid="link-back-material">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("Material Management")}
        </Button>
      </Link>

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Ruler className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">{t('Units')}</h1>
            </div>
            <p className="text-blue-200 text-sm">{t('Manage measurement units for products')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm">
              <div className="text-2xl font-bold">{allUnits.length}</div>
              <div className="text-xs text-blue-200">{t('Total Units')}</div>
            </div>
            <Button onClick={openAddForm} className="bg-white text-blue-700 hover:bg-blue-50 font-bold gap-2 shadow-lg" data-testid="button-open-add-unit">
              <Plus className="h-5 w-5" />
              {t('Add Unit')}
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="ps-10 pe-10 h-11 rounded-xl border-border/60 bg-background shadow-sm text-base"
          placeholder={t('Search units...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-units"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) cancelEdit(); else setFormOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                {editingUnit ? <Pencil className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
              </div>
              {editingUnit ? t('Edit Unit') : t('Add New Unit')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">{t('Unit Name')}</FormLabel>
                  <FormControl><Input className="h-11" placeholder={t('e.g. Piece, Box, Kg')} {...field} data-testid="input-unit-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nameEn" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">الاسم اللاتيني</FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. Piece, Box, Kg" {...field} data-testid="input-unit-name-en" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSaving} className="flex-1 h-11 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" data-testid="button-save-unit">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {editingUnit ? t('Update') : t('Save')}
                </Button>
                <Button type="button" variant="outline" className="h-11 px-4" onClick={() => form.reset(defaultVals)} data-testid="button-reset-form">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-4">
            <Ruler className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold mb-1">{searchTerm ? t('No units found') : t('No units yet')}</h3>
          <p className="text-muted-foreground text-sm mb-4">{searchTerm ? t('Try a different search term') : t('Add a new unit to get started.')}</p>
          {!searchTerm && (
            <Button onClick={openAddForm} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="h-4 w-4" /> {t('Add Unit')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((unit, idx) => {
            const colorClass = getUnitColor(idx);
            return (
              <div
                key={unit.id}
                className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                data-testid={`card-unit-${unit.id}`}
              >
                <div className={`h-1 w-full bg-gradient-to-r ${colorClass}`} />
                <div className="p-3 flex flex-col items-center text-center gap-2">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-sm mt-1`}>
                    <IconUnit className="h-6 w-6 text-white" />
                  </div>
                  {/* Names */}
                  <div className="w-full">
                    <div className="font-bold text-sm leading-tight truncate">{unit.name}</div>
                    {unit.nameEn && <div className="text-xs text-muted-foreground truncate mt-0.5">{unit.nameEn}</div>}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(unit)} data-testid={`button-edit-unit-${unit.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" data-testid={`button-delete-unit-${unit.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('Delete Unit')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('Are you sure you want to delete this unit?')} ({unit.name})</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(unit.id)} data-testid={`button-confirm-delete-unit-${unit.id}`}>{t('Delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
