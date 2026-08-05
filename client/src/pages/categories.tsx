import { useState, Fragment } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Trash2, Pencil, ArrowLeft, RotateCcw, Layers, ChevronDown, ChevronUp, Search, X, Tag, FolderOpen, FolderPlus } from "lucide-react";
import { IconCategory } from "@/components/erp-icons";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const defaultCatVals = { name: "", nameEn: "", nameKu: "", nameTr: "" };
const defaultGroupVals = { categoryId: 0, name: "", nameEn: "", nameKu: "", nameTr: "" };

const CAT_COLORS = [
  { bg: "from-violet-500 to-purple-600", light: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  { bg: "from-blue-500 to-indigo-600", light: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  { bg: "from-orange-500 to-amber-600", light: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  { bg: "from-rose-500 to-pink-600", light: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
  { bg: "from-cyan-500 to-sky-600", light: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800" },
];
const getColor = (idx: number) => CAT_COLORS[idx % CAT_COLORS.length];

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
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [groupFormCategoryId, setGroupFormCategoryId] = useState<number | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    catForm.reset({ name: cat.name, nameEn: cat.nameEn || "", nameKu: "", nameTr: "" });
    cancelGroupEdit();
    setCatFormOpen(true);
  };
  const cancelCategoryEdit = () => { setEditingCategory(null); catForm.reset(defaultCatVals); setCatFormOpen(false); };
  const openAddCategory = () => { setEditingCategory(null); catForm.reset(defaultCatVals); cancelGroupEdit(); setCatFormOpen(true); };
  const startGroupAdd = (categoryId: number) => { setGroupFormCategoryId(categoryId); setEditingGroup(null); groupForm.reset({ categoryId, name: "", nameEn: "", nameKu: "", nameTr: "" }); setExpandedCategoryId(categoryId); cancelCategoryEdit(); };
  const startGroupEdit = (group: CategoryGroup) => { setEditingGroup(group); setGroupFormCategoryId(group.categoryId); groupForm.reset({ categoryId: group.categoryId, name: group.name, nameEn: group.nameEn || "", nameKu: "", nameTr: "" }); setExpandedCategoryId(group.categoryId); cancelCategoryEdit(); };
  const cancelGroupEdit = () => { setEditingGroup(null); setGroupFormCategoryId(null); groupForm.reset(defaultGroupVals); };

  const onCategorySubmit = (values: z.infer<typeof insertCategorySchema>) => {
    if (editingCategory) {
      updateCategory({ id: editingCategory.id, data: values }, {
        onSuccess: () => { cancelCategoryEdit(); toast({ title: t("Category updated successfully") }); },
        onError: (err) => toast({ title: t("Failed to update category"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createCategory(values, {
        onSuccess: () => { catForm.reset(defaultCatVals); setCatFormOpen(false); toast({ title: t("Category added successfully") }); },
        onError: (err) => toast({ title: t("Failed to add category"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const onGroupSubmit = (values: z.infer<typeof insertCategoryGroupSchema>) => {
    if (editingGroup) {
      updateGroup({ id: editingGroup.id, data: values }, {
        onSuccess: () => { cancelGroupEdit(); toast({ title: t("Group updated successfully") }); },
        onError: (err) => toast({ title: t("Failed to update group"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createGroup(values, {
        onSuccess: () => { cancelGroupEdit(); toast({ title: t("Group added successfully") }); },
        onError: (err) => toast({ title: t("Failed to add group"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategory(id, {
      onSuccess: () => { toast({ title: t("Category deleted successfully") }); if (editingCategory?.id === id) cancelCategoryEdit(); if (expandedCategoryId === id) setExpandedCategoryId(null); },
      onError: (err) => toast({ title: t("Failed to delete category"), description: t(err.message), variant: "destructive" }),
    });
  };
  const handleDeleteGroup = (id: number) => {
    deleteGroup(id, {
      onSuccess: () => { toast({ title: t("Group deleted successfully") }); if (editingGroup?.id === id) cancelGroupEdit(); },
      onError: (err) => toast({ title: t("Failed to delete group"), description: t(err.message), variant: "destructive" }),
    });
  };

  const allCategories = categoriesList || [];
  const allGroups: CategoryGroup[] = groupsList || [];
  const filtered = allCategories.filter((c) => {
    const term = searchTerm.toLowerCase();
    return !term || c.name.toLowerCase().includes(term) || (c.nameEn || "").toLowerCase().includes(term);
  });
  const getGroupsForCategory = (id: number) => allGroups.filter(g => g.categoryId === id);

  const isSaving = isCreating || isUpdating;
  const isSavingGroup = isCreatingGroup || isUpdatingGroup;

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <IconCategory className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">{t('Categories')}</h1>
            </div>
            <p className="text-violet-200 text-sm">{t('Manage product categories')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm">
              <div className="text-2xl font-bold">{allCategories.length}</div>
              <div className="text-xs text-violet-200">{t('Categories')}</div>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm">
              <div className="text-2xl font-bold">{allGroups.length}</div>
              <div className="text-xs text-violet-200">{t('Groups')}</div>
            </div>
            <Button onClick={openAddCategory} className="bg-white text-violet-700 hover:bg-violet-50 font-bold gap-2 shadow-lg" data-testid="button-open-add-category">
              <Plus className="h-5 w-5" />
              {t('Add Category')}
            </Button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="ps-10 pe-10 h-11 rounded-xl border-border/60 bg-background shadow-sm text-base"
          placeholder={t('Search categories...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-categories"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={catFormOpen} onOpenChange={(open) => { if (!open) cancelCategoryEdit(); else setCatFormOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                {editingCategory ? <Pencil className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
              </div>
              {editingCategory ? t('Edit Category') : t('Add New Category')}
            </DialogTitle>
          </DialogHeader>
          <Form {...catForm}>
            <form onSubmit={catForm.handleSubmit(onCategorySubmit)} className="space-y-4 pt-2">
              <FormField control={catForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">{t('Category Name')}</FormLabel>
                  <FormControl><Input className="h-11" placeholder={t('e.g. Electronics, Food')} {...field} data-testid="input-category-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={catForm.control} name="nameEn" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">الاسم اللاتيني</FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. Electronics, Food" {...field} value={field.value ?? ""} data-testid="input-category-name-en" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSaving} className="flex-1 h-11 font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700" data-testid="button-save-category">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {editingCategory ? t('Update') : t('Save')}
                </Button>
                <Button type="button" variant="outline" className="h-11 px-4" onClick={() => catForm.reset(defaultCatVals)} data-testid="button-reset-form">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupFormCategoryId !== null} onOpenChange={(open) => { if (!open) cancelGroupEdit(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Layers className="h-4 w-4 text-white" />
              </div>
              {editingGroup ? t('Edit Group') : t('Add New Group')}
              {groupFormCategoryId && (
                <span className="text-sm font-normal text-muted-foreground ms-1">
                  — {allCategories.find(c => c.id === groupFormCategoryId)?.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4 pt-2">
              <FormField control={groupForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">{t('Group Name')}</FormLabel>
                  <FormControl><Input className="h-11" placeholder={t('Group name...')} {...field} data-testid="input-group-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={groupForm.control} name="nameEn" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">الاسم اللاتيني</FormLabel>
                  <FormControl><Input className="h-11" placeholder="e.g. Group name..." {...field} value={field.value ?? ""} data-testid="input-group-name-en" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSavingGroup} className="flex-1 h-11 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" data-testid="button-save-group">
                  {isSavingGroup ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {editingGroup ? t('Update') : t('Save')}
                </Button>
                <Button type="button" variant="outline" className="h-11 px-4" onClick={() => groupForm.reset({ ...defaultGroupVals, categoryId: groupFormCategoryId ?? 0 })} data-testid="button-reset-group-form">
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
          <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center mb-4">
            <FolderOpen className="w-10 h-10 text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {searchTerm ? t('No categories found') : t('No categories yet')}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {searchTerm ? t('Try a different search term') : t('Add a new category to get started.')}
          </p>
          {!searchTerm && (
            <Button onClick={openAddCategory} className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600">
              <Plus className="h-4 w-4" /> {t('Add Category')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((cat, idx) => {
            const color = getColor(idx);
            const groups = getGroupsForCategory(cat.id);
            const isExpanded = expandedCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                data-testid={`card-category-${cat.id}`}
              >
                {/* Top color bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${color.bg}`} />

                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Tag className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-base truncate">{cat.name}</div>
                        {cat.nameEn && <div className="text-xs text-muted-foreground truncate">{cat.nameEn}</div>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className={`h-8 w-8 ${color.text} hover:${color.light}`}
                        onClick={() => startGroupAdd(cat.id)}
                        title={t('Add Group')}
                        data-testid={`button-add-group-${cat.id}`}
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => startEditCategory(cat)} data-testid={`button-edit-category-${cat.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-category-${cat.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('Delete Category')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('Are you sure you want to delete this category?')} ({cat.name})
                              {groups.length > 0 && (
                                <span className="block mt-1 text-red-600 font-semibold">
                                  {t('This will also delete')} {groups.length} {t('Groups')}
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)} data-testid={`button-confirm-delete-category-${cat.id}`}>{t('Delete')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Groups count + expand toggle */}
                  <button
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${color.light} ${color.text}`}
                    onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                    data-testid={`button-expand-category-${cat.id}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {groups.length} {t('Groups')}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Expanded groups */}
                  {isExpanded && (
                    <div className="mt-3 space-y-1.5">
                      {groups.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">{t('No groups in this category')}</p>
                      ) : groups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-muted/40 group/g" data-testid={`row-group-${group.id}`}>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold truncate block">{group.name}</span>
                            {group.nameEn && <span className="text-xs text-muted-foreground">{group.nameEn}</span>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/g:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startGroupEdit(group)} data-testid={`button-edit-group-${group.id}`}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" data-testid={`button-delete-group-${group.id}`}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Delete Group')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('Are you sure you want to delete this group?')} ({group.name})</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} data-testid={`button-confirm-delete-group-${group.id}`}>{t('Delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
