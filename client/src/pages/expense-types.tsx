import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useExpenseTypes, useCreateExpenseType, useUpdateExpenseType, useDeleteExpenseType } from "@/hooks/use-expense-types";
import { expenseTypes } from "@shared/schema";

type ExpenseType = typeof expenseTypes.$inferSelect;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, Trash2, Pencil, Save, RotateCcw } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconExpenseType } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { playDeleteSound } from "@/lib/sounds";

export default function ExpenseTypesPage() {
  const { t } = useTranslation();
  const { data: typesList, isLoading } = useExpenseTypes();
  const { mutate: createType, isPending: isCreating } = useCreateExpenseType();
  const { mutate: updateType, isPending: isUpdating } = useUpdateExpenseType();
  const { mutate: deleteType } = useDeleteExpenseType();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteItem, setDeleteItem] = useState<ExpenseType | null>(null);

  const isSaving = isCreating || isUpdating;

  const resetForm = () => {
    setName("");
    setEditingId(null);
  };

  const startEdit = (item: ExpenseType) => {
    setEditingId(item.id);
    setName(item.name);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: t("Please enter the expense type name"), variant: "destructive" });
      return;
    }

    if (editingId) {
      updateType({ id: editingId, data: { name: name.trim() } }, {
        onSuccess: () => {
          toast({ title: t("Expense type updated successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to update expense type"), description: err.message, variant: "destructive" });
        },
      });
    } else {
      createType({ name: name.trim() }, {
        onSuccess: () => {
          toast({ title: t("Expense type added successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to add expense type"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteType(deleteItem.id, {
      onSuccess: () => {
        playDeleteSound();
        toast({ title: t("Expense type deleted successfully") });
        setDeleteItem(null);
      },
      onError: (err) => {
        toast({ title: t("Failed to delete expense type"), description: err.message, variant: "destructive" });
      },
    });
  };

  const filtered = typesList?.filter((a: ExpenseType) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <IconExpenseType className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            {t('Expense Types')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Manage expense categories and types')}</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{editingId ? t('Edit Expense Type') : t('Add New Expense Type')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 space-y-1.5 w-full">
              <span className="text-xs font-semibold text-muted-foreground">{t('Expense Type Name')}</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('e.g. Office Supplies')}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                data-testid="input-expense-type-name"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="gap-2" data-testid="button-save-expense-type">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingId ? t('Update') : t('Add')}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-cancel-edit-expense-type">
                  <RotateCcw className="w-5 h-5" />
                  {t('Cancel')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <IconExpenseType className="h-5 w-5 text-purple-600" />
              {t('Expense Types')}
              <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
            </CardTitle>
            <SearchInput
              placeholder={t('Search expense types...')}
              containerClassName="w-64"
              className="h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              data-testid="input-search-expense-types"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconExpenseType className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No expense types found')}</h3>
              <p>{t('Add a new expense type to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>{t('Expense Type Name')}</TableHead>
                    <TableHead className="text-center w-32">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: ExpenseType, index: number) => (
                    <TableRow key={item.id} data-testid={`row-expense-type-${item.id}`}>
                      <TableCell className="font-mono text-sm font-bold">{index + 1}</TableCell>
                      <TableCell className="text-sm font-bold">
                        <Badge variant="outline" className="gap-1 text-sm">
                          <IconExpenseType className="h-3.5 w-3.5" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => startEdit(item)}
                            data-testid={`button-edit-expense-type-${item.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteItem(item)}
                            data-testid={`button-delete-expense-type-${item.id}`}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
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

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Expense Type')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete this expense type?')} ({deleteItem?.name})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" data-testid="button-confirm-delete-expense-type">
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
