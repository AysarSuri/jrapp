import { useState, useRef, useEffect } from "react";
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
import { Plus, Loader2, Trash2, Pencil, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconUnit } from "@/components/erp-icons";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 10;
const defaultVals = { name: "", nameEn: "", nameKu: "", nameTr: "" };

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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const form = useForm<z.infer<typeof insertUnitSchema>>({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: defaultVals,
  });

  const startEdit = (unit: Unit) => {
    setEditingUnit(unit);
    form.reset({ name: unit.name, nameEn: unit.nameEn || "", nameKu: unit.nameKu || "", nameTr: unit.nameTr || "" });
    setFormOpen(true);
  };

  const cancelEdit = () => {
    setEditingUnit(null);
    form.reset(defaultVals);
    setFormOpen(false);
  };

  const openAddForm = () => {
    setEditingUnit(null);
    form.reset(defaultVals);
    setFormOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertUnitSchema>) => {
    if (editingUnit) {
      updateUnit({ id: editingUnit.id, data: values }, {
        onSuccess: () => {
          cancelEdit();
          toast({ title: t("Unit updated successfully") });
        },
        onError: (err) => toast({ title: t("Failed to update unit"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createUnit(values, {
        onSuccess: () => {
          form.reset(defaultVals);
          setFormOpen(false);
          toast({ title: t("Unit added successfully") });
        },
        onError: (err) => toast({ title: t("Failed to add unit"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteUnit(id, {
      onSuccess: () => {
        toast({ title: t("Unit deleted successfully") });
        if (editingUnit?.id === id) cancelEdit();
      },
      onError: (err) => toast({ title: t("Failed to delete unit"), description: t(err.message), variant: "destructive" }),
    });
  };

  const allUnits = unitsList || [];
  const filtered = allUnits.filter((u) => {
    const term = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(term) ||
      (u.nameEn || "").toLowerCase().includes(term) ||
      (u.nameKu || "").toLowerCase().includes(term) ||
      (u.nameTr || "").toLowerCase().includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-3">
      <Link href="/material-management" data-testid="link-back-material">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          {t("Material Management")}
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Units')}</h1>
          <p className="text-muted-foreground text-sm">{t('Manage measurement units for products')}</p>
        </div>
        <Button size="lg" className="gap-2 text-base font-bold" onClick={openAddForm} data-testid="button-open-add-unit">
          <Plus className="h-5 w-5" />
          {t('Add New Unit')}
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Units')}</CardTitle>
            <IconUnit className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUnits.length}</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) cancelEdit(); else setFormOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {editingUnit ? (
                <><Pencil className="h-5 w-5 text-primary" /> {t('Edit Unit')}</>
              ) : (
                <><Plus className="h-5 w-5 text-primary" /> {t('Add New Unit')}</>
              )}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Unit Name')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder={t('e.g. Piece, Box, Kg')} {...field} data-testid="input-unit-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nameEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Unit Name (English)')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder="e.g. Piece, Box, Kg" {...field} data-testid="input-unit-name-en" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nameKu" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Unit Name (Kurdish)')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder="دانە، سندوق، کیلۆ" {...field} data-testid="input-unit-name-ku" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nameTr" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Unit Name (Turkish)')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder="Adet, Kutu, Kg" {...field} data-testid="input-unit-name-tr" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={isSaving} size="lg" className="text-base font-bold h-11 flex-1" data-testid="button-save-unit">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {editingUnit ? t('Update') : t('Save')}
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => { setEditingUnit(null); form.reset(defaultVals); }} data-testid="button-reset-form">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm" ref={searchRef}>
              <SearchInput
                placeholder={t('Search units...')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSearchOpen(true); }}
                onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
                onClear={() => { setSearchTerm(""); setSearchOpen(false); }}
                data-testid="input-search-units"
              />
              {searchOpen && searchTerm.trim() && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filtered.slice(0, 10).map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/70 flex items-center justify-between gap-2 font-bold text-sm transition-colors"
                      data-testid={`search-result-unit-${unit.id}`}
                      onClick={() => {
                        setSearchTerm(unit.name);
                        setSearchOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{unit.name}</span>
                      {unit.nameEn && <Badge variant="outline" className="text-xs font-semibold shrink-0">{unit.nameEn}</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filtered.length} {t('Total Units')}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconUnit className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No units found')}</h3>
              <p>{t('Add a new unit to get started.')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold text-sm">#</TableHead>
                      <TableHead className="font-bold text-sm">{t('Unit Name')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('English')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Kurdish')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Turkish')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((unit) => (
                      <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`} className={editingUnit?.id === unit.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="font-bold font-mono text-sm">{unit.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 font-bold">
                            <IconUnit className="h-3 w-3" />
                            {unit.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-sm">{unit.nameEn || "-"}</TableCell>
                        <TableCell className="font-bold text-sm">{unit.nameKu || "-"}</TableCell>
                        <TableCell className="font-bold text-sm">{unit.nameTr || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(unit)} data-testid={`button-edit-unit-${unit.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-unit-${unit.id}`}>
                                  <Trash2 className="h-5 w-5" />
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('Page')} {safePage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} data-testid="button-prev-page">
                      <ChevronLeft className="h-5 w-5" />
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
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} data-testid="button-next-page">
                      <ChevronRight className="h-5 w-5" />
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
