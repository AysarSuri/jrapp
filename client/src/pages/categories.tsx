import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type Category } from "@shared/routes";
import { z } from "zod";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
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
import { Plus, Search, FolderOpen, Loader2, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categoriesList, isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertCategorySchema>>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: { name: "" },
  });

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({ name: "" });
    setOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    form.reset({ name: cat.name });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertCategorySchema>) => {
    if (editingCategory) {
      updateCategory({ id: editingCategory.id, data: values }, {
        onSuccess: () => {
          setOpen(false);
          setEditingCategory(null);
          form.reset();
          toast({ title: t("Category updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update category"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createCategory(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Category added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add category"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteCategory(id, {
      onSuccess: () => {
        toast({ title: t("Category deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete category"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = categoriesList?.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/material-management" data-testid="link-back-material">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('Categories')}</h1>
            <p className="text-muted-foreground mt-1">{t('Manage product categories')}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingCategory(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Category')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? t('Edit Category') : t('Add New Category')}</DialogTitle>
              <DialogDescription>{t('Enter the category name')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Category Name')}</FormLabel>
                    <FormControl><Input data-testid="input-category-name" placeholder={t('e.g. Electronics, Food')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditingCategory(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-category">
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
            <CardTitle className="text-sm font-medium">{t('Total Categories')}</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriesList?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search categories...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-categories" />
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Category Name')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cat) => (
                    <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                      <TableCell className="font-mono text-xs">{cat.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {cat.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)} data-testid={`button-edit-category-${cat.id}`}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
