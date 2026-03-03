import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type Category } from "@shared/routes";
import { z } from "zod";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
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
import { Plus, Search, FolderOpen, Loader2, Trash2, Pencil, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 10;
const defaultVals = { name: "" };

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categoriesList, isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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

  const form = useForm<z.infer<typeof insertCategorySchema>>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: defaultVals,
  });

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    form.reset({ name: cat.name });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    form.reset(defaultVals);
  };

  const onSubmit = (values: z.infer<typeof insertCategorySchema>) => {
    if (editingCategory) {
      updateCategory({ id: editingCategory.id, data: values }, {
        onSuccess: () => {
          cancelEdit();
          toast({ title: t("Category updated successfully") });
        },
        onError: (err) => toast({ title: t("Failed to update category"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createCategory(values, {
        onSuccess: () => {
          form.reset(defaultVals);
          toast({ title: t("Category added successfully") });
        },
        onError: (err) => toast({ title: t("Failed to add category"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteCategory(id, {
      onSuccess: () => {
        toast({ title: t("Category deleted successfully") });
        if (editingCategory?.id === id) cancelEdit();
      },
      onError: (err) => toast({ title: t("Failed to delete category"), description: t(err.message), variant: "destructive" }),
    });
  };

  const allCategories = categoriesList || [];
  const filtered = allCategories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-6">
      <Link href="/material-management" data-testid="link-back-material">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("Material Management")}
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Categories')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage product categories')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Categories')}</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCategories.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {editingCategory ? (
              <><Pencil className="h-5 w-5 text-primary" /> {t('Edit Category')}</>
            ) : (
              <><Plus className="h-5 w-5 text-primary" /> {t('Add New Category')}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Category Name')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder={t('e.g. Electronics, Food')} {...field} data-testid="input-category-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={isSaving} size="lg" className="text-base font-bold h-11 flex-1" data-testid="button-save-category">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingCategory ? t('Update') : t('Save')}
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
            <div className="relative flex-1 min-w-[200px] max-w-sm" ref={searchRef}>
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search categories...')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSearchOpen(true); }}
                onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
                data-testid="input-search-categories"
              />
              {searchOpen && searchTerm.trim() && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filtered.slice(0, 10).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/70 flex items-center gap-2 font-bold text-sm transition-colors"
                      data-testid={`search-result-category-${cat.id}`}
                      onClick={() => {
                        setSearchTerm(cat.name);
                        setSearchOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filtered.length} {t('Total Categories')}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><FolderOpen className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No categories found')}</h3>
              <p>{t('Add a new category to get started.')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold text-sm">#</TableHead>
                      <TableHead className="font-bold text-sm">{t('Category Name')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((cat) => (
                      <TableRow key={cat.id} data-testid={`row-category-${cat.id}`} className={editingCategory?.id === cat.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="font-bold font-mono text-sm">{cat.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 font-bold">
                            <FolderOpen className="h-3 w-3" />
                            {cat.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-category-${cat.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Delete Category')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('Are you sure you want to delete this category?')} ({cat.name})
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(cat.id)} data-testid={`button-confirm-delete-category-${cat.id}`}>
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
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} data-testid="button-next-page">
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
