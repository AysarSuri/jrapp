import { useState, useRef, useEffect, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, insertCategoryGroupSchema } from "@shared/schema";
import { categories, categoryGroups } from "@shared/schema";
type Category = typeof categories.$inferSelect;
type CategoryGroup = typeof categoryGroups.$inferSelect;
import { z } from "zod";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useCategoryGroups, useCreateCategoryGroup, useUpdateCategoryGroup, useDeleteCategoryGroup } from "@/hooks/use-categories";
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
import { Plus, Loader2, Trash2, Pencil, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconCategory } from "@/components/erp-icons";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 10;
const defaultCatVals = { name: "", nameEn: "", nameKu: "", nameTr: "" };
const defaultGroupVals = { categoryId: 0, name: "", nameEn: "", nameKu: "", nameTr: "" };

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categoriesList, isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();
  const { data: groupsList } = useCategoryGroups();
  const { mutate: createGroup, isPending: isCreatingGroup } = useCreateCategoryGroup();
  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateCategoryGroup();
  const { mutate: deleteGroup } = useDeleteCategoryGroup();
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [groupFormCategoryId, setGroupFormCategoryId] = useState<number | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
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

  const catForm = useForm<z.infer<typeof insertCategorySchema>>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: defaultCatVals,
  });

  const groupForm = useForm<z.infer<typeof insertCategoryGroupSchema>>({
    resolver: zodResolver(insertCategoryGroupSchema),
    defaultValues: defaultGroupVals,
  });

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    catForm.reset({ name: cat.name, nameEn: cat.nameEn || "", nameKu: cat.nameKu || "", nameTr: cat.nameTr || "" });
    cancelGroupEdit();
  };

  const cancelCategoryEdit = () => {
    setEditingCategory(null);
    catForm.reset(defaultCatVals);
  };

  const startGroupAdd = (categoryId: number) => {
    setGroupFormCategoryId(categoryId);
    setEditingGroup(null);
    groupForm.reset({ categoryId, name: "", nameEn: "", nameKu: "", nameTr: "" });
    setExpandedCategoryId(categoryId);
    cancelCategoryEdit();
  };

  const startGroupEdit = (group: CategoryGroup) => {
    setEditingGroup(group);
    setGroupFormCategoryId(group.categoryId);
    groupForm.reset({ categoryId: group.categoryId, name: group.name, nameEn: group.nameEn || "", nameKu: group.nameKu || "", nameTr: group.nameTr || "" });
    setExpandedCategoryId(group.categoryId);
    cancelCategoryEdit();
  };

  const cancelGroupEdit = () => {
    setEditingGroup(null);
    setGroupFormCategoryId(null);
    groupForm.reset(defaultGroupVals);
  };

  const onCategorySubmit = (values: z.infer<typeof insertCategorySchema>) => {
    if (editingCategory) {
      updateCategory({ id: editingCategory.id, data: values }, {
        onSuccess: () => {
          cancelCategoryEdit();
          toast({ title: t("Category updated successfully") });
        },
        onError: (err) => toast({ title: t("Failed to update category"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createCategory(values, {
        onSuccess: () => {
          catForm.reset(defaultCatVals);
          toast({ title: t("Category added successfully") });
        },
        onError: (err) => toast({ title: t("Failed to add category"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const onGroupSubmit = (values: z.infer<typeof insertCategoryGroupSchema>) => {
    if (editingGroup) {
      updateGroup({ id: editingGroup.id, data: values }, {
        onSuccess: () => {
          cancelGroupEdit();
          toast({ title: t("Group updated successfully") });
        },
        onError: (err) => toast({ title: t("Failed to update group"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createGroup(values, {
        onSuccess: () => {
          groupForm.reset({ ...defaultGroupVals, categoryId: values.categoryId });
          toast({ title: t("Group added successfully") });
        },
        onError: (err) => toast({ title: t("Failed to add group"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategory(id, {
      onSuccess: () => {
        toast({ title: t("Category deleted successfully") });
        if (editingCategory?.id === id) cancelCategoryEdit();
        if (expandedCategoryId === id) setExpandedCategoryId(null);
      },
      onError: (err) => toast({ title: t("Failed to delete category"), description: t(err.message), variant: "destructive" }),
    });
  };

  const handleDeleteGroup = (id: number) => {
    deleteGroup(id, {
      onSuccess: () => {
        toast({ title: t("Group deleted successfully") });
        if (editingGroup?.id === id) cancelGroupEdit();
      },
      onError: (err) => toast({ title: t("Failed to delete group"), description: t(err.message), variant: "destructive" }),
    });
  };

  const allCategories = categoriesList || [];
  const allGroups: CategoryGroup[] = groupsList || [];
  const filtered = allCategories.filter((c) => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) ||
      (c.nameEn || "").toLowerCase().includes(term) ||
      (c.nameKu || "").toLowerCase().includes(term) ||
      (c.nameTr || "").toLowerCase().includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const isSaving = isCreating || isUpdating;
  const isSavingGroup = isCreatingGroup || isUpdatingGroup;

  const getGroupCount = (categoryId: number) => allGroups.filter(g => g.categoryId === categoryId).length;
  const getGroupsForCategory = (categoryId: number) => allGroups.filter(g => g.categoryId === categoryId);

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
          <h1 className="text-2xl font-bold tracking-tight">{t('Categories')}</h1>
          <p className="text-muted-foreground text-sm">{t('Manage product categories')}</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Categories')}</CardTitle>
            <IconCategory className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCategories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Groups')}</CardTitle>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allGroups.length}</div>
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
          <Form {...catForm}>
            <form onSubmit={catForm.handleSubmit(onCategorySubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={catForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Category Name')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder={t('e.g. Electronics, Food')} {...field} data-testid="input-category-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={catForm.control} name="nameEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Category Name (English)')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder="e.g. Electronics, Food" {...field} value={field.value ?? ""} data-testid="input-category-name-en" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={catForm.control} name="nameKu" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Category Name (Kurdish)')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder="ئەلیکترۆنیات، خواردن" {...field} value={field.value ?? ""} data-testid="input-category-name-ku" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={catForm.control} name="nameTr" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Category Name (Turkish)')}</FormLabel>
                    <FormControl><Input className="h-11 text-base font-semibold" placeholder="Elektronik, Gıda" {...field} value={field.value ?? ""} data-testid="input-category-name-tr" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={isSaving} size="lg" className="text-base font-bold h-11 flex-1" data-testid="button-save-category">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {editingCategory ? t('Update') : t('Save')}
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-11" onClick={cancelCategoryEdit} data-testid="button-reset-form">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {groupFormCategoryId && (
        <Card className="border-blue-200 dark:border-blue-900 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              {editingGroup ? t('Edit Group') : t('Add New Group')}
              <Badge variant="secondary">{allCategories.find(c => c.id === groupFormCategoryId)?.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...groupForm}>
              <form onSubmit={groupForm.handleSubmit(onGroupSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={groupForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Group Name')}</FormLabel>
                      <FormControl><Input className="h-11 text-base font-semibold" placeholder={t('Group name...')} {...field} data-testid="input-group-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={groupForm.control} name="nameEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Group Name (English)')}</FormLabel>
                      <FormControl><Input className="h-11 text-base font-semibold" placeholder="Group name..." {...field} value={field.value ?? ""} data-testid="input-group-name-en" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={groupForm.control} name="nameKu" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Group Name (Kurdish)')}</FormLabel>
                      <FormControl><Input className="h-11 text-base font-semibold" placeholder="ناوی گروپ..." {...field} value={field.value ?? ""} data-testid="input-group-name-ku" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={groupForm.control} name="nameTr" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Group Name (Turkish)')}</FormLabel>
                      <FormControl><Input className="h-11 text-base font-semibold" placeholder="Grup adı..." {...field} value={field.value ?? ""} data-testid="input-group-name-tr" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={isSavingGroup} size="lg" className="text-base font-bold h-11 flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-save-group">
                      {isSavingGroup ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      {editingGroup ? t('Update') : t('Save')}
                    </Button>
                    <Button type="button" variant="outline" size="lg" className="h-11" onClick={cancelGroupEdit} data-testid="button-reset-group-form">
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm" ref={searchRef}>
              <SearchInput
                placeholder={t('Search categories...')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSearchOpen(true); }}
                onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
                onClear={() => { setSearchTerm(""); setSearchOpen(false); }}
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
                      <IconCategory className="h-3.5 w-3.5 text-muted-foreground" />
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
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconCategory className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No categories found')}</h3>
              <p>{t('Add a new category to get started.')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold text-sm w-10"></TableHead>
                      <TableHead className="font-bold text-sm">#</TableHead>
                      <TableHead className="font-bold text-sm">{t('Category Name')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('English')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Kurdish')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Turkish')}</TableHead>
                      <TableHead className="font-bold text-sm text-center">{t('Groups')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((cat) => {
                      const catGroups = getGroupsForCategory(cat.id);
                      const isExpanded = expandedCategoryId === cat.id;
                      return (
                        <Fragment key={cat.id}>
                          <TableRow data-testid={`row-category-${cat.id}`} className={editingCategory?.id === cat.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                            <TableCell className="p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                                data-testid={`button-expand-category-${cat.id}`}
                              >
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-bold font-mono text-sm">{cat.id}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1 font-bold">
                                <IconCategory className="h-3 w-3" />
                                {cat.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-sm">{cat.nameEn || "-"}</TableCell>
                            <TableCell className="font-bold text-sm">{cat.nameKu || "-"}</TableCell>
                            <TableCell className="font-bold text-sm">{cat.nameTr || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-bold" data-testid={`badge-group-count-${cat.id}`}>
                                <Layers className="h-3 w-3 mr-1" />
                                {getGroupCount(cat.id)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => startGroupAdd(cat.id)} data-testid={`button-add-group-${cat.id}`}>
                                  <Plus className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => startEditCategory(cat)} data-testid={`button-edit-category-${cat.id}`}>
                                  <Pencil className="h-5 w-5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-category-${cat.id}`}>
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('Delete Category')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('Are you sure you want to delete this category?')} ({cat.name})
                                        {catGroups.length > 0 && (
                                          <span className="block mt-1 text-red-600 font-semibold">
                                            {t('This will also delete')} {catGroups.length} {t('Groups')}
                                          </span>
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)} data-testid={`button-confirm-delete-category-${cat.id}`}>
                                        {t('Delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <>
                              {catGroups.length > 0 ? catGroups.map((group) => (
                                <TableRow key={`group-${group.id}`} className="bg-blue-50/50 dark:bg-blue-950/20" data-testid={`row-group-${group.id}`}>
                                  <TableCell></TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground ps-6">↳</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="gap-1 font-bold border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400">
                                      <Layers className="h-3 w-3" />
                                      {group.name}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-bold text-sm">{group.nameEn || "-"}</TableCell>
                                  <TableCell className="font-bold text-sm">{group.nameKu || "-"}</TableCell>
                                  <TableCell className="font-bold text-sm">{group.nameTr || "-"}</TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startGroupEdit(group)} data-testid={`button-edit-group-${group.id}`}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" data-testid={`button-delete-group-${group.id}`}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>{t('Delete Group')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              {t('Are you sure you want to delete this group?')} ({group.name})
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} data-testid={`button-confirm-delete-group-${group.id}`}>
                                              {t('Delete')}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )) : (
                                <TableRow className="bg-blue-50/30 dark:bg-blue-950/10">
                                  <TableCell></TableCell>
                                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-3">
                                    {t('No groups in this category')}
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )}
                        </Fragment>
                      );
                    })}
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
